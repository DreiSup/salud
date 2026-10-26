// Lector de CSV (RFC 4180): comas, comillas dobles y saltos de línea dentro de comillas.
export function parseCsv(texto: string): Record<string, string>[] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else comillas = false;
      } else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }
  const [cabecera, ...resto] = filas.filter((f) => !(f.length === 1 && f[0] === ""));
  if (!cabecera) return [];
  return resto.map((f) => Object.fromEntries(cabecera.map((col, j) => [col, f[j] ?? ""])));
}
