#!/usr/bin/env python3
"""
Registro de comidas sobre CSV (datos/). Solo usa la librería estándar.

Nada se escribe en los CSV sin pasar antes la validación completa: si una
comida o un alimento nuevo deja algún error, no se guarda nada.

Uso:
  python scripts/salud.py ahora                       fecha y hora local con zona
  python scripts/salud.py buscar <texto>              busca en el catálogo
  python scripts/salud.py alimento <id> [--version N] ficha completa
  python scripts/salud.py alta <alimento.json> [--nueva-version]
  python scripts/salud.py registrar <comida.json> [--forzar]
  python scripts/salud.py anular <comida_id> <motivo>
  python scripts/salud.py cerrar <fecha> <completo|parcial|incompleto> [nota]
  python scripts/salud.py dia [fecha]                 informe de un día (hoy por defecto)
  python scripts/salud.py resumen [desde] [hasta]     totales por día
  python scripts/salud.py validar                     revisa todos los CSV

El formato de los JSON de entrada está en docs/modelo-de-datos.md.
"""
import argparse
import csv
import json
import math
import re
import sys
import unicodedata
from datetime import date, datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DATOS = REPO / "datos"

TABLAS = {
    "alimentos": ["id", "version", "vigente_desde", "tipo", "nombre", "marca", "formato", "supermercado",
                  "ean", "base_por", "base_estado", "comestible_pct", "peso_unidad_g", "densidad_g_ml",
                  "peso_cocinado_g", "raciones", "gluten", "gluten_fuente", "ingredientes", "alergenos",
                  "trazas", "notas"],
    "fuentes": ["alimento_id", "version", "fuente", "tipo", "especifica", "ref", "url", "foto", "texto", "fecha"],
    "nutrientes": ["alimento_id", "version", "nutriente", "valor", "cualificador", "fuente"],
    "composicion": ["alimento_id", "version", "linea", "ingrediente_id", "ingrediente_version", "cantidad",
                    "unidad", "bruto", "nota"],
    "comidas": ["comida_id", "fecha", "momento", "descripcion", "texto_original", "consumido_valor",
                "consumido_unidad", "estado", "motivo_anulacion", "origen", "notas"],
    "comida_items": ["comida_id", "linea", "alimento_id", "alimento_version", "cantidad", "unidad", "bruto",
                     "estado", "origen_cantidad", "incertidumbre_pct", "preparacion", "nombre_registrado", "notas"],
    "item_valores": ["comida_id", "linea", "nutriente", "valor", "fuente"],
    "dias": ["fecha", "estado", "notas"],
}

TIPOS_ALIMENTO = {"envasado", "fresco", "bebida", "suplemento", "lote", "receta"}
BASES = {"100 g", "100 ml", "1 unidad"}
ESTADOS = {"tal_cual", "escurrido", "cocido", "preparado"}
TIPOS_FUENTE = {"etiqueta", "web", "bedca", "usda", "openfoodfacts", "estimado", "calculado"}
GLUTEN = {"si", "no", "trazas", "desconocido"}
CUALIFICADORES = {"", "<", "trazas"}
UNIDADES = {"g", "ml", "ud"}
ORIGEN_CANTIDAD = {"bascula", "envase", "estimado"}
ESTADO_COMIDA = {"registrada", "anulada"}
ESTADO_DIA = {"completo", "parcial", "incompleto"}
SI_NO = {"si", "no"}
ORIGEN_HISTORICO = "exportacion-2026-10-25"
INCERTIDUMBRE_POR_DEFECTO = 25.0

RE_ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
RE_FECHA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RE_MOMENTO = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2}$")


# ---------------------------------------------------------------- utilidades

def num(s):
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return float(s)
    s = str(s).strip().replace(",", ".")
    return None if s == "" else float(s)


def fmt(v):
    """Número para CSV: sin ceros sobrantes."""
    if v is None or v == "":
        return ""
    v = float(v)
    if v.is_integer():
        return str(int(v))
    return f"{v:.6f}".rstrip("0").rstrip(".")


def f1(v, dec=1):
    return "—" if v is None else f"{v:.{dec}f}"


def normalizar(t):
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode()
    return t.lower()


def es_si(v):
    return str(v).strip().lower() == "si"


class Error(Exception):
    pass


# ---------------------------------------------------------------- datos

class Base:
    def __init__(self, carpeta=DATOS):
        self.carpeta = Path(carpeta)
        self.t = {nombre: self._leer(nombre) for nombre in TABLAS}
        self.dic = {}
        with open(self.carpeta / "nutrientes_def.csv", newline="", encoding="utf-8") as fh:
            for fila in csv.DictReader(fh):
                self.dic[fila["clave"]] = fila
        self._indexar()

    def _leer(self, nombre):
        ruta = self.carpeta / f"{nombre}.csv"
        if not ruta.exists():
            return []
        with open(ruta, newline="", encoding="utf-8") as fh:
            lector = csv.DictReader(fh)
            if lector.fieldnames != TABLAS[nombre]:
                raise Error(f"{ruta.name}: columnas inesperadas {lector.fieldnames}")
            return [dict(f) for f in lector]

    def guardar(self):
        for nombre, columnas in TABLAS.items():
            ruta = self.carpeta / f"{nombre}.csv"
            with open(ruta, "w", newline="", encoding="utf-8") as fh:
                w = csv.DictWriter(fh, fieldnames=columnas, lineterminator="\n")
                w.writeheader()
                for fila in self.t[nombre]:
                    w.writerow({c: fila.get(c, "") for c in columnas})

    def _indexar(self):
        self.alim = {}
        for a in self.t["alimentos"]:
            self.alim[(a["id"], int(a["version"]))] = a
        self.fuentes = {}
        for f in self.t["fuentes"]:
            self.fuentes.setdefault((f["alimento_id"], int(f["version"])), {})[f["fuente"]] = f
        self.nutr = {}
        for n in self.t["nutrientes"]:
            self.nutr.setdefault((n["alimento_id"], int(n["version"])), {})[n["nutriente"]] = n
        self.comp = {}
        for c in self.t["composicion"]:
            self.comp.setdefault((c["alimento_id"], int(c["version"])), []).append(c)
        self.items = {}
        for it in self.t["comida_items"]:
            self.items.setdefault(it["comida_id"], []).append(it)
        self.valores = {}
        for v in self.t["item_valores"]:
            self.valores.setdefault((v["comida_id"], v["linea"]), {})[v["nutriente"]] = v
        self.comidas = {c["comida_id"]: c for c in self.t["comidas"]}
        self.dias = {d["fecha"]: d for d in self.t["dias"]}

    def versiones(self, aid):
        return sorted(v for (i, v) in self.alim if i == aid)

    def ultima(self, aid):
        vs = self.versiones(aid)
        return vs[-1] if vs else None

    # --- cálculo

    def factor(self, alimento, cantidad, unidad, bruto):
        """Multiplicador sobre los valores de la base y gramos comestibles (si se conocen)."""
        base = alimento["base_por"]
        comest = num(alimento["comestible_pct"]) or 100.0
        peso_u = num(alimento["peso_unidad_g"])
        dens = num(alimento["densidad_g_ml"])
        cantidad = float(cantidad)
        gramos = None
        if unidad == "ud":
            if base == "1 unidad":
                return cantidad, (cantidad * peso_u if peso_u else None)
            if not peso_u:
                raise Error(f"{alimento['id']}: se pide en unidades pero no tiene peso_unidad_g")
            gramos = cantidad * peso_u * comest / 100
        elif unidad == "g":
            gramos = cantidad * comest / 100 if es_si(bruto) else cantidad
        elif unidad == "ml":
            if base == "100 ml":
                return cantidad / 100, (cantidad * dens if dens else None)
            if not dens:
                raise Error(f"{alimento['id']}: se pide en ml pero no tiene densidad_g_ml")
            gramos = cantidad * dens
        else:
            raise Error(f"unidad desconocida: {unidad}")
        if base == "100 g":
            return gramos / 100, gramos
        if base == "100 ml":
            if not dens:
                raise Error(f"{alimento['id']}: base en ml sin densidad_g_ml para convertir gramos")
            return gramos / dens / 100, gramos
        if base == "1 unidad":
            if not peso_u:
                raise Error(f"{alimento['id']}: base por unidad sin peso_unidad_g para convertir gramos")
            return gramos / peso_u, gramos
        raise Error(f"{alimento['id']}: base_por no válida: {base!r}")

    def valores_item(self, it):
        """{nutriente: (valor, cualificador)} por la cantidad del item, más gramos y origen de cada valor."""
        clave = (it["alimento_id"], int(it["alimento_version"]))
        a = self.alim[clave]
        fac, gramos = self.factor(a, it["cantidad"], it["unidad"], it["bruto"])
        por_base = {k: (num(n["valor"]), n["cualificador"], n["fuente"]) for k, n in self.nutr.get(clave, {}).items()}
        for k, v in self.valores.get((it["comida_id"], it["linea"]), {}).items():
            por_base[k] = (num(v["valor"]), "", v["fuente"] or "registrado")
        out = {}
        for k, (v, q, fuente) in por_base.items():
            out[k] = ((v or 0.0) * fac, q, fuente)
        if "sodio" not in out and "sal" in out:
            v, q, _ = out["sal"]
            out["sodio"] = (v * 400, q, "calculado de la sal")
        return out, gramos

    def totales_comida(self, comida):
        items = self.items.get(comida["comida_id"], [])
        filas, suma_g, g_conocidos = [], 0.0, True
        for it in items:
            vals, g = self.valores_item(it)
            filas.append((it, vals, g))
            if g is None:
                g_conocidos = False
            else:
                suma_g += g
        f = 1.0
        cv, cu = num(comida["consumido_valor"]), comida["consumido_unidad"]
        if cv is not None:
            if cu == "fraccion":
                f = cv
            elif cu == "g":
                if not g_conocidos or suma_g == 0:
                    raise Error(f"{comida['comida_id']}: consumido en g pero no se conocen los gramos de todos los items")
                f = cv / suma_g
        tot, cob, menor = {}, {}, set()
        for _, vals, _ in filas:
            for k, (v, q, _) in vals.items():
                tot[k] = tot.get(k, 0.0) + v * f
                cob[k] = cob.get(k, 0) + 1
                if q in ("<", "trazas"):
                    menor.add(k)
        err = math.sqrt(sum(
            ((vals.get("kcal", (0,))[0] or 0) * f * (num(it["incertidumbre_pct"]) or INCERTIDUMBRE_POR_DEFECTO) / 100) ** 2
            for it, vals, _ in filas))
        return filas, tot, cob, len(filas), err, f, menor

    def comidas_de(self, fecha, incluir_anuladas=False):
        cs = [c for c in self.t["comidas"] if c["fecha"] == fecha
              and (incluir_anuladas or c["estado"] != "anulada")]
        return sorted(cs, key=lambda c: (c["momento"] or "", int(c["comida_id"].rsplit("-", 1)[1])))


# ---------------------------------------------------------------- validación

def validar(db):
    errores, avisos = [], []
    E = errores.append

    def unicos(tabla, claves):
        vistos = set()
        for fila in db.t[tabla]:
            k = tuple(fila[c] for c in claves)
            if k in vistos:
                E(f"{tabla}: clave repetida {k}")
            vistos.add(k)

    def numero(tabla, fila, campo, ctx, obligatorio=False, minimo=None, maximo=None):
        v = fila.get(campo, "")
        if v == "":
            if obligatorio:
                E(f"{tabla} {ctx}: falta {campo}")
            return None
        try:
            x = float(v)
        except ValueError:
            E(f"{tabla} {ctx}: {campo} no es un número ({v!r})")
            return None
        if minimo is not None and x < minimo or maximo is not None and x > maximo:
            E(f"{tabla} {ctx}: {campo}={v} fuera de rango")
        return x

    unicos("alimentos", ["id", "version"])
    unicos("fuentes", ["alimento_id", "version", "fuente"])
    unicos("nutrientes", ["alimento_id", "version", "nutriente"])
    unicos("composicion", ["alimento_id", "version", "linea"])
    unicos("comidas", ["comida_id"])
    unicos("comida_items", ["comida_id", "linea"])
    unicos("item_valores", ["comida_id", "linea", "nutriente"])
    unicos("dias", ["fecha"])

    # alimentos
    for a in db.t["alimentos"]:
        ctx = f"{a['id']} v{a['version']}"
        if not RE_ID.match(a["id"]):
            E(f"alimentos {ctx}: id no válido (minúsculas, números y guiones)")
        if numero("alimentos", a, "version", ctx, True, 1) is None:
            continue
        if a["tipo"] not in TIPOS_ALIMENTO:
            E(f"alimentos {ctx}: tipo {a['tipo']!r} no válido")
        if not a["nombre"]:
            E(f"alimentos {ctx}: falta nombre")
        if a["vigente_desde"] and not RE_FECHA.match(a["vigente_desde"]):
            E(f"alimentos {ctx}: vigente_desde no es AAAA-MM-DD")
        if a["tipo"] != "receta":
            if a["base_por"] not in BASES:
                E(f"alimentos {ctx}: base_por {a['base_por']!r} no válida")
            if a["base_estado"] not in ESTADOS:
                E(f"alimentos {ctx}: base_estado {a['base_estado']!r} no válido")
        numero("alimentos", a, "comestible_pct", ctx, False, 0.1, 100)
        for campo in ("peso_unidad_g", "densidad_g_ml", "peso_cocinado_g", "raciones"):
            numero("alimentos", a, campo, ctx, False, 0)
        if a["gluten"] not in GLUTEN:
            E(f"alimentos {ctx}: gluten {a['gluten']!r} no válido")
        clave = (a["id"], int(a["version"]))
        fs = db.fuentes.get(clave, {})
        if a["gluten"] != "desconocido" and a["gluten_fuente"] not in fs:
            E(f"alimentos {ctx}: gluten_fuente {a['gluten_fuente']!r} no está entre sus fuentes")
        if a["tipo"] == "receta":
            if not db.comp.get(clave):
                E(f"alimentos {ctx}: una receta necesita composición")
            if db.nutr.get(clave):
                E(f"alimentos {ctx}: una receta no lleva nutrientes; se expande en sus ingredientes al registrar")
        else:
            if not fs:
                E(f"alimentos {ctx}: no tiene ninguna fuente")
            ns = db.nutr.get(clave, {})
            if "kcal" not in ns:
                E(f"alimentos {ctx}: falta kcal")
            v = {k: num(n["valor"]) for k, n in ns.items()}
            if all(v.get(k) is not None for k in ("kcal", "prot", "hc", "grasa")) and v["kcal"] > 20:
                estim = (4 * v["prot"] + 4 * v["hc"] + 9 * v["grasa"] + 2 * (v.get("fibra") or 0)
                         + 7 * (v.get("alcohol") or 0) + 2.4 * (v.get("polialcoholes") or 0))
                if abs(estim - v["kcal"]) / v["kcal"] > 0.15:
                    avisos.append(f"{ctx}: kcal {fmt(v['kcal'])} frente a {estim:.0f} por macros (>15 %)")

    # fuentes
    for f in db.t["fuentes"]:
        ctx = f"{f['alimento_id']} v{f['version']} «{f['fuente']}»"
        if (f["alimento_id"], int(f["version"] or 0)) not in db.alim:
            E(f"fuentes {ctx}: el alimento no existe")
        if f["tipo"] not in TIPOS_FUENTE:
            E(f"fuentes {ctx}: tipo {f['tipo']!r} no válido")
        if f["especifica"] not in SI_NO:
            E(f"fuentes {ctx}: especifica debe ser si/no")
        if f["foto"] and not (REPO / f["foto"]).exists():
            E(f"fuentes {ctx}: no existe la foto {f['foto']}")
        if f["fecha"] and not RE_FECHA.match(f["fecha"]):
            E(f"fuentes {ctx}: fecha no es AAAA-MM-DD")

    # nutrientes
    for n in db.t["nutrientes"]:
        ctx = f"{n['alimento_id']} v{n['version']} {n['nutriente']}"
        clave = (n["alimento_id"], int(n["version"] or 0))
        if clave not in db.alim:
            E(f"nutrientes {ctx}: el alimento no existe")
        if n["nutriente"] not in db.dic:
            E(f"nutrientes {ctx}: nutriente desconocido (ver datos/nutrientes_def.csv)")
        if n["cualificador"] not in CUALIFICADORES:
            E(f"nutrientes {ctx}: cualificador {n['cualificador']!r} no válido")
        numero("nutrientes", n, "valor", ctx, n["cualificador"] != "trazas", 0)
        if n["fuente"] not in db.fuentes.get(clave, {}):
            E(f"nutrientes {ctx}: la fuente {n['fuente']!r} no está definida para el alimento")

    # composición
    for c in db.t["composicion"]:
        ctx = f"{c['alimento_id']} v{c['version']} línea {c['linea']}"
        if (c["alimento_id"], int(c["version"] or 0)) not in db.alim:
            E(f"composicion {ctx}: el alimento no existe")
        ing = (c["ingrediente_id"], int(c["ingrediente_version"] or 0))
        if ing not in db.alim:
            E(f"composicion {ctx}: el ingrediente {ing} no existe")
        numero("composicion", c, "cantidad", ctx, True, 0)
        if c["unidad"] not in UNIDADES:
            E(f"composicion {ctx}: unidad {c['unidad']!r} no válida")

    # comidas
    for c in db.t["comidas"]:
        ctx = c["comida_id"]
        historico = c["origen"] == ORIGEN_HISTORICO
        if not RE_FECHA.match(c["fecha"]):
            E(f"comidas {ctx}: fecha no es AAAA-MM-DD")
        elif not c["comida_id"].startswith(c["fecha"] + "-"):
            E(f"comidas {ctx}: el id debe empezar por la fecha")
        if c["momento"]:
            if not RE_MOMENTO.match(c["momento"]):
                E(f"comidas {ctx}: momento debe ser AAAA-MM-DDTHH:MM±HH:MM")
            elif c["momento"][:10] != c["fecha"]:
                E(f"comidas {ctx}: el momento no cae en la fecha de la comida")
        elif not historico:
            E(f"comidas {ctx}: falta momento")
        if not c["descripcion"]:
            E(f"comidas {ctx}: falta descripcion")
        if not historico and not c["texto_original"]:
            E(f"comidas {ctx}: falta texto_original")
        if c["estado"] not in ESTADO_COMIDA:
            E(f"comidas {ctx}: estado {c['estado']!r} no válido")
        if c["estado"] == "anulada" and not c["motivo_anulacion"]:
            E(f"comidas {ctx}: anulada sin motivo")
        if (c["consumido_valor"] == "") != (c["consumido_unidad"] == ""):
            E(f"comidas {ctx}: consumido_valor y consumido_unidad van juntos")
        if c["consumido_unidad"] and c["consumido_unidad"] not in ("g", "fraccion"):
            E(f"comidas {ctx}: consumido_unidad debe ser g o fraccion")
        numero("comidas", c, "consumido_valor", ctx, False, 0)
        if not db.items.get(ctx):
            E(f"comidas {ctx}: no tiene items")

    # items
    for it in db.t["comida_items"]:
        ctx = f"{it['comida_id']} línea {it['linea']}"
        c = db.comidas.get(it["comida_id"])
        if not c:
            E(f"comida_items {ctx}: la comida no existe")
            continue
        historico = c["origen"] == ORIGEN_HISTORICO
        clave = (it["alimento_id"], int(it["alimento_version"] or 0))
        a = db.alim.get(clave)
        if not a:
            E(f"comida_items {ctx}: el alimento {clave} no existe")
            continue
        if a["tipo"] == "receta":
            E(f"comida_items {ctx}: {a['id']} es una receta; registra sus ingredientes")
            continue
        numero("comida_items", it, "cantidad", ctx, True, 0)
        if it["unidad"] not in UNIDADES:
            E(f"comida_items {ctx}: unidad {it['unidad']!r} no válida")
        if it["bruto"] not in ("", "si", "no"):
            E(f"comida_items {ctx}: bruto debe ser si/no")
        if it["bruto"] == "si" and it["unidad"] != "g":
            E(f"comida_items {ctx}: bruto solo aplica a gramos (en unidades ya se usa el peso bruto)")
        if it["estado"] not in ESTADOS:
            E(f"comida_items {ctx}: estado {it['estado']!r} no válido")
        elif it["estado"] != a["base_estado"] and (it["comida_id"], it["linea"]) not in db.valores:
            E(f"comida_items {ctx}: estado {it['estado']} y los valores de {a['id']} son de {a['base_estado']}; "
              f"convierte la cantidad o usa otro alimento")
        if it["origen_cantidad"] and it["origen_cantidad"] not in ORIGEN_CANTIDAD:
            E(f"comida_items {ctx}: origen_cantidad {it['origen_cantidad']!r} no válido")
        if not historico:
            if not it["origen_cantidad"]:
                E(f"comida_items {ctx}: falta origen_cantidad")
            if it["incertidumbre_pct"] == "":
                E(f"comida_items {ctx}: falta incertidumbre_pct")
        numero("comida_items", it, "incertidumbre_pct", ctx, False, 0, 100)
        try:
            db.factor(a, it["cantidad"], it["unidad"], it["bruto"])
        except (Error, ValueError) as e:
            E(f"comida_items {ctx}: {e}")

    for v in db.t["item_valores"]:
        ctx = f"{v['comida_id']} línea {v['linea']} {v['nutriente']}"
        if not any(i["linea"] == v["linea"] for i in db.items.get(v["comida_id"], [])):
            E(f"item_valores {ctx}: el item no existe")
        if v["nutriente"] not in db.dic:
            E(f"item_valores {ctx}: nutriente desconocido")
        numero("item_valores", v, "valor", ctx, True, 0)

    for d in db.t["dias"]:
        if not RE_FECHA.match(d["fecha"]):
            E(f"dias {d['fecha']}: fecha no es AAAA-MM-DD")
        if d["estado"] not in ESTADO_DIA:
            E(f"dias {d['fecha']}: estado {d['estado']!r} no válido")

    if not errores:
        for c in db.t["comidas"]:
            try:
                db.totales_comida(c)
            except Error as e:
                E(str(e))
    return errores, avisos


def guardar_si_valido(db, antes):
    db._indexar()
    errores, _ = validar(db)
    nuevos = [e for e in errores if e not in antes]
    if nuevos:
        raise Error("No se ha guardado nada. Errores:\n- " + "\n- ".join(nuevos))
    db.guardar()


# ---------------------------------------------------------------- informes

COLS = [("kcal", "Kcal", 1), ("prot", "Prot", 1), ("hc", "HC", 1), ("azucar", "Azúc", 1), ("fibra", "Fibra", 1),
        ("grasa", "Grasa", 1), ("sat", "Sat", 1), ("sal", "Sal", 2), ("lactosa", "Lact", 1)]


def informe_comida(db, c):
    filas, tot, cob, n, err, f, menor = db.totales_comida(c)
    hora = c["momento"][11:16] if c["momento"] else ""
    titulo = f"#### {c['comida_id']} · {c['descripcion']}" + (f" ({hora})" if hora else "")
    if c["estado"] == "anulada":
        titulo += f" — ANULADA: {c['motivo_anulacion']}"
    out = [titulo, ""]
    if f != 1.0:
        out += [f"Consumido: {fmt(c['consumido_valor'])} {c['consumido_unidad']} ({f * 100:.1f} % del plato). "
                f"Las filas son del plato completo; el total, de lo consumido.", ""]
    out.append("| Alimento | g | " + " | ".join(t for _, t, _ in COLS) + " | Fuente |")
    out.append("|---|---|" + "---|" * len(COLS) + "---|")
    for it, vals, g in filas:
        a = db.alim[(it["alimento_id"], int(it["alimento_version"]))]
        nombre = it["nombre_registrado"] or a["nombre"]
        fuentes = sorted({vals[k][2] for k in ("kcal", "prot", "hc", "grasa") if k in vals})
        celdas = [f1(vals[k][0], d) if k in vals else "—" for k, _, d in COLS]
        out.append(f"| {nombre} | {f1(g)} | " + " | ".join(celdas) + f" | {', '.join(fuentes)} |")
    celdas = [f"**{f1(tot[k], d)}**" if k in tot else "—" for k, _, d in COLS]
    out.append("| **Total** | | " + " | ".join(celdas) + " | |")
    return "\n".join(out), tot, cob, n, err


def informe_dia(db, fecha):
    comidas = db.comidas_de(fecha, incluir_anuladas=True)
    if not comidas:
        return f"No hay comidas registradas el {fecha}."
    d = db.dias.get(fecha)
    out = [f"### {fecha}" + (f" · día {d['estado']}" + (f" ({d['notas']})" if d["notas"] else "") if d else " · día sin cerrar"), ""]
    tot, cob, n_items, errs = {}, {}, 0, []
    gluten = []
    for c in comidas:
        texto, t, cb, n, err = informe_comida(db, c)
        out += [texto, ""]
        if c["estado"] == "anulada":
            continue
        n_items += n
        errs.append(err)
        for k, v in t.items():
            tot[k] = tot.get(k, 0.0) + v
            cob[k] = cob.get(k, 0) + cb[k]
        for it in db.items[c["comida_id"]]:
            a = db.alim[(it["alimento_id"], int(it["alimento_version"]))]
            if a["gluten"] != "no":
                gluten.append((f"{it['nombre_registrado'] or a['nombre']} ({a['gluten']})", a["gluten"]))
    out += [f"#### Total del día · {n_items} alimentos", "", "| Nutriente | Total | Cobertura |", "|---|---|---|"]
    for clave, d_ in db.dic.items():
        if clave not in tot:
            continue
        marca = "completo" if cob[clave] == n_items else f"parcial ({cob[clave]}/{n_items})"
        val = f"{tot[clave]:.2f}" if clave == "sal" else f"{tot[clave]:.1f}"
        extra = f" ± {math.sqrt(sum(e * e for e in errs)):.0f}" if clave == "kcal" else ""
        out.append(f"| {d_['nombre']} | {val} {d_['unidad']}{extra} | {marca} |")
    faltan = [d_["nombre"] for k, d_ in db.dic.items() if d_["imprescindible"] == "si" and k not in tot]
    if faltan:
        out += ["", "Imprescindibles sin ningún dato: " + ", ".join(faltan) + "."]
    con = [g for g, e in gluten if e in ("si", "trazas")]
    sin_dato = sum(1 for _, e in gluten if e == "desconocido")
    out += ["", "Gluten: " + ("; ".join(con) if con else "ningún alimento con gluten o trazas declarado")
            + (f". Sin dato en {sin_dato} de {n_items} alimentos." if sin_dato else ".")]
    return "\n".join(out)


def informe_alimento(db, aid, version=None):
    version = version or db.ultima(aid)
    clave = (aid, version)
    if clave not in db.alim:
        raise Error(f"No existe {aid} v{version}")
    a = db.alim[clave]
    out = [f"### {a['nombre']} · {aid} v{version}" + (f" (hay versiones: {db.versiones(aid)})" if len(db.versiones(aid)) > 1 else ""), ""]
    for campo in ("tipo", "marca", "formato", "supermercado", "ean", "base_por", "base_estado", "comestible_pct",
                  "peso_unidad_g", "densidad_g_ml", "peso_cocinado_g", "raciones", "gluten", "ingredientes",
                  "alergenos", "trazas", "vigente_desde", "notas"):
        if a[campo]:
            out.append(f"- **{campo}**: {a[campo]}" + (f" (fuente: {a['gluten_fuente']})" if campo == "gluten" and a["gluten_fuente"] else ""))
    fs = db.fuentes.get(clave, {})
    if fs:
        out += ["", "| Fuente | Tipo | Específica | Ref / URL / foto | Fecha |", "|---|---|---|---|---|"]
        for f in fs.values():
            ref = " · ".join(x for x in (f["ref"], f["url"], f["foto"]) if x)
            out.append(f"| {f['fuente']} | {f['tipo']} | {f['especifica']} | {ref} | {f['fecha']} |")
    ns = db.nutr.get(clave, {})
    if ns:
        out += ["", f"| Nutriente (por {a['base_por']}, {a['base_estado']}) | Valor | Fuente |", "|---|---|---|"]
        for k, d in db.dic.items():
            if k in ns:
                n = ns[k]
                out.append(f"| {d['nombre']} | {n['cualificador']}{n['valor']} {d['unidad']} | {n['fuente']} |")
    comp = db.comp.get(clave, [])
    if comp:
        out += ["", "Composición:"] + [f"- {c['cantidad']} {c['unidad']} {c['ingrediente_id']} v{c['ingrediente_version']}"
                                        + (f" ({c['nota']})" if c["nota"] else "") for c in comp]
    if a["tipo"] != "receta":
        faltan = [d["nombre"] for k, d in db.dic.items() if d["imprescindible"] == "si" and k not in ns and k != "sodio"]
        if "sodio" not in ns and "sal" not in ns:
            faltan.append("Sodio")
        if faltan:
            out += ["", "Imprescindibles sin dato: " + ", ".join(faltan) + "."]
    return "\n".join(out)


# ---------------------------------------------------------------- comandos

def leer_json(ruta):
    with open(ruta, encoding="utf-8") as fh:
        return json.load(fh)


def lista(v):
    if v is None:
        return ""
    if isinstance(v, list):
        return "; ".join(str(x) for x in v)
    return str(v)


def cmd_alta(db, datos, nueva_version=False):
    antes, _ = validar(db)
    aid = datos.get("id", "")
    existe = db.ultima(aid)
    if existe and not nueva_version:
        raise Error(f"{aid} ya existe (v{existe}). Si cambió la receta o la etiqueta usa --nueva-version; "
                    f"si es una corrección, edita la versión actual.")
    if nueva_version and not existe:
        raise Error(f"{aid} no existe; quita --nueva-version")
    version = (existe or 0) + 1
    tipo = datos.get("tipo", "")
    fila = {c: "" for c in TABLAS["alimentos"]}
    fila.update({k: lista(datos.get(k)) for k in ("nombre", "marca", "formato", "supermercado", "ean",
                                                   "ingredientes", "alergenos", "trazas", "notas")})
    fila.update({
        "id": aid, "version": str(version), "tipo": tipo,
        "vigente_desde": datos.get("vigente_desde") or date.today().isoformat(),
        "base_por": datos.get("base_por", "") if tipo != "receta" else "",
        "base_estado": datos.get("base_estado", "") if tipo != "receta" else "",
        "comestible_pct": fmt(datos.get("comestible_pct")),
        "peso_unidad_g": fmt(datos.get("peso_unidad_g")),
        "densidad_g_ml": fmt(datos.get("densidad_g_ml")),
        "peso_cocinado_g": fmt(datos.get("peso_cocinado_g")),
        "raciones": fmt(datos.get("raciones")),
        "gluten": datos.get("gluten") or "desconocido",
        "gluten_fuente": datos.get("gluten_fuente", ""),
    })
    db.t["alimentos"].append(fila)
    fuentes = datos.get("fuentes", [])
    for f in fuentes:
        db.t["fuentes"].append({
            "alimento_id": aid, "version": str(version), "fuente": f.get("nombre", f.get("tipo", "")),
            "tipo": f.get("tipo", ""), "especifica": "si" if f.get("especifica") else "no",
            "ref": f.get("ref") or "", "url": f.get("url") or "", "foto": f.get("foto") or "",
            "texto": f.get("texto") or "", "fecha": f.get("fecha") or date.today().isoformat()})
    for i, c in enumerate(datos.get("composicion", []), 1):
        iv = c.get("version") or db.ultima(c.get("alimento", ""))
        db.t["composicion"].append({
            "alimento_id": aid, "version": str(version), "linea": str(i), "ingrediente_id": c.get("alimento", ""),
            "ingrediente_version": str(iv or ""), "cantidad": fmt(c.get("cantidad")), "unidad": c.get("unidad", "g"),
            "bruto": "si" if c.get("bruto") else "", "nota": c.get("nota", "")})
    nutrientes = datos.get("nutrientes", {})
    if tipo == "lote" and not nutrientes:
        nutrientes = calcular_lote(db, datos)
        db.t["fuentes"].append({"alimento_id": aid, "version": str(version), "fuente": "calculado",
                                "tipo": "calculado", "especifica": "si", "ref": "composición y peso cocinado del lote",
                                "url": "", "foto": "", "texto": "", "fecha": date.today().isoformat()})
    defecto = fuentes[0].get("nombre", fuentes[0].get("tipo")) if fuentes else "calculado"
    for k, v in nutrientes.items():
        if not isinstance(v, dict):
            v = {"valor": v}
        db.t["nutrientes"].append({
            "alimento_id": aid, "version": str(version), "nutriente": k, "valor": fmt(v.get("valor")),
            "cualificador": v.get("cualificador", ""), "fuente": v.get("fuente", defecto)})
    guardar_si_valido(db, antes)
    return aid, version


def calcular_lote(db, datos):
    peso = num(datos.get("peso_cocinado_g"))
    if not peso:
        raise Error("Un lote necesita peso_cocinado_g (o la merma supuesta convertida a peso, indicándolo en notas)")
    suma, presentes, n = {}, {}, 0
    for c in datos.get("composicion", []):
        aid = c.get("alimento", "")
        v = c.get("version") or db.ultima(aid)
        a = db.alim.get((aid, v))
        if not a:
            raise Error(f"composición: no existe el ingrediente {aid}")
        fac, _ = db.factor(a, c["cantidad"], c.get("unidad", "g"), "si" if c.get("bruto") else "")
        n += 1
        for k, nut in db.nutr.get((aid, v), {}).items():
            if nut["valor"] != "":
                suma[k] = suma.get(k, 0.0) + float(nut["valor"]) * fac
                presentes[k] = presentes.get(k, 0) + 1
    completos = {k: round(s / peso * 100, 3) for k, s in suma.items() if presentes[k] == n}
    omitidos = sorted(k for k in suma if presentes[k] != n)
    if omitidos:
        print(f"Aviso: no se calculan {', '.join(omitidos)} porque no todos los ingredientes tienen el dato.")
    return completos


def cmd_registrar(db, datos, forzar=False):
    antes, _ = validar(db)
    fecha = datos.get("fecha") or (datos.get("momento") or "")[:10]
    previas = [c for c in db.t["comidas"] if c["fecha"] == fecha]
    nuevos_items = sorted((i.get("alimento"), fmt(i.get("cantidad"))) for i in datos.get("items", []))
    if not forzar:
        for c in previas:
            if c["estado"] != "anulada" and c["momento"] == datos.get("momento", ""):
                existentes = sorted((i["alimento_id"], i["cantidad"]) for i in db.items.get(c["comida_id"], []))
                if existentes == nuevos_items:
                    raise Error(f"Parece repetida: {c['comida_id']} tiene el mismo momento y los mismos alimentos. "
                                f"Usa --forzar si de verdad es otra comida.")
    n = max([int(c["comida_id"].rsplit("-", 1)[1]) for c in previas] or [0]) + 1
    cid = f"{fecha}-{n}"
    consumido = datos.get("consumido") or {}
    db.t["comidas"].append({
        "comida_id": cid, "fecha": fecha, "momento": datos.get("momento", ""),
        "descripcion": datos.get("descripcion", ""), "texto_original": datos.get("texto_original", ""),
        "consumido_valor": fmt(consumido.get("valor")), "consumido_unidad": consumido.get("unidad", ""),
        "estado": "registrada", "motivo_anulacion": "", "origen": datos.get("origen", "registro"),
        "notas": datos.get("notas", "")})
    for i, it in enumerate(datos.get("items", []), 1):
        aid = it.get("alimento", "")
        v = it.get("version") or db.ultima(aid)
        a = db.alim.get((aid, v)) if v else None
        db.t["comida_items"].append({
            "comida_id": cid, "linea": str(i), "alimento_id": aid, "alimento_version": str(v or ""),
            "cantidad": fmt(it.get("cantidad")), "unidad": it.get("unidad", "g"),
            "bruto": "si" if it.get("bruto") else "",
            "estado": it.get("estado") or (a["base_estado"] if a else ""),
            "origen_cantidad": it.get("origen_cantidad", ""), "incertidumbre_pct": fmt(it.get("incertidumbre_pct")),
            "preparacion": it.get("preparacion", ""), "nombre_registrado": it.get("nombre_registrado", ""),
            "notas": it.get("notas", "")})
    guardar_si_valido(db, antes)
    return cid


def cmd_anular(db, cid, motivo):
    antes, _ = validar(db)
    c = db.comidas.get(cid)
    if not c:
        raise Error(f"No existe la comida {cid}")
    c["estado"], c["motivo_anulacion"] = "anulada", motivo
    guardar_si_valido(db, antes)


def cmd_cerrar(db, fecha, estado, nota):
    antes, _ = validar(db)
    d = db.dias.get(fecha)
    if d:
        d["estado"], d["notas"] = estado, nota
    else:
        db.t["dias"].append({"fecha": fecha, "estado": estado, "notas": nota})
        db.t["dias"].sort(key=lambda x: x["fecha"])
    guardar_si_valido(db, antes)


def cmd_buscar(db, texto):
    tokens = normalizar(texto).split()
    res = []
    for (aid, v), a in db.alim.items():
        if v != db.ultima(aid):
            continue
        heno = normalizar(" ".join([aid, a["nombre"], a["marca"], a["supermercado"], a["notas"]]))
        if all(t in heno for t in tokens):
            ns = db.nutr.get((aid, v), {})
            kcal = ns.get("kcal", {}).get("valor", "")
            res.append(f"| {aid} | v{v} | {a['nombre']} | {a['tipo']} | {a['base_por']} {a['base_estado']} | "
                       f"{kcal} | {len(ns)} |")
    if not res:
        return f"Sin resultados para «{texto}». Es un alimento nuevo: hay que darlo de alta."
    return ("| id | Versión | Nombre | Tipo | Base | Kcal | Nº nutrientes |\n|---|---|---|---|---|---|---|\n"
            + "\n".join(sorted(res)))


def cmd_resumen(db, desde, hasta):
    fechas = sorted({c["fecha"] for c in db.t["comidas"] if (not desde or c["fecha"] >= desde)
                     and (not hasta or c["fecha"] <= hasta)})
    out = ["| Fecha | Comidas | Kcal | Prot | HC | Grasa | Fibra | Día |", "|---|---|---|---|---|---|---|---|"]
    for fecha in fechas:
        cs = db.comidas_de(fecha)
        tot = {}
        for c in cs:
            _, t, *_ = db.totales_comida(c)
            for k, v in t.items():
                tot[k] = tot.get(k, 0.0) + v
        d = db.dias.get(fecha, {}).get("estado", "sin cerrar")
        out.append(f"| {fecha} | {len(cs)} | " + " | ".join(f1(tot.get(k)) for k in ("kcal", "prot", "hc", "grasa", "fibra"))
                   + f" | {d} |")
    return "\n".join(out)


def main(argv=None):
    p = argparse.ArgumentParser(description="Registro de comidas sobre CSV")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("ahora")
    s = sub.add_parser("buscar"); s.add_argument("texto", nargs="+")
    s = sub.add_parser("alimento"); s.add_argument("id"); s.add_argument("--version", type=int)
    s = sub.add_parser("alta"); s.add_argument("json"); s.add_argument("--nueva-version", action="store_true")
    s = sub.add_parser("registrar"); s.add_argument("json"); s.add_argument("--forzar", action="store_true")
    s = sub.add_parser("anular"); s.add_argument("comida_id"); s.add_argument("motivo", nargs="+")
    s = sub.add_parser("cerrar"); s.add_argument("fecha"); s.add_argument("estado", choices=sorted(ESTADO_DIA)); s.add_argument("nota", nargs="*")
    s = sub.add_parser("dia"); s.add_argument("fecha", nargs="?")
    s = sub.add_parser("resumen"); s.add_argument("desde", nargs="?"); s.add_argument("hasta", nargs="?")
    sub.add_parser("validar")
    a = p.parse_args(argv)

    if a.cmd == "ahora":
        ahora = datetime.now().astimezone()
        print(f"fecha: {ahora.date().isoformat()}\nmomento: {ahora.isoformat(timespec='minutes')}")
        return 0
    try:
        db = Base()
        if a.cmd == "buscar":
            print(cmd_buscar(db, " ".join(a.texto)))
        elif a.cmd == "alimento":
            print(informe_alimento(db, a.id, a.version))
        elif a.cmd == "alta":
            aid, v = cmd_alta(db, leer_json(a.json), a.nueva_version)
            print(f"Alta guardada: {aid} v{v}\n")
            print(informe_alimento(Base(), aid, v))
        elif a.cmd == "registrar":
            cid = cmd_registrar(db, leer_json(a.json), a.forzar)
            db = Base()
            print(f"Comida guardada: {cid}\n")
            print(informe_dia(db, db.comidas[cid]["fecha"]))
        elif a.cmd == "anular":
            cmd_anular(db, a.comida_id, " ".join(a.motivo))
            print(f"Anulada: {a.comida_id}")
        elif a.cmd == "cerrar":
            cmd_cerrar(db, a.fecha, a.estado, " ".join(a.nota))
            print(f"Día {a.fecha}: {a.estado}")
        elif a.cmd == "dia":
            print(informe_dia(db, a.fecha or date.today().isoformat()))
        elif a.cmd == "resumen":
            print(cmd_resumen(db, a.desde, a.hasta))
        elif a.cmd == "validar":
            errores, avisos = validar(db)
            for x in avisos:
                print(f"aviso: {x}")
            for x in errores:
                print(f"ERROR: {x}")
            print(f"{len(errores)} errores, {len(avisos)} avisos · {len(db.t['alimentos'])} alimentos, "
                  f"{len(db.t['comidas'])} comidas, {len(db.t['comida_items'])} items")
            return 1 if errores else 0
    except (Error, FileNotFoundError, json.JSONDecodeError, KeyError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
