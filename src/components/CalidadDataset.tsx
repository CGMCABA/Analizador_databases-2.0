import { Database, CheckCircle, AlertCircle, AlertTriangle, Lightbulb, Ban } from "lucide-react";

interface CalidadDatasetData {
  pctSinFecha: number;
  pctSinCategoria: number;
  pctSinUbicacion: number;
  pctSinHora: number;
  pctSinResolucion: number;
  columnasDetectadas: string[];
  sugerencias: string[];
  tieneColumnaProgramacion?: boolean;
  registrosSinFechaValida?: number;
  modoHojaUnica?: boolean;
}

interface CalidadDatasetProps {
  calidadDataset: CalidadDatasetData;
  tieneColumnaProgramacion?: boolean;
  etiquetaStatus?: string;
}

interface CampoCalidad {
  label: string;
  pctSin: number;
  descripcion: string;
}

function colorPorPct(pctSin: number): {
  bar: string;
  icono: "ok" | "warn" | "error";
  text: string;
} {
  if (pctSin <= 5) return { bar: "bg-emerald-500", icono: "ok", text: "text-emerald-600 dark:text-emerald-400" };
  if (pctSin <= 20) return { bar: "bg-amber-500", icono: "warn", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-red-500", icono: "error", text: "text-red-600 dark:text-red-400" };
}

export function CalidadDataset({ calidadDataset, tieneColumnaProgramacion, etiquetaStatus = "Resuelto" }: CalidadDatasetProps) {
  const conProg = tieneColumnaProgramacion || calidadDataset.tieneColumnaProgramacion;
  const labelResolucion = etiquetaStatus === "Resuelto" ? "Resolución" : "Finalización";
  const excluidos = calidadDataset.registrosSinFechaValida ?? 0;

  const campos: CampoCalidad[] = [
    { label: "Fecha", pctSin: calidadDataset.pctSinFecha, descripcion: "Registros sin fecha detectada" },
    { label: "Categoría / Motivo", pctSin: calidadDataset.pctSinCategoria, descripcion: "Registros sin categoría principal" },
    { label: "Ubicación (calles)", pctSin: calidadDataset.pctSinUbicacion, descripcion: "Registros sin datos de calles" },
    {
      label: conProg ? "Hora (No Programados)" : "Hora de ingreso",
      pctSin: calidadDataset.pctSinHora,
      descripcion: conProg
        ? "Sucesos No Programados sin hora registrada"
        : "Registros sin hora registrada",
    },
    { label: labelResolucion, pctSin: calidadDataset.pctSinResolucion, descripcion: `Registros sin ${etiquetaStatus === "Resuelto" ? "resolución" : "finalización"} o cierre` },
  ];

  const esSoloBuena =
    calidadDataset.sugerencias.length === 1 &&
    calidadDataset.sugerencias[0].startsWith("El dataset tiene buena calidad");

  return (
    <div className="bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-5 animate-fade-in-up delay-75">
      <div className="flex items-center gap-2 mb-1">
        <Database className="h-4 w-4 text-blue-500" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Calidad del dataset</h3>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 ml-6">
        Completitud de los campos clave · porcentaje de registros sin datos por campo
        {conProg && (
          <span className="ml-1 text-orange-500 dark:text-orange-400 font-medium">· Hora medida solo sobre No Programados</span>
        )}
      </p>

      {excluidos > 0 && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mb-4 text-xs text-red-700 dark:text-red-400">
          <Ban className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>{excluidos.toLocaleString("es-AR")}</strong> registro{excluidos !== 1 ? "s" : ""} con fecha inválida excluido{excluidos !== 1 ? "s" : ""} del análisis
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {campos.map((campo) => {
          const col = colorPorPct(campo.pctSin);
          const pctCompleto = 100 - campo.pctSin;
          return (
            <div key={campo.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  {col.icono === "ok" && <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />}
                  {col.icono === "warn" && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                  {col.icono === "error" && <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />}
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {campo.label}
                  </span>
                </div>
                <span className={`text-xs font-semibold ${col.text}`}>
                  {pctCompleto}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-[#252d3d] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${col.bar}`}
                  style={{ width: `${pctCompleto}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {campo.pctSin > 0
                  ? `${campo.pctSin}% de registros sin este campo`
                  : "Completitud total"}
              </p>
            </div>
          );
        })}
      </div>

      {calidadDataset.sugerencias.length > 0 && (
        <div className={`rounded-lg border p-4 ${esSoloBuena
          ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
          : "bg-slate-50 dark:bg-[#252d3d]/50 border-slate-200 dark:border-[#1f2535]"
          }`}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className={`h-4 w-4 shrink-0 ${esSoloBuena ? "text-emerald-500" : "text-amber-500"}`} />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {esSoloBuena ? "Estado del dataset" : "Recomendaciones para mejorar el dataset"}
            </p>
          </div>
          <div className="space-y-2">
            {calidadDataset.sugerencias.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                {!esSoloBuena && (
                  <span className="text-amber-400 dark:text-amber-500 mt-0.5 shrink-0 text-xs">–</span>
                )}
                <p className={`text-xs leading-relaxed ${esSoloBuena
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-slate-600 dark:text-slate-300"
                  }`}>
                  {s}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
