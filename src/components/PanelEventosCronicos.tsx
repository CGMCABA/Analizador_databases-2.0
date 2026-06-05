import { useState, useMemo } from "react";
import { RotateCcw, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface CruceCronico {
  interseccion: string;
  motivo: string;
  meses: string[];
  cantidad: number;
}

interface PanelEventosCronicosProps {
  crucesCronicos: CruceCronico[];
}

type SortKey = "meses" | "cantidad" | "motivo" | "interseccion";
type SortDir = "asc" | "desc";

function colorPorMeses(mesesCount: number): {
  row: string;
  badge: string;
  severidad: string;
  severidadColor: string;
} {
  if (mesesCount >= 6) {
    return {
      row: "bg-red-50/60 dark:bg-red-900/10 border-l-4 border-l-red-400",
      badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
      severidad: "CRÍTICO",
      severidadColor: "text-red-600 dark:text-red-400 font-bold text-[10px]",
    };
  }
  if (mesesCount >= 3) {
    return {
      row: "bg-amber-50/60 dark:bg-amber-900/10 border-l-4 border-l-amber-400",
      badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      severidad: "RECURRENTE",
      severidadColor: "text-amber-600 dark:text-amber-400 font-bold text-[10px]",
    };
  }
  return {
    row: "bg-yellow-50/40 dark:bg-yellow-900/10 border-l-4 border-l-yellow-400",
    badge: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    severidad: "REPETIDO",
    severidadColor: "text-yellow-600 dark:text-yellow-400 font-bold text-[10px]",
  };
}

function abreviarMes(mes: string): string {
  const parts = mes.split(" ");
  if (parts.length >= 2) return `${parts[0].slice(0, 3)} ${parts[1].slice(2)}`;
  return mes.slice(0, 6);
}

interface ThSortProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  align?: "left" | "right";
  onSort: (key: SortKey) => void;
}

function ThSort({ label, sortKey, currentKey, dir, align = "left", onSort }: ThSortProps) {
  const isActive = sortKey === currentKey;
  const Icon = isActive ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th
      className={`py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={`h-3 w-3 ${isActive ? "text-blue-500" : "opacity-40"}`} />
      </span>
    </th>
  );
}

export function PanelEventosCronicos({ crucesCronicos }: PanelEventosCronicosProps) {
  const [sortKey, setSortKey] = useState<SortKey>("meses");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const TOP_N = 20;

  const sorted = useMemo(() => {
    const arr = [...crucesCronicos];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "meses") cmp = a.meses.length - b.meses.length;
      else if (sortKey === "cantidad") cmp = a.cantidad - b.cantidad;
      else if (sortKey === "motivo") cmp = a.motivo.localeCompare(b.motivo, "es");
      else if (sortKey === "interseccion") cmp = a.interseccion.localeCompare(b.interseccion, "es");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr.slice(0, TOP_N);
  }, [crucesCronicos, sortKey, sortDir]);

  if (crucesCronicos.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md p-5 animate-fade-in-up delay-200">
      <div className="flex items-center gap-2 mb-1">
        <RotateCcw className="h-4 w-4 text-red-500" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Eventos crónicos</h3>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 ml-6">
        Problemas estructurales que se repiten en el tiempo y no se resuelven · mismo tipo en la misma intersección en múltiples meses · hacé clic en los encabezados para ordenar
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <ThSort label="Intersección" sortKey="interseccion" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              <ThSort label="Categoría" sortKey="motivo" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Meses afectados
              </th>
              <ThSort label="Registros" sortKey="cantidad" currentKey={sortKey} dir={sortDir} align="right" onSort={handleSort} />
              <ThSort label="Nivel" sortKey="meses" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((cruce, idx) => {
              const col = colorPorMeses(cruce.meses.length);
              return (
                <tr
                  key={idx}
                  className={`${col.row} transition-colors`}
                >
                  <td className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 font-medium max-w-[180px]">
                    <span className="block truncate" title={cruce.interseccion}>
                      {cruce.interseccion}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 max-w-[140px]">
                    <span className="block truncate" title={cruce.motivo}>
                      {cruce.motivo}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {cruce.meses.slice(0, 8).map((mes) => (
                        <span
                          key={mes}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${col.badge}`}
                        >
                          {abreviarMes(mes)}
                        </span>
                      ))}
                      {cruce.meses.length > 8 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-slate-400 dark:text-slate-500">
                          +{cruce.meses.length - 8}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {cruce.cantidad.toLocaleString("es-AR")}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={col.severidadColor}>{col.severidad}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 border-t border-slate-100 dark:border-slate-700 pt-3">
        Los eventos crónicos indican problemas estructurales no resueltos. Priorizá intervenciones en las intersecciones de nivel CRÍTICO.
      </p>
    </div>
  );
}
