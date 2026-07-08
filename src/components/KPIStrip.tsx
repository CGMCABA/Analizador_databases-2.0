import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type KPIAccent = "gold" | "green" | "amber" | "red" | "violet" | "indigo";

export interface KPICell {
  label: string;
  value: string;
  sub?: string;
  accent?: KPIAccent;
  delta?: number;
  deltaMes?: string;
}

interface KPIStripProps {
  cells: KPICell[];
}

const ACCENT: Record<KPIAccent, { bar: string; value: string }> = {
  gold:   { bar: "bg-[#c8a84b]",   value: "text-slate-800 dark:text-slate-100" },
  green:  { bar: "bg-emerald-500", value: "text-emerald-700 dark:text-emerald-400" },
  amber:  { bar: "bg-amber-500",   value: "text-amber-700 dark:text-amber-300" },
  red:    { bar: "bg-red-500",     value: "text-red-700 dark:text-red-400" },
  violet: { bar: "bg-violet-500",  value: "text-violet-700 dark:text-violet-400" },
  indigo: { bar: "bg-indigo-500",  value: "text-indigo-700 dark:text-indigo-400" },
};

function DeltaBadge({ delta, mes }: { delta: number; mes?: string }) {
  if (delta > 0) return (
    <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
      <TrendingUp className="h-3 w-3" />
      +{delta}%{mes ? ` vs ${mes}` : ""}
    </span>
  );
  if (delta < 0) return (
    <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold text-red-600 dark:text-red-400">
      <TrendingDown className="h-3 w-3" />
      {delta}%{mes ? ` vs ${mes}` : ""}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
      <Minus className="h-3 w-3" />
      Sin cambio
    </span>
  );
}

export function KPIStrip({ cells }: KPIStripProps) {
  if (cells.length === 0) return null;

  return (
    <div className="animate-fade-in-up bg-slate-50 dark:bg-[#0d0f14] border border-slate-200 dark:border-[#1f2535] rounded-lg overflow-hidden">
      <div className={`grid divide-x divide-slate-200 dark:divide-[#1f2535]`}
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
      >
        {cells.map((cell, i) => {
          const a = ACCENT[cell.accent ?? "gold"];
          return (
            <div
              key={cell.label}
              className="relative px-5 py-4"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Accent bar */}
              <span className={`absolute inset-y-0 left-0 w-[2.5px] ${a.bar} opacity-70`} aria-hidden="true" />

              <p className="font-mono text-[9px] tracking-[.18em] uppercase text-slate-500 dark:text-slate-500 mb-2">
                {cell.label}
              </p>
              <p className={`text-[1.6rem] font-extrabold leading-none tracking-tight ${a.value} mb-1.5`}>
                {cell.value}
              </p>
              {cell.delta !== undefined && (
                <div className="mb-1">
                  <DeltaBadge delta={cell.delta} mes={cell.deltaMes} />
                </div>
              )}
              {cell.sub && (
                <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500 leading-snug">
                  {cell.sub}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
