import { ShieldCheck, Clock, CheckCircle, RefreshCw, HelpCircle } from "lucide-react";
import { SemaforoResultado, EjeSemaforo, EstadoSemaforo } from "@/lib/semaforoRecomendaciones";

interface SemaforoOperacionalProps {
  resultado: SemaforoResultado;
}

const COLOR_MAP: Record<EstadoSemaforo, {
  bg: string; border: string; dot: string; etiqueta: string; badge: string;
}> = {
  verde: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "#27ae60",
    etiqueta: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  },
  amarillo: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    dot: "#f39c12",
    etiqueta: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  },
  rojo: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    dot: "#e74c3c",
    etiqueta: "text-red-700 dark:text-red-400",
    badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  },
  nd: {
    bg: "bg-slate-50 dark:bg-slate-800",
    border: "border-slate-200 dark:border-slate-700",
    dot: "#94a3b8",
    etiqueta: "text-slate-500 dark:text-slate-400",
    badge: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
  },
};

const EJES = [
  {
    key: "calidad" as const,
    titulo: "Calidad de datos",
    Icono: ShieldCheck,
  },
  {
    key: "eficiencia" as const,
    titulo: "Eficiencia (TRI)",
    Icono: Clock,
  },
  {
    key: "resolucion" as const,
    titulo: "Resolución",
    Icono: CheckCircle,
  },
  {
    key: "recurrencia" as const,
    titulo: "Recurrencia",
    Icono: RefreshCw,
  },
];

function EjeCard({ eje, titulo, Icono }: { eje: EjeSemaforo; titulo: string; Icono: React.ElementType }) {
  const c = COLOR_MAP[eje.estado];
  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-4 ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {eje.estado === "nd"
            ? <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
            : <Icono className="h-4 w-4 shrink-0" style={{ color: c.dot }} />
          }
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-tight">{titulo}</span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${c.dot}18`, color: c.dot, border: `1px solid ${c.dot}30` }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: c.dot }}
          />
          {eje.etiqueta}
        </span>
      </div>
      <p className={`text-2xl font-bold tabular-nums leading-none ${c.etiqueta}`}>
        {eje.valor}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
        {eje.descripcion}
      </p>
    </div>
  );
}

export function SemaforoOperacional({ resultado }: SemaforoOperacionalProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md p-5 animate-fade-in-up delay-75">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0">
          <ShieldCheck className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Semáforo Operacional</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Estado de salud operativa en 4 dimensiones clave
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {EJES.map(({ key, titulo, Icono }) => (
          <EjeCard key={key} eje={resultado[key]} titulo={titulo} Icono={Icono} />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
        {(["verde", "amarillo", "rojo", "nd"] as EstadoSemaforo[]).map((estado) => (
          <span key={estado} className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: COLOR_MAP[estado].dot }}
            />
            {estado === "verde" ? "OK" : estado === "amarillo" ? "Atención" : estado === "rojo" ? "Crítico" : "Sin datos"}
          </span>
        ))}
      </div>
    </div>
  );
}
