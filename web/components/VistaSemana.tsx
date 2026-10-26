"use client";
import { diaMes, diaYMes, DOW, ESTADO_DIA, ESTILO, estado, fmt, lunes, metasDe, punto, sumar } from "@/lib/formato";
import type { Dia, Meta } from "@/lib/tipos";
import { Bolita, Encabezado, Navegar } from "./comun";
import type { Ctx } from "./Panel";

/** Totales de kcal y proteína de un día con su color, para las vistas Semana y Mes. */
export function totalesDia(dia: Dia, metas: Meta[]) {
  const g = metasDe(metas, dia.fecha);
  const sk = estado(dia.tot.kcal.v, g.kcal);
  const sp = estado(dia.tot.prot.v, g.prot);
  const p = dia.tot.prot.v;
  return {
    kcal: (dia.tot.kcal.faltan ? "≥ " : "") + fmt(dia.tot.kcal.v),
    prot: (dia.tot.prot.faltan ? "≥ " : "") + fmt(p, p != null && p >= 100 ? 0 : 1),
    kColor: ESTILO[sk].text, pColor: ESTILO[sp].text, kPunto: punto(sk), pPunto: punto(sp),
  };
}

export function textoEstado(dia: Dia, hoy: string) {
  if (!dia.estado && dia.fecha === hoy) return `Abierto · ${dia.comidas.length} de 3`;
  if (dia.estado === "completo") return "";
  return ESTADO_DIA[dia.estado ?? "sincerrar"];
}

export default function VistaSemana({ ctx, ancla, setAncla }: { ctx: Ctx; ancla: string; setAncla: (f: string) => void }) {
  const { datos, hoy, movil, irADia } = ctx;
  const ini = lunes(ancla);
  const fin = sumar(ini, 6);
  const minS = lunes(datos.inicio);
  const maxS = lunes(hoy);
  const fechas = [0, 1, 2, 3, 4, 5, 6].map((i) => sumar(ini, i));
  const completos = fechas.map((f) => datos.dias[f]).filter((d): d is Dia => !!d && d.estado === "completo");
  let media: { k: string; p: string; kc: string; pc: string; nota: string } = { k: "—", p: "—", kc: "var(--label3)", pc: "var(--label3)", nota: "Sin días completos esta semana" };
  if (completos.length) {
    const k = completos.reduce((s, d) => s + (d.tot.kcal.v ?? 0), 0) / completos.length;
    const p = completos.reduce((s, d) => s + (d.tot.prot.v ?? 0), 0) / completos.length;
    const g = metasDe(datos.metas, fin);
    media = {
      k: fmt(k), p: fmt(p, 1), kc: ESTILO[estado(k, g.kcal)].text, pc: ESTILO[estado(p, g.prot)].text,
      nota: `Solo días completos: ${completos.length} de 7` + (completos.some((d) => d.tot.kcal.faltan || d.tot.prot.faltan) ? " · algún total incompleto" : ""),
    };
  }
  const titulo = (ini.slice(5, 7) === fin.slice(5, 7) ? String(diaMes(ini)) : diaYMes(ini)) + " – " + diaYMes(fin);

  const dias = fechas.map((f, i) => {
    const dia = datos.dias[f];
    const futuro = f > hoy;
    const antes = f < datos.inicio;
    const clicable = !futuro && !antes;
    return { f, i, dia, futuro, antes, clicable, vacio: futuro ? "" : antes ? "Antes del registro" : "Sin registros" };
  });
  const numero = (f: string) => ({
    background: f === hoy ? "var(--accent)" : "transparent", color: f === hoy ? "var(--onaccent)" : "var(--label)",
    width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 600,
  });

  return (
    <div className="columna">
      <Encabezado kicker="Semana" titulo={titulo}>
        <Navegar
          etiqueta={["Semana anterior", "Semana siguiente"]}
          antes={() => setAncla(sumar(ini, -7))}
          despues={() => setAncla(sumar(ini, 7))}
          puedeAntes={ini > minS}
          puedeDespues={ini < maxS}
          volver={ini !== maxS ? () => setAncla(hoy) : undefined}
          textoVolver="Esta semana"
        />
      </Encabezado>

      {!movil ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 8 }}>
          {dias.map(({ f, i, dia, futuro, antes, clicable, vacio }) => {
            const t = dia && totalesDia(dia, datos.metas);
            return (
              <div key={f} onClick={clicable ? () => irADia(f) : undefined} className={"tarjeta col-semana" + (clicable ? " clicable" : "")} style={{ borderRadius: 16, padding: 10, display: "flex", flexDirection: "column", gap: 6, minHeight: 400, opacity: futuro || antes ? 0.45 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 2px 6px" }}>
                  <span className="l2" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em" }}>{DOW[i]}</span>
                  <span className="tab" style={numero(f)}>{diaMes(f)}</span>
                </div>
                {dia?.comidas.map((c) => (
                  <div key={c.id} className="celda" style={{ borderRadius: 10, padding: "8px 9px", display: "flex", flexDirection: "column", gap: 3 }}>
                    <span className="recortar" style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, WebkitLineClamp: 3 }}>{c.descripcion}</span>
                    <span className="l2 tab" style={{ fontSize: 11 }}>{fmt(c.n.kcal)} kcal · {fmt(c.n.prot, 1)} g</span>
                  </div>
                ))}
                {!dia && <div className="l3" style={{ fontSize: 12, padding: "8px 2px" }}>{vacio}</div>}
                <div style={{ flex: 1 }} />
                {dia && t && (
                  <div style={{ borderTop: "1px solid var(--sep)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Bolita estilo={t.kPunto} size={7} />
                      <span className="tab" style={{ fontSize: 15, fontWeight: 600, color: t.kColor }}>{t.kcal}</span>
                      <span className="l2" style={{ fontSize: 11 }}>kcal</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Bolita estilo={t.pPunto} size={7} />
                      <span className="tab" style={{ fontSize: 15, fontWeight: 600, color: t.pColor }}>{t.prot}</span>
                      <span className="l2" style={{ fontSize: 11 }}>g prot.</span>
                    </div>
                    <span className="l2" style={{ fontSize: 11 }}>{textoEstado(dia, hoy)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tarjeta" style={{ padding: "0 16px" }}>
          {dias.map(({ f, i, dia, futuro, antes, clicable, vacio }) => {
            const t = dia && totalesDia(dia, datos.metas);
            return (
              <div key={f} onClick={clicable ? () => irADia(f) : undefined} className={clicable ? "clicable" : ""} style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "12px 0", borderTop: i ? "1px solid var(--sep)" : "none", opacity: futuro || antes ? 0.45 : 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span className="l2" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>{DOW[i]}</span>
                  <span className="tab" style={numero(f)}>{diaMes(f)}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span className="recortar" style={{ fontSize: 13, lineHeight: 1.35, WebkitLineClamp: 2 }}>{dia ? dia.comidas.map((c) => c.descripcion).join(" · ") : vacio}</span>
                  {dia && <span className="l2" style={{ fontSize: 11 }}>{textoEstado(dia, hoy)}</span>}
                </div>
                {t && (
                  <div className="tab" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: t.kColor }}>{t.kcal} <span className="l2" style={{ fontSize: 11, fontWeight: 400 }}>kcal</span></span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.pColor }}>{t.prot} <span className="l2" style={{ fontSize: 11, fontWeight: 400 }}>g</span></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="tarjeta" style={{ padding: "18px 24px", display: "flex", flexWrap: "wrap", gap: "12px 40px", alignItems: "baseline" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 180 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Media de la semana</span>
          <span className="l2" style={{ fontSize: 13 }}>{media.nota}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span className="redondo" style={{ fontSize: 32, fontWeight: 700, color: media.kc }}>{media.k}</span>
          <span className="l2" style={{ fontSize: 15 }}>kcal</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span className="redondo" style={{ fontSize: 32, fontWeight: 700, color: media.pc }}>{media.p}</span>
          <span className="l2" style={{ fontSize: 15 }}>g proteína</span>
        </div>
      </div>
    </div>
  );
}
