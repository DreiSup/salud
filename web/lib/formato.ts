// Fechas, números y semáforo. Portado del prototipo de Claude Design (docs/prompt-claude-design.md).
import type { Meta, Nutriente } from "./tipos";

export const NOMBRE: Record<Nutriente, string> = {
  kcal: "Energía", prot: "Proteína", hc: "Hidratos", grasa: "Grasa", sat: "Saturadas",
  azucar: "Azúcares", fibra: "Fibra", sal: "Sal", cafeina: "Cafeína", lactosa: "Lactosa",
};
export const NOMBRE_LARGO: Record<Nutriente, string> = {
  ...NOMBRE, hc: "Hidratos disponibles", sat: "Grasas saturadas",
};
export const MINUSCULA: Partial<Record<Nutriente, string>> = {
  hc: "hidratos", grasa: "grasa", sat: "saturadas", azucar: "azúcares", fibra: "fibra", sal: "sal", lactosa: "lactosa",
};
export const unidad = (k: Nutriente) => (k === "kcal" ? "kcal" : k === "cafeina" ? "mg" : "g");

export const DOW = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const MES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const pd = (n: number) => String(n).padStart(2, "0");
const toD = (s: string) => {
  const [a, b, c] = s.split("-").map(Number);
  return new Date(Date.UTC(a, b - 1, c));
};
const toS = (d: Date) => d.toISOString().slice(0, 10);
export const sumar = (s: string, n: number) => {
  const d = toD(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toS(d);
};
export const diaSemana = (s: string) => (toD(s).getUTCDay() + 6) % 7;
export const lunes = (s: string) => sumar(s, -diaSemana(s));
export const diaMes = (s: string) => Number(s.slice(8));
const mesIdx = (s: string) => Number(s.slice(5, 7)) - 1;
export const fechaCorta = (s: string) => `${DOW[diaSemana(s)]} ${diaMes(s)} ${MES[mesIdx(s)]}`;
export const diaYMes = (s: string) => `${diaMes(s)} ${MES[mesIdx(s)]}`;
export const fechaLarga = (s: string) => `${diaMes(s)} ${MES[mesIdx(s)]} ${s.slice(0, 4)}`;
export const nombreMes = (ym: string) => MES_LARGO[Number(ym.slice(5, 7)) - 1].replace(/^./, (c) => c.toUpperCase());
export const diasEntre = (a: string, b: string) => Math.round((toD(b).getTime() - toD(a).getTime()) / 864e5);
export const ultimoDiaMes = (ym: string) => `${ym}-${pd(new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate())}`;
export const moverMes = (ym: string, n: number) => toS(new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1))).slice(0, 7);

/** Fecha de hoy en Madrid (la del usuario), aunque el navegador esté en otra zona. */
export function hoyMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function fmt(v: number | null | undefined, dec = 0): string {
  if (v == null || Number.isNaN(v)) return "—";
  const neg = v < 0;
  const [a, b] = Math.abs(v).toFixed(dec).split(".");
  return (neg ? "−" : "") + a.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (b ? "," + b : "");
}
export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// ---------------------------------------------------------------- metas y semáforo

export type Rango = [number | null, number | null];
export type Metas = Record<Nutriente, Rango | null>;

export function metasDe(metas: Meta[], fecha: string): Metas {
  const out = {} as Metas;
  for (const m of metas) if (m.desde <= fecha) out[m.nutriente] = [m.min, m.max];
  return out;
}

export type Estado = "ok" | "warn" | "over" | "neutral" | "none";

export function estado(v: number | null, g: Rango | null): Estado {
  if (v == null) return "none";
  if (!g) return "neutral";
  const [mn, mx] = g;
  if (mx != null) {
    if (v > mx * 1.05) return "over";
    if (v >= mx * 0.95) return "warn";
  }
  if (mn != null) return v >= mn ? "ok" : "neutral";
  return "neutral";
}

export const ESTILO: Record<Estado, { fill: string; text: string; label: string }> = {
  ok: { fill: "var(--ok)", text: "var(--ok-t)", label: "Dentro del rango" },
  warn: { fill: "var(--warn)", text: "var(--warn-t)", label: "Cerca del tope" },
  over: { fill: "var(--over)", text: "var(--over-t)", label: "Por encima del tope" },
  neutral: { fill: "var(--neutral)", text: "var(--label)", label: "" },
  none: { fill: "var(--label3)", text: "var(--label3)", label: "" },
};
export const relleno = (st: Estado) => (st === "neutral" || st === "none" ? "var(--neutral)" : ESTILO[st].fill);
export const punto = (st: Estado) =>
  st === "neutral" || st === "none" ? { background: "transparent", borderColor: "var(--label3)" } : { background: ESTILO[st].fill, borderColor: ESTILO[st].fill };

export function textoRango(g: Rango | null, u: string): string {
  if (!g) return "sin meta";
  if (g[0] != null && g[1] != null) return `${fmt(g[0])}–${fmt(g[1])} ${u}`;
  if (g[1] != null) return `máx. ${fmt(g[1])} ${u}`;
  return `mín. ${fmt(g[0])} ${u}`;
}

const TINTE = {
  ok: "color-mix(in srgb, var(--ok) 26%, transparent)",
  warn: "color-mix(in srgb, var(--warn) 38%, transparent)",
  over: "color-mix(in srgb, var(--over) 24%, transparent)",
};

export interface Zona { l: string; w: string; bg: string }

/** Franjas de color de la barra: rango, cerca del tope y por encima. */
export function zonas(g: Rango | null, escala: number): Zona[] {
  if (!g) return [];
  const [mn, mx] = g;
  const P = (x: number) => (Math.max(0, Math.min(1, x / escala)) * 100).toFixed(2) + "%";
  const W = (a: number, b: number) => ((Math.max(0, Math.min(b, escala) - Math.min(a, escala)) / escala) * 100).toFixed(2) + "%";
  const z: Zona[] = [];
  if (mx != null) {
    if (mn != null) z.push({ l: P(mn), w: W(mn, mx * 0.95), bg: TINTE.ok });
    z.push({ l: P(mx * 0.95), w: W(mx * 0.95, mx * 1.05), bg: TINTE.warn });
    z.push({ l: P(mx * 1.05), w: W(mx * 1.05, escala), bg: TINTE.over });
  } else if (mn != null) z.push({ l: P(mn), w: W(mn, escala), bg: TINTE.ok });
  return z;
}

/** Fondo de escala de la barra: como en el diseño, lo que pasa del 125 % del máximo se recorta. */
export const escalaDe = (g: Rango | null, v: number) =>
  g?.[1] != null ? g[1] * 1.25 : g?.[0] != null ? g[0] * 1.6 : Math.max(v * 1.25, 1);

export const textoFaltan = (n: number) => (n ? "falta dato en " + plural(n, "comida", "comidas") : "");
export const ESTADO_DIA: Record<string, string> = {
  abierto: "Abierto", completo: "Completo", parcial: "Parcial", incompleto: "Incompleto", sincerrar: "Sin cerrar",
};
