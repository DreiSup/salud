#!/usr/bin/env python3
"""
Calculadora nutricional de la skill calculo-nutricional.

Hace las cuentas exactas (gramos / 100 x valor por 100 g), suma por nutriente,
comprueba la coherencia de cada alimento (Atwater) y compone la banda de error
de las kcal en cuadratura.

Uso:
  python calcular.py entrada.json          # una comida o un día
  python calcular.py --lote lote.json      # densidad por 100 g de un lote cocinado

Entrada (comida):
{
  "comida": "Tortilla de siempre",
  "items": [
    {"nombre": "Huevo campero L", "gramos": 239.36, "fuente": "bedca",
     "incertidumbre_pct": 25,
     "por100": {"kcal": 141, "prot": 12.7, "hc": 0.68, "grasa": 9.7, "sat": 2.8}}
  ],
  "consumido_g": 500        # opcional: si solo se comió parte del plato
}
Variantes por ingrediente: "gramos_brutos" + "comestible_pct" en vez de "gramos".
Para un día: {"dia": "2026-09-15", "comidas": [ {comida}, {comida} ]}

Entrada (lote):
{"nombre": "Guiso", "peso_cocinado_g": 1183, "items": [ ...igual que arriba... ]}
"""
import json
import math
import sys

NUTRIENTES = [
    ("kcal", "Energía", "kcal"),
    ("prot", "Proteínas", "g"),
    ("hc", "Hidratos de carbono (disponibles)", "g"),
    ("azucar", "  de los cuales azúcares", "g"),
    ("azucar_anadido", "    de los cuales añadidos", "g"),
    ("fibra", "Fibra alimentaria", "g"),
    ("grasa", "Grasas", "g"),
    ("sat", "  de las cuales saturadas", "g"),
    ("mono", "  de las cuales monoinsaturadas", "g"),
    ("poli", "  de las cuales poliinsaturadas", "g"),
    ("trans", "  de las cuales trans", "g"),
    ("sal", "Sal", "g"),
]
CLAVES = [n[0] for n in NUTRIENTES]


def gramos_comestibles(it):
    if "gramos" in it:
        return float(it["gramos"])
    bruto = float(it["gramos_brutos"])
    pct = float(it.get("comestible_pct", 100))
    return bruto * pct / 100


def f(x, dec=1):
    return "—" if x is None else f"{x:.{dec}f}"


def calcular_items(items):
    filas = []
    for it in items:
        g = gramos_comestibles(it)
        p = it.get("por100", {})
        valores = {k: (None if p.get(k) is None else g / 100 * float(p[k])) for k in CLAVES}
        avisos = []
        # Coherencia Atwater: 4 P + 4 HC + 9 G + 2 fibra frente a kcal declaradas
        if all(p.get(k) is not None for k in ("kcal", "prot", "hc", "grasa")):
            estim = 4 * p["prot"] + 4 * p["hc"] + 9 * p["grasa"] + 2 * (p.get("fibra") or 0)
            if p["kcal"] > 20 and abs(estim - p["kcal"]) / p["kcal"] > 0.15:
                avisos.append(
                    f"{it['nombre']}: kcal declaradas {p['kcal']} vs {estim:.0f} por macros "
                    f"(>15 %): revisar el dato"
                )
        filas.append({"nombre": it["nombre"], "g": g, "fuente": it.get("fuente", "?"),
                      "inc": float(it.get("incertidumbre_pct", 25)), "v": valores,
                      "avisos": avisos})
    return filas


def totales(filas, factor=1.0):
    tot, cobertura = {}, {}
    for k in CLAVES:
        con_dato = [fl["v"][k] for fl in filas if fl["v"][k] is not None]
        cobertura[k] = (len(con_dato), len(filas))
        tot[k] = sum(con_dato) * factor if con_dato else None
    err = math.sqrt(sum(((fl["v"]["kcal"] or 0) * fl["inc"] / 100) ** 2 for fl in filas)) * factor
    return tot, cobertura, err


def informe_comida(c, imprimir=True):
    filas = calcular_items(c["items"])
    peso_plato = sum(fl["g"] for fl in filas)
    factor = 1.0
    if c.get("consumido_g"):
        factor = float(c["consumido_g"]) / peso_plato
    tot, cob, err = totales(filas, factor)
    if not imprimir:
        return tot, err
    out = [f"### {c.get('comida', 'Comida')}", ""]
    if factor != 1.0:
        out.append(f"Plato completo {peso_plato:.0f} g; consumido {c['consumido_g']} g "
                   f"({factor*100:.1f} %). Las filas son del plato completo; el total, de la ración.")
        out.append("")
    out.append("| Ingrediente | g | Kcal | Prot | HC | Azúcar | Fibra | Grasa | Sat | Sal | Fuente |")
    out.append("|---|---|---|---|---|---|---|---|---|---|---|")
    for fl in filas:
        v = fl["v"]
        out.append(f"| {fl['nombre']} | {fl['g']:.1f} | {f(v['kcal'])} | {f(v['prot'])} | {f(v['hc'])} | "
                   f"{f(v['azucar'])} | {f(v['fibra'])} | {f(v['grasa'])} | {f(v['sat'])} | "
                   f"{f(v['sal'], 2)} | {fl['fuente']} |")
    out += ["", "| Nutriente | Total | Cobertura |", "|---|---|---|"]
    for k, nombre, ud in NUTRIENTES:
        n, total_n = cob[k]
        if n == 0:
            continue
        marca = "completo" if n == total_n else f"parcial ({n}/{total_n})"
        val = f"{tot[k]:.1f} {ud}" if k != "sal" else f"{tot[k]:.2f} {ud}"
        if k == "kcal":
            val += f" ± {err:.0f} ({err / tot[k] * 100:.1f} %)" if tot[k] else ""
        out.append(f"| {nombre} | {val} | {marca} |")
    sin = [nombre.strip() for k, nombre, _ in NUTRIENTES if cob[k][0] == 0]
    if sin:
        out += ["", "Sin dato en ninguna fuente: " + ", ".join(sin) + "."]
    avisos = [a for fl in filas for a in fl["avisos"]]
    if avisos:
        out += ["", "Avisos:"] + [f"- {a}" for a in avisos]
    print("\n".join(out) + "\n")
    return tot, err


def informe_dia(d):
    resumen = []
    for c in d["comidas"]:
        tot, err = informe_comida(c)
        resumen.append((c.get("comida", "Comida"), tot, err))
    print(f"### Total del día {d.get('dia', '')}".rstrip(), "\n")
    print("| Comida | Kcal | Prot | HC | Grasa | Fibra |")
    print("|---|---|---|---|---|---|")
    suma = {k: 0.0 for k in ("kcal", "prot", "hc", "grasa", "fibra")}
    for nombre, tot, _ in resumen:
        print(f"| {nombre} | " + " | ".join(f(tot[k]) for k in suma) + " |")
        for k in suma:
            suma[k] += tot[k] or 0
    err_dia = math.sqrt(sum(e ** 2 for *_, e in resumen))
    print("| **Total** | " + " | ".join(f"**{suma[k]:.1f}**" for k in suma) + " |")
    print(f"\nBanda de error del día: ± {err_dia:.0f} kcal")


def lote(l):
    filas = calcular_items(l["items"])
    crudo = sum(fl["g"] for fl in filas)
    cocinado = float(l.get("peso_cocinado_g", crudo))
    tot, cob, _ = totales(filas)
    por100 = {k: (None if tot[k] is None else round(tot[k] / cocinado * 100, 3)) for k in CLAVES}
    print(f"Lote «{l.get('nombre', 'lote')}»: {crudo:.1f} g crudo → {cocinado:.1f} g cocinado "
          f"(merma {(1 - cocinado / crudo) * 100:.1f} %)")
    print(f"Total lote: {tot['kcal']:.1f} kcal, {tot['prot']:.1f} P, {tot['hc']:.1f} HC, {tot['grasa']:.1f} G")
    print("Por 100 g cocinado (usar como 'por100' de la ración):")
    print(json.dumps({k: v for k, v in por100.items() if v is not None}, ensure_ascii=False))


if __name__ == "__main__":
    args = sys.argv[1:]
    modo_lote = "--lote" in args
    args = [a for a in args if a != "--lote"]
    datos = json.load(open(args[0])) if args else json.load(sys.stdin)
    if modo_lote:
        lote(datos)
    elif "comidas" in datos:
        informe_dia(datos)
    else:
        informe_comida(datos)
