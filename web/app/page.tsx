import Panel from "@/components/Panel";
import { cargarDatos } from "@/lib/cargar";

// Los datos se leen de datos/*.csv en el build: cada push a main vuelve a publicar la web.
export default function Pagina() {
  return <Panel datos={cargarDatos()} />;
}
