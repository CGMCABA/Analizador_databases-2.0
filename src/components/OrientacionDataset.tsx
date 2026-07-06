import { useState } from "react";
import { ChevronDown, Check, Minus, Clock, Table2 } from "lucide-react";
import type { DatosDashboard } from "@/lib/excelParser";
import { activa, type NombreCapacidad } from "@/lib/capacidades";
import { etiquetaTipo } from "@/lib/columnClassifier";
import { CalidadDataset } from "./CalidadDataset";

// ── Capacidades con nombre de display para el usuario ─────────────────────────
// Solo las 8 capacidades con consumidores activos en Dashboard.tsx.
const CAPS_DISPLAY: Array<{ nombre: NombreCapacidad; label: string }> = [
  { nombre: "Estado",           label: "Resolución"           },
  { nombre: "Categoria",        label: "Categorías"           },
  { nombre: "Horaria",          label: "Distribución horaria" },
  { nombre: "GeograficaCalles", label: "Geografía"            },
  { nombre: "TiempoRespuesta",  label: "Tiempo de respuesta"  },
  { nombre: "Programacion",     label: "Programación"         },
  { nombre: "Recurrencia",      label: "Recurrencia"          },
  { nombre: "Cobertura",        label: "Cobertura"            },
];

// ── Mensajes de bloqueo en lenguaje de usuario ────────────────────────────────
// Reemplaza razonAusencia (que usa nombres de conceptos semánticos internos)
// con texto legible por el usuario final.
const RAZON_USUARIO: Partial<Record<NombreCapacidad, string>> = {
  Estado:           "Sin columna de estado o resolución",
  Categoria:        "Sin columna de categorías o motivos",
  Horaria:          "Sin columna de hora de ingreso",
  GeograficaCalles: "Sin columna de dirección o calle",
  TiempoRespuesta:  "Sin columna de tiempo de respuesta",
  Programacion:     "Sin columna de programación (P/NP)",
  Recurrencia:      "Requiere columnas de geografía y categorías",
  Cobertura:        "Sin columna de línea de cobertura",
};

// ── Color por tipo de columna (espejo de TIPO_COLOR de Dashboard.tsx) ─────────
const TIPO_CHIP_COLOR: Record<string, string> = {
  categorica:   "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  status:       "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  fecha:        "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  hora:         "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  programacion: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  direccion:    "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  numerica:     "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  texto_libre:  "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600",
};

const CHIP_FALLBACK = "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600";

// ── Badge por tipo de dataset ──────────────────────────────────────────────────
const TIPO_BADGE: Record<string, { label: string; cls: string }> = {
  solicitudes: {
    label: "Solicitudes",
    cls: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700",
  },
  sucesos: {
    label: "Sucesos",
    cls: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700",
  },
  generico: {
    label: "Genérico",
    cls: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600",
  },
};

const BADGE_FALLBACK = {
  label: "Dataset",
  cls: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600",
};

// ── Score de amplitud analítica (0–5 puntos) ──────────────────────────────────
// Mide cuántos análisis están estructuralmente disponibles (columnas presentes).
// No mide calidad de datos — para eso existe "Ver calidad" (CalidadDataset).
const SCORE_CONFIG = [
  { label: "Sin análisis", dotColor: "bg-red-400" },
  { label: "Muy limitado", dotColor: "bg-red-400" },
  { label: "Limitado",     dotColor: "bg-amber-400" },
  { label: "Moderado",     dotColor: "bg-amber-400" },
  { label: "Amplio",       dotColor: "bg-emerald-500" },
  { label: "Completo",     dotColor: "bg-emerald-500" },
] as const;

function calcularScore(nActivas: number): number {
  if (nActivas === 0) return 0;
  if (nActivas === 1) return 1;
  if (nActivas <= 3) return 2;
  if (nActivas <= 5) return 3;
  if (nActivas <= 7) return 4;
  return 5;
}

// ── Formato de período ─────────────────────────────────────────────────────────
function formatearPeriodo(meses: string[]): string {
  if (meses.length === 0) return "";
  const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const parseMes = (s: string) => {
    const parts = s.split("-");
    return { anio: Number(parts[0] ?? 0), mes: Number(parts[1] ?? 1) };
  };
  const p = parseMes(meses[0]);
  const u = parseMes(meses[meses.length - 1]);
  const mp = MESES_CORTOS[p.mes - 1] ?? meses[0];
  const mu = MESES_CORTOS[u.mes - 1] ?? meses[meses.length - 1];
  if (meses.length === 1) return `${mp} ${p.anio}`;
  if (p.anio === u.anio) return `${mp}–${mu} ${p.anio}`;
  return `${mp} ${p.anio}–${mu} ${u.anio}`;
}

// ── Componente ─────────────────────────────────────────────────────────────────

interface Props {
  datos: DatosDashboard;
  nombreArchivo: string;
}

export function OrientacionDataset({ datos, nombreArchivo }: Props) {
  const [expandidoCalidad, setExpandidoCalidad] = useState(false);
  const [expandidoColumnas, setExpandidoColumnas] = useState(false);

  const badge = TIPO_BADGE[datos.tipoDato] ?? BADGE_FALLBACK;

  const caps = CAPS_DISPLAY.map((c) => ({
    nombre: c.nombre,
    label:  c.label,
    estaActiva:   activa(datos.capacidades, c.nombre),
    esTemporal:   datos.capacidades[c.nombre].restriccionTemporal,
  }));

  const nActivas = caps.filter((c) => c.estaActiva).length;
  const score    = calcularScore(nActivas);
  const scoreConf = SCORE_CONFIG[score] ?? SCORE_CONFIG[0];

  const periodo           = formatearPeriodo(datos.meses);
  const columnasUtiles    = datos.columnas.filter((c) => c.tipo !== "ignorar");
  const columnasIgnoradas = datos.columnas.filter((c) => c.tipo === "ignorar");

  return (
    <div className="presentation-hide print:hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in-up">

      {/* ── Header: badge · volumen · período ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
              {datos.totalSolicitudes.toLocaleString("es-AR")} registros
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-snug">
              {datos.meses.length} {datos.meses.length === 1 ? "mes" : "meses"}
              {periodo ? ` · ${periodo}` : ""}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs hidden sm:block">
          {nombreArchivo}
        </p>
      </div>

      {/* ── Capacidades: chips activos y bloqueados ───────────────────────── */}
      <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-700">
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
          Análisis disponibles
        </p>
        <div className="flex flex-wrap gap-1.5">
          {caps.map((cap) => {
            const bloqueada = !cap.estaActiva;
            const temporal  = bloqueada && cap.esTemporal;
            const titulo = bloqueada
              ? temporal
                ? "Disponible cuando el dataset tenga más meses de historia"
                : (RAZON_USUARIO[cap.nombre] ?? "No disponible para este dataset")
              : undefined;

            return (
              <span
                key={cap.nombre}
                title={titulo}
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
                  cap.estaActiva
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                    : temporal
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700 cursor-help"
                    : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 cursor-help"
                }`}
              >
                {cap.estaActiva
                  ? <Check className="h-3 w-3 shrink-0" />
                  : temporal
                  ? <Clock className="h-3 w-3 shrink-0" />
                  : <Minus className="h-3 w-3 shrink-0" />
                }
                {cap.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Footer: score de calidad · botones de expansión ──────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Amplitud
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={`inline-block w-2 h-2 rounded-full ${
                  i < score ? scoreConf.dotColor : "bg-slate-200 dark:bg-slate-600"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">{scoreConf.label}</span>
        </div>

        <div className="flex items-center gap-4">
          {columnasUtiles.length > 0 && (
            <button
              onClick={() => setExpandidoColumnas((v) => !v)}
              aria-expanded={expandidoColumnas}
              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <Table2 className="h-3.5 w-3.5" />
              {columnasUtiles.length} columnas
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  expandidoColumnas ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
          <button
            onClick={() => setExpandidoCalidad((v) => !v)}
            aria-expanded={expandidoCalidad}
            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            Ver calidad
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                expandidoCalidad ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Expansión: columnas detectadas ───────────────────────────────── */}
      {expandidoColumnas && columnasUtiles.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
            Columnas interpretadas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {columnasUtiles.map((col) => (
              <span
                key={col.nombre}
                title={`${etiquetaTipo(col.tipo)} · ${col.cantidadUnicos} valores únicos`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                  TIPO_CHIP_COLOR[col.tipo] ?? CHIP_FALLBACK
                }`}
              >
                {col.nombre}
                <span className="opacity-50 text-[10px]">({etiquetaTipo(col.tipo)})</span>
              </span>
            ))}
          </div>
          {columnasIgnoradas.length > 0 && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
              {columnasIgnoradas.length}{" "}
              {columnasIgnoradas.length === 1 ? "columna ignorada" : "columnas ignoradas"}
            </p>
          )}
        </div>
      )}

      {/* ── Expansión: CalidadDataset (card exterior suprimida) ───────────── */}
      {expandidoCalidad && (
        <div className="border-t border-slate-100 dark:border-slate-700 [&>div]:rounded-none [&>div]:shadow-none [&>div]:border-0">
          <CalidadDataset
            calidadDataset={datos.calidadDataset}
            tieneColumnaProgramacion={activa(datos.capacidades, "Programacion")}
            etiquetaStatus={datos.etiquetaStatus}
          />
        </div>
      )}
    </div>
  );
}
