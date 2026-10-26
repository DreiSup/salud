// Datos que el servidor calcula en el build y la página recibe ya hechos.

export const NUTRIENTES = ["kcal", "prot", "hc", "grasa", "sat", "azucar", "fibra", "sal", "cafeina", "lactosa"] as const;
export type Nutriente = (typeof NUTRIENTES)[number];

export type Gluten = "si" | "trazas" | "desconocido" | "no";
export type EstadoDia = "completo" | "parcial" | "incompleto";

export interface Item {
  nombre: string;
  cantidad: string;
  kcal: number | null;
  prot: number | null;
}

export interface Comida {
  id: string;
  hora: string | null;
  descripcion: string;
  /** Suma de los items que tienen el dato; null si ninguno lo tiene. */
  n: Record<Nutriente, number | null>;
  /** Nutrientes a los que les falta el dato en algún item. */
  incompletos: Nutriente[];
  err: { kcal: number; prot: number };
  gluten: Gluten;
  glutenDe: string[];
  /** Lleva leche (alérgeno) pero ningún item tiene dato de lactosa. */
  lacteoSinLactosa: boolean;
  notas: string;
  items: Item[];
}

export interface Total {
  v: number | null;
  /** Comidas a las que les falta el dato. */
  faltan: number;
}

export interface Dia {
  fecha: string;
  estado: EstadoDia | null;
  nota: string;
  historico: boolean;
  comidas: Comida[];
  tot: Record<Nutriente, Total>;
  err: { kcal: number; prot: number };
}

export interface Meta {
  desde: string;
  nutriente: Nutriente;
  min: number | null;
  max: number | null;
}

export interface Pendiente {
  /** Lo que va en negrita al principio, si lo hay. */
  titulo: string;
  texto: string;
  fechas: string[];
}

export interface Datos {
  generado: string;
  inicio: string;
  dias: Record<string, Dia>;
  metas: Meta[];
  pendientes: Pendiente[];
}
