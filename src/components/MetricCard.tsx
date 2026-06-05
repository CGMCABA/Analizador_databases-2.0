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
  blue:   { iconBg: "bg-blue-100 dark:bg-blue-900/40",   icon: "text-blue-600 dark:text-blue-400",   border: "border-blue-100 dark:border-blue-800",   text: "text-blue-700 dark:text-blue-400" },
  green:  { iconBg: "bg-green-100 dark:bg-green-900/40", icon: "text-green-600 dark:text-green-400", border: "border-green-100 dark:border-green-800", text: "text-green-700 dark:text-green-400" },
  red:    { iconBg: "bg-red-100 dark:bg-red-900/40",     icon: "text-red-600 dark:text-red-400",     border: "border-red-100 dark:border-red-800",     text: "text-red-700 dark:text-red-400" },
  cyan:   { iconBg: "bg-cyan-100 dark:bg-cyan-900/40",   icon: "text-cyan-600 dark:text-cyan-400",   border: "border-cyan-100 dark:border-cyan-800",   text: "text-cyan-700 dark:text-cyan-400" },
  indigo: { iconBg: "bg-indigo-100 dark:bg-indigo-900/40", icon: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-100 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-400" },
  violet: { iconBg: "bg-violet-100 dark:bg-violet-900/40", icon: "text-violet-600 dark:text-violet-400", border: "border-violet-100 dark:border-violet-800", text: "text-violet-700 dark:text-violet-400" },
  amber:  { iconBg: "bg-amber-100 dark:bg-amber-900/40",  icon: "text-amber-600 dark:text-amber-400",  border: "border-amber-100 dark:border-amber-800",  text: "text-amber-700 dark:text-amber-400" },
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
    <div className={`bg-white dark:bg-slate-800 rounded-xl border ${c.border} shadow-sm p-5 flex flex-col gap-3 h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{titulo}</span>
        <div className={`${c.iconBg} p-2 rounded-lg ring-2 ring-transparent group-hover:ring-offset-1 group-hover:ring-current transition-all duration-200 ${c.icon}`}>
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
