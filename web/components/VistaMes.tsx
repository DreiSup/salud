"use client";
import { diaMes, DOW, lunes, moverMes, nombreMes, sumar, ultimoDiaMes } from "@/lib/formato";
import { Encabezado, Navegar } from "./comun";
import type { Ctx } from "./Panel";
import { totalesDia } from "./VistaSemana";

export default function VistaMes({ ctx, ancla, setAncla }: { ctx: Ctx; ancla: string; setAncla: (f: string) => void }) {
  const { datos, hoy, movil, irADia } = ctx;
  const ym = ancla.slice(0, 7);
  const ini = lunes(`${ym}-01`);
  const fin = sumar(lunes(ultimoDiaMes(ym)), 6);
  const celdas: string[] = [];
  for (let d = ini; d <= fin; d = sumar(d, 1)) celdas.push(d);
  const minM = datos.inicio.slice(0, 7);
  const maxM = hoy.slice(0, 7);
  const ir = (n: number) => setAncla(`${moverMes(ym, n)}-01`);

  return (
    <div className="columna">
      <Encabezado kicker={ym.slice(0, 4)} titulo={nombreMes(ym)}>
        <Navegar etiqueta={["Mes anterior", "Mes siguiente"]} antes={() => ir(-1)} despues={() => ir(1)} puedeAntes={ym > minM} puedeDespues={ym < maxM} />
      </Encabezado>
      <div className="tarjeta" style={{ padding: movil ? "12px 6px" : "16px 16px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, paddingBottom: 8 }}>
          {DOW.map((d) => <span key={d} className="l3" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em", textAlign: "center" }}>{d}</span>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4 }}>
          {celdas.map((f) => {
            const delMes = f.slice(0, 7) === ym;
            const dia = delMes ? datos.dias[f] : undefined;
            const fuera = f > hoy || f < datos.inicio;
            const clicable = delMes && !fuera;
            const t = dia && totalesDia(dia, datos.metas);
            const n = dia?.comidas.length ?? 0;
            return (
              <div key={f} onClick={clicable ? () => irADia(f) : undefined} className={"dia-mes" + (clicable ? " clicable" : "")} style={{ minHeight: movil ? 78 : 104, borderRadius: 12, padding: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0, visibility: delMes ? "visible" : "hidden", opacity: fuera ? 0.3 : 1 }}>
                <span className="tab" style={{ fontSize: movil ? 13 : 15, fontWeight: 600, width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: f === hoy ? "var(--accent)" : "transparent", color: f === hoy ? "var(--onaccent)" : dia ? "var(--label)" : "var(--label2)" }}>{diaMes(f)}</span>
                {t && (
                  <>
                    <span className="tab" style={{ fontSize: movil ? 11 : 15, fontWeight: 600, color: t.kColor, whiteSpace: "nowrap" }}>{t.kcal}</span>
                    <span className="tab" style={{ fontSize: movil ? 10 : 13, fontWeight: 500, color: t.pColor, whiteSpace: "nowrap" }}>{t.prot}{movil ? "" : " g"}</span>
                    <div style={{ display: "flex", gap: 3, marginTop: "auto", paddingTop: 3 }}>
                      {Array.from({ length: Math.max(3, n) }, (_, i) => (
                        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", border: "1px solid", borderColor: i < n ? "var(--label2)" : "var(--label3)", background: i < n ? "var(--label2)" : "transparent" }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="leyenda">
        <span>Arriba kcal, abajo proteína</span>
        <span><span className="bolita" style={{ background: "var(--ok)", borderColor: "var(--ok)" }} />Dentro del rango</span>
        <span><span className="bolita" style={{ background: "var(--warn)", borderColor: "var(--warn)" }} />Cerca del tope</span>
        <span><span className="bolita" style={{ background: "var(--over)", borderColor: "var(--over)" }} />Por encima del tope</span>
        <span><span className="bolita" style={{ borderColor: "var(--label3)" }} />Sin color: por debajo del mínimo</span>
        <span>≥ total incompleto · puntos: comidas registradas</span>
      </div>
    </div>
  );
}
