"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DOW, ESTADO_DIA, diaMes, diaYMes, estado, fechaCorta, fmt, lunes, metasDe, plural, relleno, sumar, textoRango, type Rango } from "@/lib/formato";
import type { Dia } from "@/lib/tipos";
import { trama } from "./comun";
import type { Ctx } from "./Panel";

// Mosaico tipo actividad de GitHub (prototipo «Alimentación v3» de Claude Design): una casilla por día,
// semanas en columnas y días en filas. En móvil, la variante recomendada: scroll horizontal anclado en la semana actual.

type Modo = "registro" | "energia" | "proteina" | "meta";
const MODOS: [Modo, string][] = [["registro", "Registro"], ["energia", "Energía"], ["proteina", "Proteína"], ["meta", "En meta"]];
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** Intensidades de verde: sin registro, 1, 2 y 3 comidas, y día cerrado como completo. */
const NIVEL = [
  "var(--fill)",
  "color-mix(in srgb, var(--ok) 30%, transparent)",
  "color-mix(in srgb, var(--ok) 55%, transparent)",
  "color-mix(in srgb, var(--ok) 78%, transparent)",
  "var(--ok)",
];
const LEYENDA: Record<Modo, { antes: string; despues: string; muestras: { bg: string; txt: string }[] }> = {
  registro: { antes: "Menos", despues: "Más", muestras: NIVEL.map((bg) => ({ bg, txt: "" })) },
  energia: {
    antes: "", despues: "",
    muestras: [
      { bg: "var(--fill)", txt: "Sin registro" }, { bg: "var(--neutral)", txt: "Por debajo del mínimo" }, { bg: "var(--ok)", txt: "En rango" },
      { bg: "var(--warn)", txt: "Cerca del tope" }, { bg: "var(--over)", txt: "Por encima" },
    ],
  },
  proteina: { antes: "", despues: "", muestras: [] },
  meta: {
    antes: "", despues: "",
    muestras: [{ bg: "var(--fill)", txt: "Sin registro" }, { bg: "var(--neutral)", txt: "Ninguna" }, { bg: NIVEL[2], txt: "Una de dos" }, { bg: "var(--ok)", txt: "Las dos" }],
  },
};
LEYENDA.proteina = LEYENDA.energia;

const enRango = (v: number | null, g: Rango | null) => v != null && !!g && (g[0] == null || v >= g[0]) && (g[1] == null || v <= g[1]);
const etiqueta: CSSProperties = { fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap", display: "flex", alignItems: "center", minWidth: 0 };

export default function VistaAnio({ ctx, periodo, setPeriodo }: { ctx: Ctx; periodo: string; setPeriodo: (p: string) => void }) {
  const { datos, hoy, movil, irADia } = ctx;
  const [modo, setModo] = useState<Modo>("registro");
  const [encima, setEncima] = useState<string | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const scroll = useRef<HTMLDivElement>(null);

  // En móvil el mosaico abre en la semana actual (a la derecha).
  useEffect(() => {
    const el = scroll.current;
    if (el && movil) el.scrollLeft = el.scrollWidth;
  }, [movil, periodo]);

  const anios: string[] = [];
  for (let a = Number(hoy.slice(0, 4)); a >= Number(datos.inicio.slice(0, 4)); a--) anios.push(String(a));
  const per = periodo === "12m" || anios.includes(periodo) ? periodo : "12m";
  const [ini, fin] = per === "12m" ? [sumar(hoy, -364), hoy] : [`${per}-01-01`, `${per}-12-31`];
  const semanas: string[] = [];
  for (let w = lunes(ini); w <= lunes(fin); w = sumar(w, 7)) semanas.push(w);
  const N = semanas.length;

  const estadoTexto = (dia: Dia) => (!dia.estado && dia.fecha === hoy ? `abierto · ${dia.comidas.length} de 3 comidas` : ESTADO_DIA[dia.estado ?? "sincerrar"].toLowerCase());
  const abiertoHoy = (dia: Dia) => !dia.estado && dia.fecha === hoy;
  const textoDia = (f: string) => {
    if (f < datos.inicio) return `${fechaCorta(f)} · antes del registro`;
    const dia = datos.dias[f];
    if (!dia) return `${fechaCorta(f)} · sin registro`;
    const t = dia.tot;
    const incompleto = (t.kcal.faltan || t.prot.faltan) && !abiertoHoy(dia);
    return `${fechaCorta(f)} · ${t.kcal.faltan ? "≥ " : ""}${fmt(t.kcal.v)} kcal · ${t.prot.faltan ? "≥ " : ""}${fmt(t.prot.v, 1)} g · ${estadoTexto(dia)}${incompleto ? " · total incompleto" : ""}`;
  };

  const casilla = (f: string, col: number) => {
    const fuera = f < ini || f > fin || f > hoy;
    const antes = f < datos.inicio;
    const dia = datos.dias[f];
    let fondo = "var(--fill)";
    let sombra = "none";
    if (dia) {
      const g = metasDe(datos.metas, f);
      const n = dia.comidas.length;
      let c: string;
      let falta = false;
      if (modo === "registro") c = NIVEL[dia.estado === "completo" ? 4 : Math.min(n, 3)];
      else if (modo === "energia") {
        c = relleno(estado(dia.tot.kcal.v, g.kcal));
        falta = dia.tot.kcal.faltan > 0;
      } else if (modo === "proteina") {
        c = relleno(estado(dia.tot.prot.v, g.prot));
        falta = dia.tot.prot.faltan > 0;
      } else {
        const k = enRango(dia.tot.kcal.v, g.kcal);
        const p = enRango(dia.tot.prot.v, g.prot);
        c = k && p ? "var(--ok)" : k || p ? NIVEL[2] : "var(--neutral)";
        falta = dia.tot.kcal.faltan > 0 || dia.tot.prot.faltan > 0;
      }
      if ((dia.estado !== "completo" || falta) && !abiertoHoy(dia)) {
        fondo = `${trama(c)}, var(--fill)`;
        sombra = `inset 0 0 0 1.5px ${c}`;
      } else fondo = c;
    }
    const activa = !fuera && !antes;
    const marcada = movil ? elegido === f : encima === f;
    const lado = col < 6 ? "izq" : col > N - 7 ? "der" : "centro";
    return (
      <div
        key={f}
        onMouseEnter={activa && !movil ? () => setEncima(f) : undefined}
        onMouseLeave={activa && !movil ? () => setEncima((e) => (e === f ? null : e)) : undefined}
        onClick={activa ? (movil ? () => setElegido(elegido === f ? null : f) : () => irADia(f)) : undefined}
        style={{
          position: "relative", aspectRatio: "1 / 1", borderRadius: movil ? 3 : 4, background: fondo, boxShadow: sombra,
          outline: marcada ? "2px solid var(--label)" : f === hoy ? "2px solid var(--accent)" : "none", outlineOffset: 1,
          visibility: fuera ? "hidden" : "visible", opacity: antes ? 0.45 : 1, cursor: activa ? "pointer" : "default", minWidth: 0,
        }}
      >
        {!movil && encima === f && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", left: lado === "izq" ? 0 : lado === "der" ? "auto" : "50%", right: lado === "der" ? 0 : "auto",
            transform: lado === "centro" ? "translateX(-50%)" : "none", background: "var(--label)", color: "var(--bg)", fontSize: 12, fontWeight: 500, lineHeight: 1.3,
            padding: "6px 10px", borderRadius: 8, whiteSpace: "nowrap", zIndex: 5, pointerEvents: "none", boxShadow: "0 4px 14px rgba(0,0,0,.18)",
          }}>{textoDia(f)}</div>
        )}
      </div>
    );
  };

  const etiquetaMes = (w: string) => {
    for (let i = 0; i < 7; i++) {
      const d = sumar(w, i);
      if (diaMes(d) === 1 && d >= ini && d <= fin) return MES[Number(d.slice(5, 7)) - 1];
    }
    return "";
  };

  // Racha actual (cuenta desde hoy, o desde ayer si hoy aún no hay nada) y racha más larga.
  const registrados = Object.keys(datos.dias).filter((f) => f >= ini && f <= fin && f <= hoy).length;
  let actual = 0;
  for (let d = datos.dias[hoy] ? hoy : sumar(hoy, -1); datos.dias[d]; d = sumar(d, -1)) actual++;
  let mejor = 0, desde = "", hasta = "", racha = 0, rIni = "";
  for (let d = datos.inicio; d <= hoy; d = sumar(d, 1)) {
    if (datos.dias[d]) {
      if (!racha) rIni = d;
      racha++;
      if (racha > mejor) [mejor, desde, hasta] = [racha, rIni, d];
    } else racha = 0;
  }
  const textoMejor = desde ? (desde.slice(5, 7) === hasta.slice(5, 7) ? `${diaMes(desde)}–${diaYMes(hasta)}` : `${diaYMes(desde)} – ${diaYMes(hasta)}`) : "";

  const g = metasDe(datos.metas, hoy);
  const nota: Record<Modo, string> = {
    registro: "Comidas registradas por día; el tono más intenso es un día completo.",
    energia: `Meta actual ${textoRango(g.kcal, "kcal")}. Cada día, con su meta vigente.`,
    proteina: `Meta actual ${textoRango(g.prot, "g")}. Cada día, con su meta vigente.`,
    meta: "Kcal y proteína dentro de su rango.",
  };
  const ley = LEYENDA[modo];
  const conScroll = movil;
  // Con scroll, la columna de «lun / mié / vie» se queda fija a la izquierda.
  const fija: CSSProperties = conScroll ? { ...etiqueta, position: "sticky", left: 0, zIndex: 1, background: "var(--card)", boxShadow: "-4px 0 0 var(--card)", alignSelf: "stretch" } : etiqueta;
  const inicioTxt = `${datos.inicio.slice(8)}/${datos.inicio.slice(5, 7)}/${datos.inicio.slice(0, 4)}`;

  return (
    <div className="columna">
      <div className="encabezado">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="kicker">Constancia</span>
          <span className="titulo">{per === "12m" ? "Último año" : per}</span>
        </div>
        <div className="segmentado">
          {[["12m", "Último año"], ...anios.map((a) => [a, a])].map(([id, txt]) => (
            <button key={id} aria-pressed={per === id} onClick={() => setPeriodo(id)} style={{ padding: "7px 14px", minHeight: 36 }}>{txt}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 32px", alignItems: "baseline", padding: "0 4px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="redondo" style={{ fontSize: 28, fontWeight: 700 }}>{fmt(registrados)}</span>
          <span className="l2" style={{ fontSize: 15 }}>{registrados === 1 ? "día registrado" : "días registrados"}{per === "12m" ? " en el último año" : ` en ${per}`}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="l2" style={{ fontSize: 15 }}>Racha actual</span>
          <span className="tab" style={{ fontSize: 17, fontWeight: 600 }}>{plural(actual, "día", "días")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="l2" style={{ fontSize: 15 }}>Racha más larga</span>
          <span className="tab" style={{ fontSize: 17, fontWeight: 600 }}>{plural(mejor, "día", "días")}</span>
          <span className="l3" style={{ fontSize: 13 }}>{textoMejor}</span>
        </div>
      </div>

      <div className="tarjeta" style={{ padding: movil ? "16px 14px" : "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="segmentado">
            {MODOS.map(([id, txt]) => (
              <button key={id} aria-pressed={modo === id} onClick={() => setModo(id)} style={{ padding: "6px 12px", minHeight: 32, whiteSpace: "nowrap" }}>{txt}</button>
            ))}
          </div>
          <span className="l2" style={{ fontSize: 13 }}>{nota[modo]}</span>
        </div>

        <div ref={scroll} style={{ overflowX: conScroll ? "auto" : "visible", margin: "0 -4px", padding: `${movil ? 0 : 34}px 4px 4px` }}>
          <div className="l3" style={{
            display: "grid", gridTemplateColumns: `${movil ? 24 : 30}px repeat(${N},${conScroll ? "14px" : "minmax(0,1fr)"})`,
            gridTemplateRows: "auto repeat(7,auto)", gridAutoFlow: "column", gap: 3, width: conScroll ? "max-content" : "100%",
          }}>
            {["", "lun", "", "mié", "", "vie", "", ""].map((t, i) => <span key={i} style={fija}>{t}</span>)}
            {semanas.map((w, col) => {
              let mes = etiquetaMes(w);
              // Si el periodo empieza a mitad de mes y el siguiente no asoma enseguida, se rotula la primera columna.
              if (col === 0 && !mes && !semanas.slice(1, 3).some(etiquetaMes)) mes = MES[Number(ini.slice(5, 7)) - 1];
              return [<span key={w + "m"} style={etiqueta}>{mes}</span>, ...DOW.map((_, i) => casilla(sumar(w, i), col))];
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "10px 24px", alignItems: "center" }}>
          <div className="l3" style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", fontSize: 12, alignItems: "center" }}>
            <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: trama("var(--neutral)"), boxShadow: "inset 0 0 0 1.5px var(--neutral)" }} />Parcial, sin cerrar o total incompleto
            </span>
            <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--fill)", outline: "2px solid var(--accent)", outlineOffset: 1 }} />Hoy
            </span>
            <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--fill)", opacity: 0.45 }} />Antes del {inicioTxt}
            </span>
          </div>
          <div className="l2" style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", fontSize: 12, alignItems: "center" }}>
            {ley.antes && <span>{ley.antes}</span>}
            {ley.muestras.map((m, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: m.bg }} />{m.txt}
              </span>
            ))}
            {ley.despues && <span>{ley.despues}</span>}
          </div>
        </div>
      </div>

      {movil && elegido && (
        <div className="tarjeta" style={{ borderRadius: 16, padding: "12px 12px 12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span className="tab" style={{ fontSize: 15, minWidth: 0 }}>{textoDia(elegido)}</span>
          <button onClick={() => irADia(elegido)} style={{ flex: "none", height: 44, borderRadius: 22, border: "none", background: "var(--fill)", color: "var(--accent)", fontSize: 15, fontWeight: 600, cursor: "pointer", padding: "0 16px" }}>Abrir día</button>
        </div>
      )}
      <span className="l3" style={{ fontSize: 12, padding: "0 4px" }}>
        {movil ? "Desliza para ver semanas anteriores. Toca una casilla para ver el día." : "Pasa el ratón por una casilla para ver el día; haz clic para abrirlo."}
      </span>
    </div>
  );
}
