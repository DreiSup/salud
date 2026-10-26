// Port de los cálculos de scripts/salud.py (Base.factor, valores_item, totales_comida e informe_dia).
// tests/paridad.test.ts compara los totales con los de salud.py en todos los días: si cambia uno, cambia el otro.
import { NUTRIENTES, type Comida, type Datos, type Dia, type EstadoDia, type Gluten, type Item, type Meta, type Nutriente, type Pendiente, type Total } from "./tipos";

export type Fila = Record<string, string>;
export interface Tablas {
  alimentos: Fila[];
  nutrientes: Fila[];
  comidas: Fila[];
  comida_items: Fila[];
  item_valores: Fila[];
  dias: Fila[];
  metas: Fila[];
}

const ORIGEN_HISTORICO = "exportacion-2026-10-25";
const INCERTIDUMBRE_POR_DEFECTO = 25;
const NOMBRE_LACTEO = /queso|leche(?! de coco)|yogur|k[eé]fir|mozzarella|ricotta|nata\b|mantequilla|skyr/i;

export function num(s: string | undefined | null): number | null {
  if (s == null) return null;
  const t = String(s).trim().replace(",", ".");
  return t === "" ? null : Number(t);
}

const clave = (id: string, version: string | number) => `${id}@${Number(version)}`;

/** Multiplicador sobre la base del alimento y gramos comestibles (si se conocen). */
export function factor(a: Fila, cantidadTxt: string, unidad: string, bruto: string): [number, number | null] {
  const base = a.base_por;
  const comest = num(a.comestible_pct) || 100;
  const pesoU = num(a.peso_unidad_g);
  const dens = num(a.densidad_g_ml);
  const cantidad = Number(cantidadTxt);
  let gramos: number;
  if (unidad === "ud") {
    if (base === "1 unidad") return [cantidad, pesoU ? cantidad * pesoU : null];
    if (!pesoU) throw new Error(`${a.id}: se pide en unidades pero no tiene peso_unidad_g`);
    gramos = (cantidad * pesoU * comest) / 100;
  } else if (unidad === "g") {
    gramos = bruto.trim().toLowerCase() === "si" ? (cantidad * comest) / 100 : cantidad;
  } else if (unidad === "ml") {
    if (base === "100 ml") return [cantidad / 100, dens ? cantidad * dens : null];
    if (!dens) throw new Error(`${a.id}: se pide en ml pero no tiene densidad_g_ml`);
    gramos = cantidad * dens;
  } else throw new Error(`unidad desconocida: ${unidad}`);
  if (base === "100 g") return [gramos / 100, gramos];
  if (base === "100 ml") {
    if (!dens) throw new Error(`${a.id}: base en ml sin densidad_g_ml para convertir gramos`);
    return [gramos / dens / 100, gramos];
  }
  if (base === "1 unidad") {
    if (!pesoU) throw new Error(`${a.id}: base por unidad sin peso_unidad_g para convertir gramos`);
    return [gramos / pesoU, gramos];
  }
  throw new Error(`${a.id}: base_por no válida: ${base}`);
}

export class Calculo {
  alim = new Map<string, Fila>();
  nutr = new Map<string, Map<string, Fila>>();
  items = new Map<string, Fila[]>();
  valores = new Map<string, Map<string, Fila>>();

  constructor(public t: Tablas) {
    for (const a of t.alimentos) this.alim.set(clave(a.id, a.version), a);
    for (const n of t.nutrientes) {
      const k = clave(n.alimento_id, n.version);
      if (!this.nutr.has(k)) this.nutr.set(k, new Map());
      this.nutr.get(k)!.set(n.nutriente, n);
    }
    for (const it of t.comida_items) {
      if (!this.items.has(it.comida_id)) this.items.set(it.comida_id, []);
      this.items.get(it.comida_id)!.push(it);
    }
    for (const v of t.item_valores) {
      const k = `${v.comida_id}#${v.linea}`;
      if (!this.valores.has(k)) this.valores.set(k, new Map());
      this.valores.get(k)!.set(v.nutriente, v);
    }
  }

  alimento(it: Fila): Fila {
    const a = this.alim.get(clave(it.alimento_id, it.alimento_version));
    if (!a) throw new Error(`${it.comida_id}: no existe ${it.alimento_id} v${it.alimento_version}`);
    return a;
  }

  /** Valores del item por su cantidad: {nutriente: valor}. */
  valoresItem(it: Fila): { vals: Map<string, number>; gramos: number | null } {
    const a = this.alimento(it);
    const [fac, gramos] = factor(a, it.cantidad, it.unidad, it.bruto);
    const porBase = new Map<string, number>();
    for (const [k, n] of this.nutr.get(clave(it.alimento_id, it.alimento_version)) ?? []) porBase.set(k, num(n.valor) ?? 0);
    for (const [k, v] of this.valores.get(`${it.comida_id}#${it.linea}`) ?? []) porBase.set(k, num(v.valor) ?? 0);
    const vals = new Map<string, number>();
    for (const [k, v] of porBase) vals.set(k, v * fac);
    if (!vals.has("sodio") && vals.has("sal")) vals.set("sodio", vals.get("sal")! * 400);
    return { vals, gramos };
  }

  /** Igual que Base.totales_comida: totales, cobertura por nutriente y banda de error de las kcal. */
  totalesComida(c: Fila) {
    const items = this.items.get(c.comida_id) ?? [];
    const filas = items.map((it) => ({ it, ...this.valoresItem(it) }));
    let f = 1;
    const cv = num(c.consumido_valor);
    if (cv != null) {
      if (c.consumido_unidad === "fraccion") f = cv;
      else if (c.consumido_unidad === "g") {
        const suma = filas.reduce((s, x) => s + (x.gramos ?? NaN), 0);
        if (!suma) throw new Error(`${c.comida_id}: consumido en g pero no se conocen los gramos de todos los items`);
        f = cv / suma;
      }
    }
    const tot = new Map<string, number>();
    const cob = new Map<string, number>();
    for (const { vals } of filas)
      for (const [k, v] of vals) {
        tot.set(k, (tot.get(k) ?? 0) + v * f);
        cob.set(k, (cob.get(k) ?? 0) + 1);
      }
    const banda = (k: string) =>
      Math.sqrt(
        filas.reduce((s, { it, vals }) => {
          const e = ((vals.get(k) ?? 0) * f * (num(it.incertidumbre_pct) || INCERTIDUMBRE_POR_DEFECTO)) / 100;
          return s + e * e;
        }, 0),
      );
    return { filas, tot, cob, n: filas.length, err: banda("kcal"), errProt: banda("prot"), f };
  }

  comidasDe(fecha: string): Fila[] {
    return this.t.comidas
      .filter((c) => c.fecha === fecha && c.estado !== "anulada")
      .sort((a, b) => (a.momento || "").localeCompare(b.momento || "") || idNum(a.comida_id) - idNum(b.comida_id));
  }

  comida(c: Fila): Comida {
    const { filas, tot, cob, n, err, errProt, f } = this.totalesComida(c);
    const nn = {} as Record<Nutriente, number | null>;
    const incompletos: Nutriente[] = [];
    for (const k of NUTRIENTES) {
      nn[k] = tot.has(k) ? tot.get(k)! : null;
      if ((cob.get(k) ?? 0) < n) incompletos.push(k);
    }
    let gluten: Gluten = "no";
    const glutenDe: string[] = [];
    const rango: Record<Gluten, number> = { no: 0, desconocido: 1, trazas: 2, si: 3 };
    let lacteoSinLactosa = false;
    const items: Item[] = filas.map(({ it, vals }) => {
      const a = this.alimento(it);
      const g = (a.gluten || "desconocido") as Gluten;
      if (rango[g] > rango[gluten]) gluten = g;
      if (g === "si" || g === "trazas") glutenDe.push(a.nombre);
      const lacteo = /\bleche\b/i.test(a.alergenos) || NOMBRE_LACTEO.test(a.nombre);
      if (lacteo && !vals.has("lactosa")) lacteoSinLactosa = true;
      return {
        nombre: a.nombre,
        cantidad: `${fmtCantidad(Number(it.cantidad))} ${it.unidad}`,
        kcal: vals.has("kcal") ? vals.get("kcal")! * f : null,
        prot: vals.has("prot") ? vals.get("prot")! * f : null,
      };
    });
    return {
      id: c.comida_id,
      hora: c.momento ? c.momento.slice(11, 16) : null,
      descripcion: c.descripcion,
      n: nn,
      incompletos,
      err: { kcal: err, prot: errProt },
      gluten,
      glutenDe,
      lacteoSinLactosa: lacteoSinLactosa && !(nn.lactosa && nn.lactosa > 0),
      notas: c.notas,
      items,
    };
  }

  dia(fecha: string, cierre?: Fila): Dia {
    const cs = this.comidasDe(fecha);
    const comidas = cs.map((c) => this.comida(c));
    const tot = {} as Record<Nutriente, Total>;
    for (const k of NUTRIENTES) {
      const con = comidas.filter((c) => c.n[k] != null);
      tot[k] = {
        v: con.length ? con.reduce((s, c) => s + c.n[k]!, 0) : null,
        faltan: comidas.filter((c) => c.incompletos.includes(k)).length,
      };
    }
    const cuad = (k: "kcal" | "prot") => Math.sqrt(comidas.reduce((s, c) => s + c.err[k] ** 2, 0));
    return {
      fecha,
      estado: (cierre?.estado as EstadoDia) || null,
      nota: cierre?.notas ?? "",
      historico: cs.length > 0 && cs.every((c) => c.origen === ORIGEN_HISTORICO),
      comidas,
      tot,
      err: { kcal: cuad("kcal"), prot: cuad("prot") },
    };
  }
}

const idNum = (id: string) => Number(id.slice(id.lastIndexOf("-") + 1));

function fmtCantidad(v: number): string {
  const r = Math.round(v * 100) / 100;
  return r.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

export function leerMetas(filas: Fila[]): Meta[] {
  return filas
    .map((f) => ({ desde: f.desde, nutriente: f.nutriente as Nutriente, min: num(f.min), max: num(f.max) }))
    .sort((a, b) => a.desde.localeCompare(b.desde));
}

/** Lista de pendientes abiertos de pendientes.md, con las fechas dd/mm que mencionan. */
export function leerPendientes(md: string, anio: number): Pendiente[] {
  const out: Pendiente[] = [];
  let actual: Pendiente | null = null;
  for (const linea of md.split("\n")) {
    if (/^- \[ \] /.test(linea)) {
      const cuerpo = linea.slice(6);
      const titulo = /^\*\*(.+?)\*\*/.exec(cuerpo)?.[1] ?? "";
      actual = { titulo: limpiarMd(titulo), texto: limpiarMd(cuerpo), fechas: [] };
      out.push(actual);
    } else if (/^- \[x\] /i.test(linea) || /^\S/.test(linea)) actual = null;
    else if (actual && /^\s+- /.test(linea)) actual.texto += " " + limpiarMd(linea.replace(/^\s+- /, ""));
  }
  for (const p of out) {
    const fechas = new Set<string>();
    for (const m of p.texto.matchAll(/\b(\d{2})\/(\d{2})\b/g)) {
      const [d, mes] = [Number(m[1]), Number(m[2])];
      if (d >= 1 && d <= 31 && mes >= 1 && mes <= 12) fechas.add(`${anio}-${m[2]}-${m[1]}`);
    }
    p.fechas = [...fechas].sort();
  }
  return out;
}

const limpiarMd = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").trim();

export function calcularTodo(t: Tablas, pendientesMd: string, generado: string): Datos {
  const calc = new Calculo(t);
  const cierres = new Map(t.dias.map((d) => [d.fecha, d]));
  const fechas = [...new Set(t.comidas.filter((c) => c.estado !== "anulada").map((c) => c.fecha))].sort();
  const dias: Record<string, Dia> = {};
  for (const f of fechas) dias[f] = calc.dia(f, cierres.get(f));
  return {
    generado,
    inicio: fechas[0] ?? generado.slice(0, 10),
    dias,
    metas: leerMetas(t.metas),
    pendientes: leerPendientes(pendientesMd, Number(generado.slice(0, 4))),
  };
}
