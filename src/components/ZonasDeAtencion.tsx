import { Target } from "lucide-react";
import type { ZonaFragilidad, CruceCronico } from "@/lib/excelParser";
import { IndiceFragilidad } from "@/components/IndiceFragilidad";
import { PanelEventosCronicos } from "@/components/PanelEventosCronicos";

interface ZonasDeAtencionProps {
  indiceFragilidad: ZonaFragilidad[];
  crucesCronicos: CruceCronico[];
}

/**
 * Unifica la EXPERIENCIA VISUAL de IndiceFragilidad y PanelEventosCronicos —
 * no la lógica. Ambos miden cosas distintas y complementarias (confirmado con
 * datasets sintéticos: una zona puede tener fragilidad muy alta con recurrencia
 * nula, y viceversa), así que se muestran lado a lado, cada uno con su propio
 * ranking intacto, en vez de fusionarse en un único score. Ninguno de los dos
 * componentes hijos se modifica — siguen calculando y ordenando exactamente
 * igual que antes (datos.indiceFragilidad / datos.crucesCronicos, sin tocar).
 */
export function ZonasDeAtencion({ indiceFragilidad, crucesCronicos }: ZonasDeAtencionProps) {
  if (indiceFragilidad.length < 3 && crucesCronicos.length === 0) return null;

  return (
    <div className="presentation-hide print:hidden">
      <div className="flex items-center gap-2 mb-1.5">
        <Target className="h-5 w-5 text-red-500 shrink-0" />
        <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">Zonas de Atención</h2>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 ml-7 max-w-3xl leading-relaxed">
        Dos formas distintas de mirar el mismo problema — pueden señalar zonas diferentes, y las dos
        son correctas: <strong className="text-slate-600 dark:text-slate-300">Fragilidad</strong> pondera
        volumen total y tiempos de respuesta lentos, mientras que{" "}
        <strong className="text-slate-600 dark:text-slate-300">Recurrencia</strong> detecta un problema
        puntual que reaparece mes a mes, sin importar cuán grande sea el volumen total de esa zona.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <IndiceFragilidad indiceFragilidad={indiceFragilidad} />
        <PanelEventosCronicos crucesCronicos={crucesCronicos} />
      </div>
    </div>
  );
}
