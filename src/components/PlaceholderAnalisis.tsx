import type { LucideIcon } from "lucide-react";

type Variante = "ausente" | "temporal" | "filtro" | "insuficiente" | "calidad";

interface PlaceholderAnalisisProps {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  accion?: {
    label: string;
    onClick: () => void;
  };
  variante?: Variante;
}

const ESTILOS: Record<Variante, {
  borde: string;
  fondo: string;
  iconoColor: string;
  btnBase: string;
}> = {
  ausente: {
    borde:      "border-slate-200 dark:border-[#1f2535]",
    fondo:      "bg-slate-50/60 dark:bg-[#131720]/40",
    iconoColor: "text-slate-300 dark:text-slate-600",
    btnBase:    "bg-slate-100 hover:bg-slate-200 dark:bg-[#252d3d] dark:hover:bg-[#2e3852] text-slate-600 dark:text-slate-300",
  },
  temporal: {
    borde:      "border-amber-200 dark:border-amber-800/50",
    fondo:      "bg-amber-50/60 dark:bg-amber-900/10",
    iconoColor: "text-amber-300 dark:text-amber-700",
    btnBase:    "bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400",
  },
  filtro: {
    borde:      "border-blue-200 dark:border-blue-800/50",
    fondo:      "bg-blue-50/60 dark:bg-blue-900/10",
    iconoColor: "text-blue-300 dark:text-blue-700",
    btnBase:    "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400",
  },
  insuficiente: {
    borde:      "border-slate-200 dark:border-[#1f2535]",
    fondo:      "bg-slate-50/60 dark:bg-[#131720]/40",
    iconoColor: "text-slate-300 dark:text-slate-600",
    btnBase:    "bg-slate-100 hover:bg-slate-200 dark:bg-[#252d3d] dark:hover:bg-[#2e3852] text-slate-600 dark:text-slate-300",
  },
  calidad: {
    borde:      "border-orange-200 dark:border-orange-800/50",
    fondo:      "bg-orange-50/60 dark:bg-orange-900/10",
    iconoColor: "text-orange-300 dark:text-orange-700",
    btnBase:    "bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400",
  },
};

export function PlaceholderAnalisis({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  variante = "ausente",
}: PlaceholderAnalisisProps) {
  const e = ESTILOS[variante];

  return (
    <div
      className={`presentation-hide print:hidden flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center ${e.borde} ${e.fondo}`}
    >
      <Icono className={`h-8 w-8 shrink-0 ${e.iconoColor}`} />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{titulo}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed">{descripcion}</p>
      </div>
      {accion && (
        <button
          onClick={accion.onClick}
          className={`mt-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${e.btnBase}`}
        >
          {accion.label}
        </button>
      )}
    </div>
  );
}
