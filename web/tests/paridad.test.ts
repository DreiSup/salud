import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Calculo } from "../lib/calculo";
import { leerTablas, REPO } from "../lib/cargar";
import { NUTRIENTES } from "../lib/tipos";

// La web y scripts/salud.py tienen que dar los mismos números en todos los días registrados.
const python = process.env.PYTHON ?? "python3";
const salud = JSON.parse(
  execFileSync(python, [path.join(REPO, "web", "scripts", "totales_salud.py")], { encoding: "utf-8" }),
) as Record<string, { tot: Record<string, number>; cob: Record<string, number>; n_items: number; err_kcal: number; comidas: number }>;

const calc = new Calculo(leerTablas());
const fechas = Object.keys(salud);

describe("paridad con salud.py", () => {
  it("hay días que comparar", () => expect(fechas.length).toBeGreaterThan(10));

  it.each(fechas)("%s", (fecha) => {
    const esperado = salud[fecha];
    const dia = calc.dia(fecha);
    expect(dia.comidas.length).toBe(esperado.comidas);
    const nItems = dia.comidas.reduce((s, c) => s + c.items.length, 0);
    expect(nItems).toBe(esperado.n_items);
    for (const k of NUTRIENTES) {
      const t = dia.tot[k];
      if (!(k in esperado.tot)) {
        expect(t.v, k).toBeNull();
        continue;
      }
      expect(t.v, k).toBeCloseTo(esperado.tot[k], 6);
      // Total completo en salud.py (cobertura = nº de items) ⇔ ninguna comida incompleta en la web.
      expect(t.faltan === 0, k).toBe(esperado.cob[k] === esperado.n_items);
    }
    expect(dia.err.kcal).toBeCloseTo(esperado.err_kcal, 6);
  });
});
