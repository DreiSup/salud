"use client";
import { diaYMes, ESTADO_DIA, estado, fechaCorta, fmt, metasDe, plural, relleno, sumar, unidad } from "@/lib/formato";
import { trama } from "./comun";
import type { Ctx } from "./Panel";

export default function VistaTendencias({ ctx, periodo, setPeriodo }: { ctx: Ctx; periodo: number; setPeriodo: (p: number) => void }) {
  const { datos, hoy } = ctx;
  const fechas: string[] = [];
  for (let i = periodo - 1; i >= 0; i--) fechas.push(sumar(hoy, -i));
  const conDatos = fechas.filter((f) => datos.dias[f]).length;

  return (
    <div className="columna">
      <div className="encabezado">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="kicker">{diaYMes(fechas[0])} – {diaYMes(hoy)} · {plural(conDatos, "día con registro", "días con registro")}</span>
          <span className="titulo">Tendencias</span>
        </div>
        <div className="segmentado">
          {[7, 30, 90].map((p) => (
            <button key={p} aria-pressed={p === periodo} onClick={() => setPeriodo(p)} style={{ padding: "7px 14px", minHeight: 36 }}>{p} días</button>
          ))}
        </div>
      </div>
      <Grafica k="kcal" fechas={fechas} ctx={ctx} />
      <Grafica k="prot" fechas={fechas} ctx={ctx} />
      <div className="leyenda">
        <span><span style={{ width: 14, height: 10, background: "var(--band)", borderTop: "1px dashed var(--fill2)", borderBottom: "1px dashed var(--fill2)" }} />Meta vigente cada día</span>
        <span>Barra con trama: día parcial, incompleto, abierto o con total incompleto</span>
        <span>Hueco: día sin registro</span>
      </div>
    </div>
  );
}

function Grafica({ k, fechas, ctx }: { k: "kcal" | "prot"; fechas: string[]; ctx: Ctx }) {
  const { datos, hoy } = ctx;
  const N = fechas.length;
  const u = unidad(k);
  const dec = k === "prot" ? 1 : 0;
  const maxDato = Math.max(0, ...fechas.map((f) => datos.dias[f]?.tot[k].v ?? 0));
  const paso = k === "kcal" ? 1000 : 50;
  const yMax = Math.max(k === "kcal" ? 3000 : 250, Math.ceil(maxDato / paso) * paso);
  const P = (v: number) => (Math.max(0, Math.min(1, v / yMax)) * 100).toFixed(2) + "%";
  const marcas: number[] = [];
  for (let v = 0; v <= yMax; v += paso) marcas.push(v);

  // Franjas de la meta: un tramo por cada periodo con la misma meta.
  const bandas: { i: number; n: number; g: [number, number] }[] = [];
  fechas.forEach((f, i) => {
    const g = f >= datos.inicio ? metasDe(datos.metas, f)[k] : null;
    if (!g || g[0] == null || g[1] == null) return;
    const ult = bandas[bandas.length - 1];
    if (ult && ult.i + ult.n === i && ult.g[0] === g[0] && ult.g[1] === g[1]) ult.n++;
    else bandas.push({ i, n: 1, g: [g[0], g[1]] });
  });

  const completos: number[] = [];
  const barras = fechas.flatMap((f, i) => {
    const dia = datos.dias[f];
    if (!dia) return [];
    const t = dia.tot[k];
    const v = t.v ?? 0;
    const c = relleno(estado(t.v, metasDe(datos.metas, f)[k]));
    const parcial = dia.estado !== "completo" || t.faltan > 0;
    if (dia.estado === "completo") completos.push(v);
    const etiquetaEstado = !dia.estado && f === hoy ? "Abierto" : ESTADO_DIA[dia.estado ?? "sincerrar"];
    const titulo = `${fechaCorta(f)}: ${t.faltan ? "≥ " : ""}${fmt(v, dec)} ± ${fmt(dia.err[k], dec)} ${u}` + (parcial ? ` · ${etiquetaEstado}${t.faltan ? " · total incompleto" : ""}` : "");
    return [{ f, i, v, c, parcial, titulo }];
  });
  const media = completos.length ? completos.reduce((a, b) => a + b, 0) / completos.length : null;
  const cadaX = N === 7 ? 1 : N === 30 ? 7 : 15;
  const ejeX: { i: number; t: string }[] = [];
  for (let i = N - 1; i >= 0; i -= cadaX) ejeX.push({ i, t: N === 7 ? fechaCorta(fechas[i]).split(" ").slice(0, 2).join(" ") : diaYMes(fechas[i]) });

  return (
    <div className="tarjeta" style={{ padding: "20px 24px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>{k === "kcal" ? "Energía" : "Proteína"}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <span className="l2" style={{ fontSize: 13 }}>Media de {plural(completos.length, "día completo", "días completos")}</span>
          <span className="redondo" style={{ fontSize: 24, fontWeight: 700 }}>{fmt(media, dec)}</span>
          <span className="l2" style={{ fontSize: 13 }}>{u}</span>
        </div>
      </div>
      <div style={{ position: "relative", height: 220, marginLeft: 44 }}>
        {marcas.map((m) => (
          <div key={m} style={{ position: "absolute", left: 0, right: 0, bottom: P(m), borderTop: "1px solid var(--sep)" }}>
            <span className="l3 tab" style={{ position: "absolute", right: "100%", marginRight: 8, top: -8, fontSize: 11, whiteSpace: "nowrap" }}>{fmt(m)}</span>
          </div>
        ))}
        {bandas.map((b, j) => (
          <div key={j} style={{ position: "absolute", left: ((b.i / N) * 100).toFixed(2) + "%", width: ((b.n / N) * 100).toFixed(2) + "%", bottom: P(b.g[0]), height: (((b.g[1] - b.g[0]) / yMax) * 100).toFixed(2) + "%", background: "var(--band)", borderTop: "1px dashed var(--fill2)", borderBottom: "1px dashed var(--fill2)" }} />
        ))}
        {barras.map((b) => (
          <div key={b.f} title={b.titulo} onClick={() => ctx.irADia(b.f)} style={{
            position: "absolute", bottom: 0, cursor: "pointer", left: (((b.i + 0.18) / N) * 100).toFixed(2) + "%", width: ((0.64 / N) * 100).toFixed(2) + "%", height: P(b.v),
            background: b.parcial ? trama(b.c, 5) : b.c, boxShadow: b.parcial ? `inset 0 0 0 1.5px ${b.c}` : "none", borderRadius: "3px 3px 1px 1px", transition: "height .5s cubic-bezier(.2,.8,.2,1)",
          }} />
        ))}
      </div>
      <div style={{ position: "relative", height: 16, marginLeft: 44 }}>
        {ejeX.map((x) => (
          <span key={x.i} className="l3" style={{ position: "absolute", left: (((x.i + 0.5) / N) * 100).toFixed(2) + "%", transform: "translateX(-50%)", fontSize: 11, whiteSpace: "nowrap" }}>{x.t}</span>
        ))}
      </div>
    </div>
  );
}
