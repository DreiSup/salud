// Lee los CSV del repo en el build (la web se publica de nuevo con cada push a main).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { calcularTodo, type Tablas } from "./calculo";
import { parseCsv } from "./csv";
import type { Datos } from "./tipos";

export const REPO = path.resolve(process.cwd(), "..");

function tabla(nombre: string) {
  const ruta = path.join(REPO, "datos", `${nombre}.csv`);
  return existsSync(ruta) ? parseCsv(readFileSync(ruta, "utf-8")) : [];
}

export function leerTablas(): Tablas {
  return {
    alimentos: tabla("alimentos"),
    nutrientes: tabla("nutrientes"),
    comidas: tabla("comidas"),
    comida_items: tabla("comida_items"),
    item_valores: tabla("item_valores"),
    dias: tabla("dias"),
    metas: tabla("metas"),
  };
}

/** Fecha y hora de Madrid, como `salud.py ahora`. */
export function ahoraMadrid(d = new Date()): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function cargarDatos(): Datos {
  const md = path.join(REPO, "pendientes.md");
  return calcularTodo(leerTablas(), existsSync(md) ? readFileSync(md, "utf-8") : "", ahoraMadrid());
}
