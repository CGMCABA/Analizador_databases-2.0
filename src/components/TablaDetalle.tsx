import { useState, useMemo } from "react";
import type { RegistroGenerico, ColumnaDetectada, TipoColumna } from "@/lib/excelParser";
import { ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface TablaDetalleProps {
  registros: RegistroGenerico[];
  columnas: ColumnaDetectada[];
  meses: string[];
}

const PAGE_SIZE = 50;

function badgeStatus(valor: string) {
  const v = valor.toUpperCase().trim();
  if (v === "SI" || v === "SÍ")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
        SI
      </span>
    );
  if (v === "NO")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
        NO
      </span>
    );
  if (!v) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  return (
    <span className="text-slate-500 dark:text-slate-400 text-xs">{valor}</span>
  );
}

export function TablaDetalle({ registros, columnas, meses }: TablaDetalleProps) {
  const [sortCol, setSortCol] = useState<string>("_mes");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [busqueda, setBusqueda] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [pagina, setPagina] = useState(1);

  const colsVisibles = useMemo(() => {
    const cols: { nombre: string; tipo: TipoColumna | "fecha"; especial?: boolean }[] = [
      { nombre: "_mes", tipo: "categorica", especial: true },
      { nombre: "_fecha", tipo: "fecha", especial: true },
    ];
    for (const c of columnas) {
      if (!cols.some((x) => x.nombre === c.nombre)) {
        cols.push({ nombre: c.nombre, tipo: c.tipo });
      }
    }
    return cols;
  }, [columnas]);

  const categoricasParaFiltro = useMemo(() => {
    return columnas
      .filter((c) => c.tipo === "categorica")
      .slice(0, 2);
  }, [columnas]);

  const [filtrosCategoricos, setFiltrosCategoricos] = useState<Record<string, string>>({});

  const opcionesCategoricas = useMemo(() => {
    const opts: Record<string, string[]> = {};
    for (const col of categoricasParaFiltro) {
      const vals = Array.from(
        new Set(registros.map((r) => r.valores[col.nombre] ?? ""))
      )
        .filter(Boolean)
        .sort();
      opts[col.nombre] = vals;
    }
    return opts;
  }, [registros, categoricasParaFiltro]);

  const filtrados = useMemo(() => {
    let res = registros;
    if (filtroMes) res = res.filter((r) => r._mes === filtroMes);
    for (const [col, val] of Object.entries(filtrosCategoricos)) {
      if (val) res = res.filter((r) => (r.valores[col] ?? "") === val);
    }
    if (busqueda) {
      const q = busqueda.toLowerCase();
      res = res.filter((r) => {
        if (r._mes.toLowerCase().includes(q)) return true;
        if (r._fecha.toLowerCase().includes(q)) return true;
        return Object.values(r.valores).some((v) =>
          v.toLowerCase().includes(q)
        );
      });
    }
    return res;
  }, [registros, filtroMes, filtrosCategoricos, busqueda]);

  const ordenados = useMemo(() => {
    return [...filtrados].sort((a, b) => {
      let av = "";
      let bv = "";
      if (sortCol === "_mes") {
        av = a._mes;
        bv = b._mes;
      } else if (sortCol === "_fecha") {
        av = a._fecha;
        bv = b._fecha;
      } else {
        av = a.valores[sortCol] ?? "";
        bv = b.valores[sortCol] ?? "";
      }
      const numA = Number(av);
      const numB = Number(bv);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === "asc" ? numA - numB : numB - numA;
      }
      return sortDir === "asc"
        ? av.localeCompare(bv, "es")
        : bv.localeCompare(av, "es");
    });
  }, [filtrados, sortCol, sortDir]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / PAGE_SIZE));
  const paginaReal = Math.min(pagina, totalPaginas);
  const filasPagina = ordenados.slice(
    (paginaReal - 1) * PAGE_SIZE,
    paginaReal * PAGE_SIZE
  );

  const toggleSort = (col: string) => {
    setPagina(1);
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroMes("");
    setFiltrosCategoricos({});
    setPagina(1);
  };

  const hayFiltros =
    busqueda ||
    filtroMes ||
    Object.values(filtrosCategoricos).some(Boolean);

  const inputCls =
    "px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700";

  const ColHeader = ({ col, label }: { col: string; label: string }) => (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none whitespace-nowrap"
      onClick={() => toggleSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortCol === col ? (
          sortDir === "desc" ? (
            <ChevronDown className="h-3 w-3 text-blue-500" />
          ) : (
            <ChevronUp className="h-3 w-3 text-blue-500" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 text-slate-300 dark:text-slate-600" />
        )}
      </div>
    </th>
  );

  function renderCeldaValor(
    tipo: TipoColumna | "fecha" | string,
    valor: string,
    colNombre: string
  ) {
    if (!valor)
      return <span className="text-slate-300 dark:text-slate-600">—</span>;

    if (tipo === "status") return badgeStatus(valor);

    const isFirst = colsVisibles[2]?.nombre === colNombre && tipo === "id";
    if (isFirst)
      return (
        <span className="text-slate-500 dark:text-slate-400 text-xs font-mono">
          {valor}
        </span>
      );

    if (tipo === "categorica") {
      const acento =
        colsVisibles.filter((c) => c.tipo === "categorica").indexOf(
          colsVisibles.find((c) => c.nombre === colNombre)!
        ) === 0
          ? "blue"
          : "violet";
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            acento === "blue"
              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
              : "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
          } whitespace-nowrap max-w-[160px] truncate`}
          title={valor}
        >
          {valor}
        </span>
      );
    }

    if (tipo === "direccion") {
      return (
        <span
          className="text-slate-500 dark:text-slate-400 text-xs max-w-[140px] block truncate"
          title={valor}
        >
          {valor}
        </span>
      );
    }

    if (tipo === "texto_libre") {
      return (
        <span
          className="text-slate-500 dark:text-slate-400 text-xs max-w-[200px] block truncate"
          title={valor}
        >
          {valor}
        </span>
      );
    }

    return (
      <span className="text-slate-600 dark:text-slate-300 text-xs">
        {valor}
      </span>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="p-5 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Detalle de Registros
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {filtrados.length.toLocaleString("es-AR")} registros
              {hayFiltros
                ? " (filtrados)"
                : ` de ${registros.length.toLocaleString("es-AR")} totales`}
              {" · "}hacé clic en encabezados para ordenar
            </p>
          </div>
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="presentation-hide text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline underline-offset-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="presentation-hide flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar en todos los campos..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              className={`pl-8 pr-4 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-64 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700`}
            />
          </div>
          <select
            value={filtroMes}
            onChange={(e) => {
              setFiltroMes(e.target.value);
              setPagina(1);
            }}
            className={inputCls}
          >
            <option value="">Todos los meses</option>
            {meses.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {categoricasParaFiltro.map((col) => (
            <select
              key={col.nombre}
              value={filtrosCategoricos[col.nombre] ?? ""}
              onChange={(e) => {
                setFiltrosCategoricos((prev) => ({
                  ...prev,
                  [col.nombre]: e.target.value,
                }));
                setPagina(1);
              }}
              className={inputCls}
            >
              <option value="">
                {col.nombre.length > 20
                  ? col.nombre.slice(0, 19) + "…"
                  : col.nombre}
                : todos
              </option>
              {(opcionesCategoricas[col.nombre] ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
            <tr>
              {colsVisibles.map((col) => (
                <ColHeader
                  key={col.nombre}
                  col={col.nombre}
                  label={
                    col.nombre === "_mes"
                      ? "Mes"
                      : col.nombre === "_fecha"
                      ? "Fecha"
                      : col.nombre.length > 16
                      ? col.nombre.slice(0, 15) + "…"
                      : col.nombre
                  }
                />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {filasPagina.length === 0 ? (
              <tr>
                <td
                  colSpan={colsVisibles.length}
                  className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-sm"
                >
                  No se encontraron registros con los filtros aplicados
                </td>
              </tr>
            ) : (
              filasPagina.map((reg, idx) => (
                <tr
                  key={idx}
                  className={`${
                    idx % 2 === 0
                      ? "bg-white dark:bg-slate-800"
                      : "bg-slate-50/50 dark:bg-slate-700/30"
                  } hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors`}
                >
                  {colsVisibles.map((col) => {
                    const valor =
                      col.nombre === "_mes"
                        ? reg._mes
                        : col.nombre === "_fecha"
                        ? reg._fecha
                        : reg.valores[col.nombre] ?? "";
                    return (
                      <td key={col.nombre} className="px-3 py-2.5">
                        {col.nombre === "_mes" ? (
                          <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                            {valor || "—"}
                          </span>
                        ) : col.nombre === "_fecha" ? (
                          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                            {valor || "—"}
                          </span>
                        ) : (
                          renderCeldaValor(col.tipo, valor, col.nombre)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="presentation-hide px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            Mostrando {(paginaReal - 1) * PAGE_SIZE + 1}–
            {Math.min(paginaReal * PAGE_SIZE, ordenados.length)} de{" "}
            {ordenados.length.toLocaleString("es-AR")} resultados
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaReal === 1}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs">
              Pág. {paginaReal} / {totalPaginas}
            </span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaReal === totalPaginas}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
