"use client";
import { useState } from "react";
import {
  diasEntre, ESTADO_DIA, ESTILO, escalaDe, estado, fechaCorta, fmt, metasDe, MINUSCULA, NOMBRE, plural, punto,
  relleno, sumar, textoFaltan, textoRango, unidad, zonas,
} from "@/lib/formato";
import type { Comida, Dia, Nutriente } from "@/lib/tipos";
import { Bolita, Encabezado, Navegar, trama, Zonas } from "./comun";
import type { Ctx } from "./Panel";

const SECUNDARIOS: Nutriente[] = ["hc", "grasa", "sat", "azucar", "fibra", "sal", "cafeina"];

export default function VistaDia({ ctx, fecha, setFecha }: { ctx: Ctx; fecha: string; setFecha: (f: string) => void }) {
  const { datos, hoy, movil } = ctx;
  const dia = datos.dias[fecha];
  const [abierta, setAbierta] = useState<string | null>(null);
  const [verPendientes, setVerPendientes] = useState(false);
  const diff = diasEntre(fecha, hoy);
  const kicker = diff === 0 ? "Hoy" : diff === 1 ? "Ayer" : `Hace ${diff} días`;
  const titulo = fechaCorta(fecha) + (fecha.slice(0, 4) !== hoy.slice(0, 4) ? " " + fecha.slice(0, 4) : "");
  const abiertoHoy = !!dia && !dia.estado && fecha === hoy;
  const n = dia?.comidas.length ?? 0;
  const estadoTxt = !dia
    ? "Sin registros"
    : abiertoHoy
      ? `Abierto · ${n} de 3 comidas`
      : `${ESTADO_DIA[dia.estado ?? "sincerrar"]} · ${plural(n, "comida", "comidas")}`;
  const pendientesDia = datos.pendientes.filter((p) => p.fechas.includes(fecha));

  return (
    <div className="columna">
      <Encabezado
        kicker={kicker}
        titulo={titulo}
        extra={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
            <span className="pastilla">{estadoTxt}</span>
            {dia?.nota && <span className="l2" style={{ fontSize: 13 }}>{dia.nota}</span>}
          </div>
        }
      >
        <Navegar
          etiqueta={["Día anterior", "Día siguiente"]}
          antes={() => setFecha(sumar(fecha, -1))}
          despues={() => setFecha(sumar(fecha, 1))}
          puedeAntes={fecha > datos.inicio}
          puedeDespues={fecha < hoy}
          volver={fecha !== hoy ? () => setFecha(hoy) : undefined}
          textoVolver="Hoy"
        />
      </Encabezado>

      {!dia ? (
        <div className="tarjeta" style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => <span key={i} className="bolita" style={{ borderColor: "var(--label3)" }} />)}
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>Sin registros este día</div>
          <div className="l2" style={{ fontSize: 15 }}>
            {fecha === hoy ? "Cuando registres una comida hablando con Claude, aparecerá aquí." : "No se registró nada este día."}
          </div>
        </div>
      ) : (
        <>
          <div className="rejilla-dia">
            <Resumen dia={dia} ctx={ctx} abierto={abiertoHoy} />
            <Secundarios dia={dia} ctx={ctx} />
          </div>
          <Registro dia={dia} movil={movil} abierta={abierta} setAbierta={setAbierta} abiertoHoy={abiertoHoy} />
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 4px" }}>
        {pendientesDia.map((p, i) => (
          <div key={i} className="l2" style={{ display: "flex", gap: 8, fontSize: 13, alignItems: "baseline" }}>
            <span className="bolita" style={{ width: 6, height: 6, borderColor: "var(--label3)", transform: "translateY(-1px)" }} />
            <span style={{ textWrap: "pretty" }}>Pendiente: {p.titulo || p.texto}</span>
          </div>
        ))}
        {datos.pendientes.length > 0 && (
          <button onClick={() => setVerPendientes(!verPendientes)} className="l2" style={{ alignSelf: "flex-start", background: "none", border: "none", padding: "4px 0", fontSize: 13, cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }} aria-expanded={verPendientes}>
            <span>Pendientes del registro · {datos.pendientes.length}</span>
            <span className="giro" style={{ transform: `rotate(${verPendientes ? 90 : 0}deg)` }}>›</span>
          </button>
        )}
        {verPendientes && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0 8px", maxWidth: 720 }}>
            {datos.pendientes.map((p, i) => (
              <div key={i} className="l2" style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
                <span className="l3" style={{ flex: "none" }}>—</span>
                <span style={{ textWrap: "pretty" }}>{p.texto}</span>
              </div>
            ))}
            <span className="l3" style={{ fontSize: 12 }}>Se cierran cuando haya dato, hablando con Claude.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Resumen({ dia, ctx, abierto }: { dia: Dia; ctx: Ctx; abierto: boolean }) {
  const metas = metasDe(ctx.datos.metas, dia.fecha);
  const n = dia.comidas.length;
  const quedan = abierto ? Math.max(0, 3 - n) : 0;
  const porComida = (k: "kcal" | "prot", dec: number) => {
    const g = metas[k];
    if (!g || g[0] == null || g[1] == null) return "—";
    const v = dia.tot[k].v ?? 0;
    const a = Math.max(0, g[0] - v) / quedan;
    const b = (g[1] - v) / quedan;
    if (b < 0) return "Máximo superado";
    if (a === 0) return "hasta " + fmt(b, dec);
    return `${fmt(a, dec)}–${fmt(b, dec)}`;
  };
  const algunaMeta = !!(metas.kcal || metas.prot);

  return (
    <div className="tarjeta" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 28 }}>
        {(["kcal", "prot"] as const).map((k) => <Principal key={k} k={k} dia={dia} g={metas[k]} abierto={abierto} />)}
      </div>
      {algunaMeta && (
        <div className="leyenda" style={{ marginTop: -8, gap: "6px 16px", padding: 0 }}>
          <span><span style={{ width: 14, height: 8, borderRadius: 2, background: "color-mix(in srgb, var(--ok) 26%, transparent)" }} />Rango</span>
          <span><span style={{ width: 14, height: 8, borderRadius: 2, background: "color-mix(in srgb, var(--warn) 38%, transparent)" }} />Cerca del tope</span>
          <span><span style={{ width: 14, height: 8, borderRadius: 2, background: "color-mix(in srgb, var(--over) 24%, transparent)" }} />Por encima</span>
          <span>Cada bloque es una comida</span>
        </div>
      )}
      {quedan > 0 && (
        <div style={{ borderTop: "1px solid var(--sep)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Te quedan {plural(quedan, "comida", "comidas")}</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            {([["kcal", 0, "kcal por comida"], ["prot", 1, "g de proteína por comida"]] as const).map(([k, dec, txt]) => (
              <div key={k} className="celda" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="redondo" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.01em" }}>{porComida(k, dec)}</span>
                <span className="l2" style={{ fontSize: 13 }}>{txt}</span>
              </div>
            ))}
          </div>
          <span className="l3" style={{ fontSize: 12, textWrap: "pretty" }}>
            De lo que falta para el mínimo a lo que falta para el máximo, repartido entre {plural(quedan, "comida", "comidas")}.
          </span>
        </div>
      )}
    </div>
  );
}

function Principal({ k, dia, g, abierto }: { k: "kcal" | "prot"; dia: Dia; g: [number | null, number | null] | null; abierto: boolean }) {
  const t = dia.tot[k];
  const dec = k === "prot" ? 1 : 0;
  const u = unidad(k);
  const v = t.v ?? 0;
  const st = estado(t.v, g);
  const escala = escalaDe(g, v);
  const pct = (x: number) => (Math.max(0, Math.min(1, x / escala)) * 100).toFixed(2) + "%";
  let acum = 0;
  const color = relleno(st);
  const bloques = dia.comidas
    .filter((c) => c.n[k] != null)
    .map((c) => {
      const l = Math.min(acum, escala);
      const w = Math.max(0, Math.min(acum + c.n[k]!, escala) - l);
      acum += c.n[k]!;
      return { l: pct(l), w: pct(w), titulo: `${c.hora ? c.hora + " · " : ""}${c.descripcion}: ${fmt(c.n[k], dec)} ${u}` };
    });
  const lineas: string[] = [];
  if (!g) lineas.push("Sin meta");
  else {
    if (g[0] != null) {
      const falta = g[0] - v;
      lineas.push(falta > 0 ? (abierto ? `Faltan ${fmt(falta, dec)} para el mínimo` : `${fmt(falta, dec)} por debajo del mínimo`) : "Mínimo alcanzado");
    }
    if (g[1] != null) {
      const hasta = g[1] - v;
      lineas.push(hasta >= 0 ? `${fmt(hasta, dec)} hasta el máximo` : `${fmt(-hasta, dec)} por encima del máximo`);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{NOMBRE[k]}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: ESTILO[st].text }}>{ESTILO[st].label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span className="redondo" style={{ fontSize: 60, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1, color: ESTILO[st].text, transition: "color .3s" }}>
          {(t.faltan ? "≥ " : "") + fmt(v, dec)}
        </span>
        <span className="l2" style={{ fontSize: 20, fontWeight: 600 }}>{u}</span>
      </div>
      <span className="l2" style={{ fontSize: 13 }}>
        ± {fmt(dia.err[k], dec)} {u}{t.faltan ? " · " + textoFaltan(t.faltan) : ""}
      </span>
      <div className="barra" style={{ height: 22, borderRadius: 11, marginTop: 14 }}>
        <Zonas zonas={zonas(g, escala)} />
        {bloques.map((b, i) => (
          <div key={i} title={b.titulo} style={{ top: 4, bottom: 4, left: b.l, width: b.w, background: color, borderRadius: 7, boxShadow: "0 0 0 2px var(--card)", transition: "width .6s cubic-bezier(.2,.8,.2,1)" }} />
        ))}
      </div>
      <div className="l3 tab" style={{ position: "relative", height: 14, fontSize: 11 }}>
        {g?.[0] != null && <span style={{ position: "absolute", left: pct(g[0]), transform: "translateX(-50%)" }}>{fmt(g[0])}</span>}
        {g?.[1] != null && <span style={{ position: "absolute", left: pct(g[1]), transform: "translateX(-50%)" }}>{fmt(g[1])}</span>}
      </div>
      <span className="l2" style={{ fontSize: 13 }}>Meta {textoRango(g, u)}</span>
      <span style={{ fontSize: 13 }}>{lineas.join(" · ")}</span>
    </div>
  );
}

function Secundarios({ dia, ctx }: { dia: Dia; ctx: Ctx }) {
  const metas = metasDe(ctx.datos.metas, dia.fecha);
  const n = dia.comidas.length;
  const gs = dia.comidas.filter((c) => c.gluten === "si").length;
  const gt = dia.comidas.filter((c) => c.gluten === "trazas").length;
  const gu = dia.comidas.filter((c) => c.gluten === "desconocido").length;
  const gluten = [gs && `en ${gs} de ${plural(n, "comida", "comidas")}`, gt && `trazas en ${gt}`, gu && `sin confirmar en ${gu}`].filter(Boolean).join(" · ") || "No";
  const lt = dia.tot.lactosa;
  const lacteosSinDato = dia.comidas.filter((c) => c.lacteoSinLactosa).length;
  const lactosa = [
    lt.v == null ? "Sin dato" : `${lt.faltan ? "≥ " : ""}${fmt(lt.v, 1)} g acumulados`,
    lacteosSinDato ? `lácteos sin dato en ${plural(lacteosSinDato, "comida", "comidas")}` : "",
  ].filter(Boolean).join(" · ");

  return (
    <div className="tarjeta" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <span style={{ fontSize: 15, fontWeight: 600 }}>Otros nutrientes</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
        {SECUNDARIOS.map((k) => {
          const g = metas[k];
          const t = dia.tot[k];
          const u = unidad(k);
          const dec = k === "cafeina" ? 0 : 1;
          const st = estado(t.v, g);
          const sinDato = t.v == null;
          const escala = escalaDe(g, t.v ?? 0);
          const c = relleno(st);
          return (
            <div key={k} className="celda" title={ESTILO[st].label || "Sin marca"} style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <span className="l2" style={{ fontSize: 13 }}>{NOMBRE[k]}</span>
                <Bolita estilo={punto(st)} />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span className="tab" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.01em", color: sinDato ? "var(--label3)" : "var(--label)" }}>
                  {sinDato ? "Sin dato" : (t.faltan ? "≥ " : "") + fmt(t.v, dec)}
                </span>
                {!sinDato && <span className="l2" style={{ fontSize: 13 }}>{u}</span>}
              </div>
              <div className="barra" style={{ height: 8, borderRadius: 4, margin: "4px 0 2px" }}>
                <Zonas zonas={zonas(g, escala)} />
                <div style={{
                  left: 0, borderRadius: 4, transition: "width .6s cubic-bezier(.2,.8,.2,1)",
                  width: sinDato ? "0%" : (Math.max(0, Math.min(1, t.v! / escala)) * 100).toFixed(2) + "%",
                  background: t.faltan ? trama(c) : c, boxShadow: t.faltan ? `inset 0 0 0 1px ${c}` : "none",
                }} />
              </div>
              <span className="l3" style={{ fontSize: 12 }}>{textoRango(g, u)}</span>
              <span className="l2" style={{ fontSize: 12 }}>
                {sinDato ? "falta dato en " + (n === 1 ? "la comida" : "todas las comidas") : textoFaltan(t.faltan)}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ borderTop: "1px solid var(--sep)", paddingTop: 14, display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "6px 16px", fontSize: 13 }}>
        <span className="l2">Gluten</span><span>{gluten}</span>
        <span className="l2">Lactosa</span><span>{lactosa}</span>
      </div>
    </div>
  );
}

function Registro({ dia, movil, abierta, setAbierta, abiertoHoy }: { dia: Dia; movil: boolean; abierta: string | null; setAbierta: (id: string | null) => void; abiertoHoy: boolean }) {
  const n = dia.comidas.length;
  const sinHora = dia.historico && dia.comidas.every((c) => !c.hora);
  return (
    <div className="tarjeta" style={{ padding: "8px 24px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 0 6px", gap: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.01em" }}>Registro</span>
        <span className="l2" style={{ fontSize: 13 }}>{abiertoHoy ? `${n} de 3` : plural(n, "comida", "comidas")}</span>
      </div>
      {dia.comidas.map((c, i) => (
        <FilaComida key={c.id} c={c} primera={i === 0} movil={movil} abierta={abierta === c.id} alternar={() => setAbierta(abierta === c.id ? null : c.id)} />
      ))}
      {sinHora && (
        <div className="l3" style={{ fontSize: 12, padding: "4px 0 8px" }}>
          Día importado del histórico: las comidas no tienen hora y el margen de error se estima en ±25 %.
        </div>
      )}
    </div>
  );
}

function FilaComida({ c, primera, movil, abierta, alternar }: { c: Comida; primera: boolean; movil: boolean; abierta: boolean; alternar: () => void }) {
  const chips: string[] = [];
  if (c.gluten === "si") chips.push("Gluten");
  if (c.gluten === "trazas") chips.push("Trazas de gluten");
  if (c.n.lactosa && c.n.lactosa > 0) chips.push(`Lactosa ${fmt(c.n.lactosa, 1)} g`);
  else if (c.lacteoSinLactosa) chips.push("Lácteo · lactosa sin dato");
  const faltan = c.incompletos.filter((k) => MINUSCULA[k]).map((k) => MINUSCULA[k]);
  const notas = [
    faltan.length ? "Sin dato: " + faltan.join(", ") : "",
    c.glutenDe.length ? "Gluten: " + c.glutenDe.join(", ") : "",
    c.gluten === "desconocido" ? "Gluten sin confirmar" : "",
    c.notas,
  ].filter(Boolean);

  return (
    <div style={{ borderTop: primera ? "none" : "1px solid var(--sep)" }}>
      <button onClick={alternar} aria-expanded={abierta} style={{ width: "100%", display: "grid", gridTemplateColumns: movil ? "40px minmax(0,1fr) auto 12px" : "56px minmax(0,1fr) auto 16px", gap: 12, alignItems: "center", padding: "14px 0", background: "none", border: "none", textAlign: "left", cursor: "pointer", font: "inherit" }}>
        <span className="l2 tab" style={{ fontSize: 15 }}>{c.hora ?? "—"}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.3, textWrap: "pretty" }}>{c.descripcion}</span>
          {chips.length > 0 && (
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {chips.map((x) => <span key={x} className="chip">{x}</span>)}
            </span>
          )}
        </span>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, whiteSpace: "nowrap" }}>
          <span className="tab">
            <span style={{ fontSize: 17, fontWeight: 600 }}>{fmt(c.n.kcal)}</span>
            <span className="l2" style={{ fontSize: 13 }}> ± {fmt(c.err.kcal)} kcal</span>
          </span>
          <span className="l2 tab" style={{ fontSize: 13 }}>{fmt(c.n.prot, 1)} g proteína</span>
        </span>
        <span className="l3 giro" style={{ fontSize: 20, textAlign: "center", transform: `rotate(${abierta ? 90 : 0}deg)` }}>›</span>
      </button>
      {abierta && (
        <div style={{ padding: "0 0 16px" }}>
          <div className="celda tab" style={{ padding: movil ? "10px 12px" : "12px 14px", display: "grid", gridTemplateColumns: movil ? "minmax(0,1fr) auto 40px 52px" : "minmax(0,1fr) auto 56px 64px", gap: movil ? "8px 8px" : "8px 12px", fontSize: 13 }}>
            {["Ingrediente", "Cantidad", "kcal", "Prot."].map((h, i) => (
              <span key={h} className="l3" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", textAlign: i ? "right" : "left" }}>{h}</span>
            ))}
            {c.items.map((it, i) => (
              <Fragmento key={i} cols={[it.nombre, it.cantidad, fmt(it.kcal), it.prot == null ? "—" : fmt(it.prot, 1) + " g"]} />
            ))}
          </div>
          {notas.length > 0 && <div className="l2" style={{ fontSize: 12, padding: "8px 2px 0" }}>{notas.join(" · ")}</div>}
        </div>
      )}
    </div>
  );
}

function Fragmento({ cols }: { cols: string[] }) {
  return (
    <>
      <span style={{ minWidth: 0 }}>{cols[0]}</span>
      <span className="l2" style={{ textAlign: "right" }}>{cols[1]}</span>
      <span style={{ textAlign: "right" }}>{cols[2]}</span>
      <span style={{ textAlign: "right" }}>{cols[3]}</span>
    </>
  );
}
