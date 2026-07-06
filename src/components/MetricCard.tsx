import { Calendar, CheckCircle, XCircle, BarChart2, Activity, Users, Tag, TrendingUp, TrendingDown, Minus } from "lucide-react";

type IconoTipo = "calendar" | "check" | "x" | "chart" | "activity" | "users" | "tag";
type ColorTipo = "blue" | "green" | "red" | "cyan" | "indigo" | "violet" | "amber";

const ICONOS: Record<IconoTipo, React.ElementType> = {
  calendar: Calendar,
  check: CheckCircle,
  x: XCircle,
  chart: BarChart2,
  activity: Activity,
  users: Users,
  tag: Tag,
};

const COLORES: Record<ColorTipo, { iconBg: string; icon: string; border: string; text: string }> = {
  blue:   { iconBg: "bg-[rgba(200,168,75,0.10)]", icon: "text-[#c8a84b]",   border: "border-[#252d3d]", text: "text-slate-200" },
  green:  { iconBg: "bg-green-900/30",             icon: "text-green-400",   border: "border-[#252d3d]", text: "text-green-400" },
  red:    { iconBg: "bg-red-900/30",               icon: "text-red-400",     border: "border-[#252d3d]", text: "text-red-400" },
  cyan:   { iconBg: "bg-[rgba(200,168,75,0.08)]",  icon: "text-[#d4b96a]",   border: "border-[#252d3d]", text: "text-slate-200" },
  indigo: { iconBg: "bg-violet-900/30",            icon: "text-violet-400",  border: "border-[#252d3d]", text: "text-violet-400" },
  violet: { iconBg: "bg-violet-900/30",            icon: "text-violet-400",  border: "border-[#252d3d]", text: "text-violet-400" },
  amber:  { iconBg: "bg-amber-900/30",             icon: "text-amber-400",   border: "border-[#252d3d]", text: "text-amber-400" },
};

interface MetricCardProps {
  titulo: string;
  valor: string;
  subtitulo: string;
  color: ColorTipo;
  icono: IconoTipo;
  delta?: number;
  subtituloMes?: string;
}

export function MetricCard({ titulo, valor, subtitulo, color, icono, delta, subtituloMes }: MetricCardProps) {
  const c = COLORES[color];
  const Icono = ICONOS[icono];

  const DeltaBadge = () => {
    if (delta === undefined) return null;
    if (delta > 0) return (
      <div className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
        <TrendingUp className="h-3 w-3" />
        +{delta}%
      </div>
    );
    if (delta < 0) return (
      <div className="flex items-center gap-0.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
        <TrendingDown className="h-3 w-3" />
        {delta}%
      </div>
    );
    return (
      <div className="flex items-center gap-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
        <Minus className="h-3 w-3" />
        0%
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-[#1a1f2e] rounded-xl border ${c.border} p-5 flex flex-col gap-3 h-full`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{titulo}</span>
        <div className={`${c.iconBg} p-2 rounded-lg ${c.icon}`}>
          <Icono className={`h-4 w-4 ${c.icon}`} />
        </div>
      </div>
      <div>
        <div className="flex items-end gap-2 flex-wrap">
          <p className={`text-3xl font-bold ${c.text}`}>{valor}</p>
          <div className="mb-0.5">
            <DeltaBadge />
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {delta !== undefined && subtituloMes ? `vs. mes anterior · ${subtitulo}` : subtitulo}
        </p>
      </div>
    </div>
  );
}
