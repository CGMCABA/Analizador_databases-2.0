import {
  AlertTriangle, Clock, User, TrendingDown, MapPin, Database, Lightbulb,
} from "lucide-react";
import { Recomendacion, PrioridadRecomendacion } from "@/lib/semaforoRecomendaciones";

interface RecomendacionesOperativasProps {
  recomendaciones: Recomendacion[];
}

const ICONO_MAP = {
  alerta: AlertTriangle,
  reloj: Clock,
  usuario: User,
  tendencia: TrendingDown,
  ubicacion: MapPin,
  datos: Database,
};

const PRIORIDAD_CONFIG: Record<PrioridadRecomendacion, { badge: string; dot: string; label: string; accentBorder: string; hoverBg: string }> = {
  alta: {
    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800",
    dot: "#e74c3c",
    label: "Alta prioridad",
    accentBorder: "border-l-red-400 dark:border-l-red-500",
    hoverBg: "hover:bg-red-50/60 dark:hover:bg-red-900/10",
  },
  media: {
    badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    dot: "#f39c12",
    label: "Prioridad media",
    accentBorder: "border-l-amber-400 dark:border-l-amber-500",
    hoverBg: "hover:bg-amber-50/60 dark:hover:bg-amber-900/10",
  },
  baja: {
    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    dot: "#3b82f6",
    label: "Prioridad baja",
    accentBorder: "border-l-blue-400 dark:border-l-blue-500",
    hoverBg: "hover:bg-blue-50/60 dark:hover:bg-blue-900/10",
  },
};

export function RecomendacionesOperativas({ recomendaciones }: RecomendacionesOperativasProps) {
  if (recomendaciones.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-futuro p-5 animate-fade-in-up delay-75">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
          <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">
            Recomendaciones Operativas
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Acciones sugeridas basadas en los datos del dataset · ordenadas por impacto
          </p>
        </div>
        <span className="ml-auto text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
          {recomendaciones.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {recomendaciones.map((rec, idx) => {
          const Icono = ICONO_MAP[rec.icono];
          const pc = PRIORIDAD_CONFIG[rec.prioridad];
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 border-l-[3px] ${pc.accentBorder} ${pc.hoverBg} transition-colors animate-fade-in-up`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div
                className="shrink-0 p-1.5 rounded-lg mt-0.5"
                style={{ backgroundColor: `${pc.dot}18` }}
              >
                <Icono className="h-3.5 w-3.5" style={{ color: pc.dot }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                    {rec.texto}
                  </p>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${pc.badge}`}>
                    {pc.label}
                  </span>
                </div>
                {rec.detalle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {rec.detalle}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
