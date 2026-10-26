"use client";
import { fechaLarga, metasDe, NOMBRE_LARGO, textoRango, unidad, type Rango } from "@/lib/formato";
import type { Nutriente } from "@/lib/tipos";
import type { Ctx } from "./Panel";

const ORDEN: Nutriente[] = ["kcal", "prot", "hc", "grasa", "sat", "azucar", "fibra", "sal", "cafeina"];

export default function VistaMetas({ ctx }: { ctx: Ctx }) {
  const { datos, hoy } = ctx;
  const vigentes = metasDe(datos.metas, hoy);
  const desde = datos.metas.filter((m) => m.desde <= hoy).reduce((a, m) => (m.desde > a ? m.desde : a), "");
  const filas = ORDEN.filter((k) => vigentes[k]);

  // Historial: cada fecha con cambios, comparando con lo vigente el día anterior.
  const fechasCambio = [...new Set(datos.metas.map((m) => m.desde))].sort().reverse();
  const historial = fechasCambio.map((f, idx) => {
    const esPrimera = idx === fechasCambio.length - 1;
    if (esPrimera) return { f, cambios: ["Metas iniciales"] };
    const antes = metasDe(datos.metas.filter((m) => m.desde < f), f);
    const ahora = metasDe(datos.metas, f);
    const cambios = ORDEN.filter((k) => !igual(antes[k], ahora[k])).map(
      (k) => `${NOMBRE_LARGO[k]}: ${textoRango(antes[k], unidad(k))} → ${textoRango(ahora[k], unidad(k))}`,
    );
    return { f, cambios };
  });

  return (
    <div className="columna" style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="kicker">{desde ? `Vigentes desde el ${fechaLarga(desde)}` : "Sin metas"}</span>
        <span className="titulo">Metas</span>
      </div>
      {filas.length > 0 && (
        <div className="tarjeta" style={{ padding: "4px 20px" }}>
          {filas.map((k, i) => {
            const principal = k === "kcal" || k === "prot";
            const g = vigentes[k]!;
            const tipo = principal ? "Principal" : "Secundario" + (g[0] == null ? " · solo tope" : g[1] == null ? " · solo mínimo" : "");
            const size = principal ? 17 : 15;
            return (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "4px 16px", alignItems: "baseline", padding: "13px 0", borderTop: i ? "1px solid var(--sep)" : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: size, fontWeight: principal ? 600 : 400 }}>{NOMBRE_LARGO[k]}</span>
                  <span className="l3" style={{ fontSize: 12 }}>{tipo}</span>
                </div>
                <span className="tab" style={{ fontSize: size, fontWeight: 600 }}>{textoRango(g, unidad(k))}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="l2" style={{ fontSize: 15, padding: "0 4px" }}>Para cambiar una meta, díselo a Claude. Cada día se evalúa con la meta vigente ese día.</div>
      <div className="tarjeta" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Cómo se leen los colores</span>
        <div className="l2" style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "10px 12px", fontSize: 13, alignItems: "center" }}>
          <span className="bolita" style={{ width: 10, height: 10, borderColor: "var(--label3)" }} /><span>Por debajo del mínimo, o lejos del tope cuando solo hay tope. Sin marca.</span>
          <span className="bolita" style={{ width: 10, height: 10, background: "var(--ok)", borderColor: "var(--ok)" }} /><span>Dentro del rango.</span>
          <span className="bolita" style={{ width: 10, height: 10, background: "var(--warn)", borderColor: "var(--warn)" }} /><span>Cerca del tope: entre el 95 % y el 105 % del máximo.</span>
          <span className="bolita" style={{ width: 10, height: 10, background: "var(--over)", borderColor: "var(--over)" }} /><span>Por encima del 105 % del máximo.</span>
        </div>
        <span className="l3" style={{ fontSize: 12 }}>Se evalúa con el valor central, no con el margen de error.</span>
      </div>
      {historial.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 600, padding: "0 4px" }}>Historial</span>
          <div className="tarjeta" style={{ padding: "4px 20px" }}>
            {historial.map((h, i) => (
              <div key={h.f} style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr)", gap: 12, padding: "14px 0", borderTop: i ? "1px solid var(--sep)" : "none" }}>
                <span className="l2 tab" style={{ fontSize: 13, fontWeight: 600 }}>{fechaLarga(h.f)}</span>
                <div className="tab" style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 15 }}>
                  {h.cambios.map((c) => <span key={c}>{c}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const igual = (a: Rango | null | undefined, b: Rango | null | undefined) => (a?.[0] ?? null) === (b?.[0] ?? null) && (a?.[1] ?? null) === (b?.[1] ?? null);
