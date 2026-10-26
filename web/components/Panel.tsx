"use client";
import { useCallback, useEffect, useState } from "react";
import { hoyMadrid, sumar } from "@/lib/formato";
import type { Datos } from "@/lib/tipos";
import VistaDia from "./VistaDia";
import VistaMes from "./VistaMes";
import VistaMetas from "./VistaMetas";
import VistaSemana from "./VistaSemana";
import VistaTendencias from "./VistaTendencias";

export type Vista = "dia" | "semana" | "mes" | "tendencias" | "metas";
const PESTANAS: [Vista, string][] = [["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"], ["tendencias", "Tendencias"], ["metas", "Metas"]];
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export interface Ctx {
  datos: Datos;
  hoy: string;
  movil: boolean;
  irADia: (fecha: string) => void;
}

/** Estado de la vista en la URL (#/dia/2026-10-26) para que recargar o compartir no lo pierda. */
function leerHash(hoy: string): { vista: Vista; fecha: string; periodo: number } {
  const [, v, arg] = window.location.hash.split("/");
  const vista = (PESTANAS.find(([id]) => id === v)?.[0] ?? "dia") as Vista;
  let fecha = hoy;
  if (arg && RE_FECHA.test(arg) && arg <= hoy) fecha = arg;
  else if (arg && /^\d{4}-\d{2}$/.test(arg)) fecha = `${arg}-01`;
  const periodo = [7, 30, 90].includes(Number(arg)) ? Number(arg) : 30;
  return { vista, fecha, periodo };
}

export default function Panel({ datos }: { datos: Datos }) {
  const [hoy, setHoy] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>("dia");
  const [fecha, setFecha] = useState("");
  const [periodo, setPeriodo] = useState(30);
  const [ancho, setAncho] = useState(1200);

  useEffect(() => {
    const h = hoyMadrid();
    const inicial = leerHash(h);
    setHoy(h);
    setVista(inicial.vista);
    setFecha(inicial.fecha);
    setPeriodo(inicial.periodo);
    const medir = () => setAncho(window.innerWidth);
    medir();
    window.addEventListener("resize", medir);
    const alVolver = () => {
      const s = leerHash(h);
      setVista(s.vista);
      setFecha(s.fecha);
      setPeriodo(s.periodo);
    };
    window.addEventListener("popstate", alVolver);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("popstate", alVolver);
    };
  }, []);

  useEffect(() => {
    if (!hoy) return;
    const arg = vista === "dia" || vista === "semana" ? fecha : vista === "mes" ? fecha.slice(0, 7) : vista === "tendencias" ? String(periodo) : "";
    const hash = `#/${vista}${arg ? "/" + arg : ""}`;
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
  }, [hoy, vista, fecha, periodo]);

  const irADia = useCallback((f: string) => {
    setFecha(f);
    setVista("dia");
    window.scrollTo({ top: 0 });
  }, []);

  // Flechas del teclado en la vista Día.
  useEffect(() => {
    if (!hoy || vista !== "dia") return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && fecha > datos.inicio) setFecha(sumar(fecha, -1));
      if (e.key === "ArrowRight" && fecha < hoy) setFecha(sumar(fecha, 1));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [hoy, vista, fecha, datos.inicio]);

  const movil = ancho < 720;
  const sello = "Datos de las " + datos.generado.slice(11, 16) + (hoy && datos.generado.slice(0, 10) !== hoy ? ` del ${Number(datos.generado.slice(8, 10))}/${Number(datos.generado.slice(5, 7))}` : "");
  const cambiar = (v: Vista) => {
    setVista(v);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="marco">
      {movil ? (
        <div className="vidrio cabecera-movil">
          <span style={{ fontSize: 17, fontWeight: 600 }}>Alimentación</span>
          <span className="l3" style={{ fontSize: 12 }}>{sello}</span>
        </div>
      ) : (
        <div className="vidrio cabecera">
          <div className="cabecera-in">
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.01em" }}>Alimentación</span>
              <span className="l3" style={{ fontSize: 12 }}>Solo lectura · DreiSup/salud</span>
            </div>
            <nav className="segmentado">
              {PESTANAS.map(([id, txt]) => (
                <button key={id} aria-pressed={vista === id} onClick={() => cambiar(id)}>{txt}</button>
              ))}
            </nav>
            <div className="l3" style={{ justifySelf: "end", fontSize: 12 }}>{sello}</div>
          </div>
        </div>
      )}

      <main className="contenido" style={{ padding: movil ? "16px 16px 28px" : "28px 32px 56px" }}>
        {!hoy ? (
          <Cargando />
        ) : (
          (() => {
            const ctx: Ctx = { datos, hoy, movil, irADia };
            if (vista === "semana") return <VistaSemana ctx={ctx} ancla={fecha} setAncla={setFecha} />;
            if (vista === "mes") return <VistaMes ctx={ctx} ancla={fecha} setAncla={setFecha} />;
            if (vista === "tendencias") return <VistaTendencias ctx={ctx} periodo={periodo} setPeriodo={setPeriodo} />;
            if (vista === "metas") return <VistaMetas ctx={ctx} />;
            return <VistaDia key={fecha} ctx={ctx} fecha={fecha} setFecha={setFecha} />;
          })()
        )}
      </main>

      {movil && (
        <nav className="vidrio pestanas-movil">
          {PESTANAS.map(([id, txt]) => (
            <button key={id} onClick={() => cambiar(id)} style={{ color: vista === id ? "var(--accent)" : "var(--label2)" }} aria-current={vista === id ? "page" : undefined}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: vista === id ? "var(--accent)" : "transparent" }} />
              <span>{txt}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function Cargando() {
  return (
    <div className="columna cargando">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="esqueleto" style={{ width: 80, height: 12 }} />
        <div className="esqueleto" style={{ width: 220, height: 32 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 16 }}>
        <div className="tarjeta" style={{ height: 240 }} />
        <div className="tarjeta" style={{ height: 240 }} />
      </div>
    </div>
  );
}
