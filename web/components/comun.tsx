import type { ReactNode } from "react";
import type { Zona } from "@/lib/formato";

export function Encabezado({ kicker, titulo, children, extra }: { kicker: string; titulo: string; children?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="encabezado">
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span className="kicker">{kicker}</span>
        <span className="titulo">{titulo}</span>
        {extra}
      </div>
      {children}
    </div>
  );
}

export function Navegar({ antes, despues, puedeAntes, puedeDespues, volver, textoVolver, etiqueta }: {
  antes: () => void; despues: () => void; puedeAntes: boolean; puedeDespues: boolean;
  volver?: () => void; textoVolver?: string; etiqueta: [string, string];
}) {
  return (
    <div className="navegar">
      <button className="btn-circ" onClick={antes} disabled={!puedeAntes} aria-label={etiqueta[0]} style={{ paddingRight: 2 }}>‹</button>
      {volver && <button className="btn-texto" onClick={volver}>{textoVolver}</button>}
      <button className="btn-circ" onClick={despues} disabled={!puedeDespues} aria-label={etiqueta[1]} style={{ paddingLeft: 2 }}>›</button>
    </div>
  );
}

export function Zonas({ zonas }: { zonas: Zona[] }) {
  return (
    <>
      {zonas.map((z, i) => (
        <div key={i} style={{ left: z.l, width: z.w, background: z.bg }} />
      ))}
    </>
  );
}

export function Bolita({ estilo, size = 8 }: { estilo: { background: string; borderColor: string }; size?: number }) {
  return <span className="bolita" style={{ ...estilo, width: size, height: size }} />;
}

export const trama = (c: string, paso = 4) => `repeating-linear-gradient(135deg,${c} 0px,${c} 2px,transparent 2px,transparent ${paso}px)`;
