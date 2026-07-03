import * as XLSX from "xlsx";
import { clasificarColumnas } from "./columnClassifier";
import { detectarConceptos } from "./semantica/detectarConceptos";
import type { ConceptoSemantico, DiagnosticoSemantico } from "./semantica/conceptos";
import { derivarCapacidades } from "./capacidades";
import type { CapacidadesDataset } from "./capacidades";
import { calcularCalidad } from "./calidad";
import type { CalidadAnaliticaDataset } from "./calidad";
import {
  esResuelta,
  canonicalizarInterseccion,
  calcularResolucion,
  detectarFalsoPositivo,
  calcularTiposFalsosPositivos,
  calcularPorMotivo,
  calcularPorArea,
  calcularPorLinea,
  calcularPorCalle,
  calcularPorSegmento,
  calcularPorCalle1Ranking,
  calcularPorDiaSemana,
  calcularPorHora,
  calcularPorInterseccion,
  calcularPorTiempoRespuestaArea,
  calcularTiempoRespuestaPorMotivo,
  calcularTiempoRespuestaInterno,
  calcularCruceCategoriaHora,
  calcularCruceCategoriaDia,
} from "./agregaciones";
export type { TipoColumna, ColumnaDetectada } from "./columnClassifier";

export interface Solicitud {
  id: number;
  mes: string;
  fecha: string;
  hora: number | null;
  horaDerivacion: number | null;
  tiempoRespuestaInternoMin: number | null;
  motivo: string;
  descripcion: string;
  areaAsignada: string;
  resuelto: string;
  linea: string;
  calle1: string;
  calle2: string;
  calle3: string;
  tiempoRespuestaMin: number;
  resolucion: string;
  esFalsoPositivo: boolean;
  esRecurrente: boolean;
  esProgramado: boolean | null;
}

export type TipoDato = 'solicitudes' | 'sucesos' | 'generico';

export interface CruceAutomatico {
  titulo: string;
  tipo: 'categoria_hora' | 'categoria_dia';
  filas: string[];
  columnas: string[];
  valores: number[][];
}

export interface CruceCronico {
  interseccion: string;
  motivo: string;
  meses: string[];
  cantidad: number;
}

export interface ZonaFragilidad {
  zona: string;
  puntuacion: number;
  volumen: number;
  tasaRecurrencia: number;
  tiempoPromedio: number;
}

export interface CalidadDataset {
  pctSinFecha: number;
  pctSinCategoria: number;
  pctSinUbicacion: number;
  pctSinHora: number;
  pctSinResolucion: number;
  columnasDetectadas: string[];
  sugerencias: string[];
  tieneColumnaProgramacion: boolean;
  registrosSinFechaValida: number;
  modoHojaUnica: boolean;
}

export interface RegistroGenerico {
  _mes: string;
  _fecha: string;
  valores: Record<string, string>;
}

export interface ItemResolucion {
  nombre: string;
  total: number;
  resueltas: number;
  noResueltas: number;
  tasa: number;
}

export interface DatosDashboard {
  solicitudes: Solicitud[];
  totalSolicitudes: number;
  totalResueltas: number;
  totalNoResueltas: number;
  tasaResolucion: number;
  porMotivo: { nombre: string; cantidad: number }[];
  porArea: { nombre: string; cantidad: number }[];
  porMes: { mes: string; cantidad: number; resueltas: number; programados: number; noProgramados: number }[];
  resolucionPorMotivo: ItemResolucion[];
  resolucionPorArea: ItemResolucion[];
  porLinea: {
    linea: string;
    cantidad: number;
    resueltas: number;
    tasa: number;
    porMotivo: { nombre: string; cantidad: number }[];
    porArea: { nombre: string; cantidad: number }[];
  }[];
  porCalle: {
    nombre: string;
    cantidad: number;
    porMotivo: { nombre: string; cantidad: number }[];
    porArea: { nombre: string; cantidad: number }[];
  }[];
  porSegmento: {
    calle1: string;
    calle2: string;
    calle3: string;
    cantidad: number;
    calleTotal: number;
    motivos: { nombre: string; cantidad: number }[];
  }[];
  porCalle1Ranking: { nombre: string; cantidad: number }[];
  porDiaSemana: { dia: string; cantidad: number }[];
  porHora: { hora: number; cantidad: number }[];
  porInterseccion: { nombre: string; cantidad: number }[];
  porTiempoRespuestaArea: { area: string; promedio: number; cantidad: number }[];
  tiempoRespuestaPorMotivo: { area: string; promedio: number; cantidad: number }[];
  crucesAutomaticos: CruceAutomatico[];
  meses: string[];

  totalFalsosPositivos: number;
  tasaFalsosPositivos: number;
  tiposFalsosPositivos: { nombre: string; cantidad: number }[];
  crucesCronicos: CruceCronico[];
  indiceFragilidad: ZonaFragilidad[];
  calidadDataset: CalidadDataset;

  tieneHoraDerivacion: boolean;
  tiempoRespuestaInternoPromedio: number;
  tiempoRespuestaInternoPorMotivo: { area: string; promedio: number; cantidad: number }[];
  tiempoRespuestaInternoPorArea: { area: string; promedio: number; cantidad: number }[];
  distribucionTiempoRespuestaInterno: { rango: string; cantidad: number }[];

  columnas: import("./columnClassifier").ColumnaDetectada[];
  colCategorica1: string | null;
  colCategorica2: string | null;
  colCategoricaEsTexto: boolean;
  distribucionesCategoricas: {
    columna: string;
    datos: { nombre: string; cantidad: number }[];
  }[];
  tipoDato: TipoDato;
  tieneColumnaStatus: boolean;
  etiquetaStatus: string;
  tieneColumnaProgramacion: boolean;
  totalProgramados: number;
  totalNoProgramados: number;
  colLinea: string | null;
  colCalle1: string | null;
  registros: RegistroGenerico[];
  mapaSemantico?: DiagnosticoSemantico;
  /**
   * Capacidades analíticas del dataset, derivadas del mapa semántico.
   * Calculadas una sola vez sobre el dataset completo en parsearExcel().
   * No cambian con filtros de UI. Ver src/lib/capacidades.ts.
   */
  capacidades: CapacidadesDataset;
  /**
   * Calidad analítica del dataset: ¿tienen las capacidades suficientes datos
   * para que el análisis sea útil? Complementa capacidades (estructura) con
   * volumen, cardinalidad y fill-rate. Ver src/lib/calidad.ts.
   */
  calidad: CalidadAnaliticaDataset;
}

const MESES_ABREV: Record<string, string> = {
  ene: "Enero", feb: "Febrero", mar: "Marzo", abr: "Abril",
  may: "Mayo", jun: "Junio", jul: "Julio", ago: "Agosto",
  sep: "Septiembre", oct: "Octubre", nov: "Noviembre", dic: "Diciembre",
  jan: "Enero", apr: "Abril", aug: "Agosto",
};

const MESES_NUM: Record<string, string> = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
  "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
  "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
};

function normalizarNombreHoja(nombre: string): string | null {
  const lower = nombre.toLowerCase().trim();

  // Skip invalid / discarded sheets explicitly
  if (lower.includes("invalida") || lower.includes("invalid") || lower.includes("descartado")) {
    return null;
  }

  // YYYY-MM format (e.g. "2026-03")
  const yyyyMm = nombre.trim().match(/^(\d{4})-(\d{2})$/);
  if (yyyyMm) {
    const mes = MESES_NUM[yyyyMm[2]];
    if (mes) return `${mes} ${yyyyMm[1]}`;
  }

  // MM-YYYY format (e.g. "03-2026")
  const mmYyyy = nombre.trim().match(/^(\d{2})-(\d{4})$/);
  if (mmYyyy) {
    const mes = MESES_NUM[mmYyyy[1]];
    if (mes) return `${mes} ${mmYyyy[2]}`;
  }

  // MM/YYYY format (e.g. "03/2026")
  const mmSlashYyyy = nombre.trim().match(/^(\d{2})\/(\d{4})$/);
  if (mmSlashYyyy) {
    const mes = MESES_NUM[mmSlashYyyy[1]];
    if (mes) return `${mes} ${mmSlashYyyy[2]}`;
  }

  // Spanish month name prefix (existing logic)
  for (const [abrev, nombreLargo] of Object.entries(MESES_ABREV)) {
    if (lower.startsWith(abrev)) {
      const anioMatch = lower.match(/\d{4}/);
      const anio = anioMatch ? ` ${anioMatch[0]}` : "";
      return `${nombreLargo}${anio}`;
    }
  }

  return null;
}

function formatearFecha(valor: unknown): string {
  if (!valor && valor !== 0) return "";
  const num = Number(valor);
  if (!isNaN(num) && num > 40000) {
    const date = XLSX.SSF.parse_date_code(num);
    if (date) {
      return `${String(date.d).padStart(2, "0")}/${String(date.m).padStart(2, "0")}/${date.y}`;
    }
  }
  return String(valor).trim();
}

function validarYFormatearFecha(d: number, m: number, y: number): { mes: string; fecha: string } | null {
  if (y < 2000 || y > 2050) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  // True calendar validation: construct a Date and verify the components didn't roll over
  const dateObj = new Date(y, m - 1, d);
  if (
    dateObj.getFullYear() !== y ||
    dateObj.getMonth() !== m - 1 ||
    dateObj.getDate() !== d
  ) return null;
  // Reject dates strictly after today — a historical dataset shouldn't contain future
  // events. Truncated to midnight so "today" itself stays valid (fecha > hoy, no >=).
  const hoy = new Date();
  const hoyTruncado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (dateObj.getTime() > hoyTruncado.getTime()) return null;
  const mesStr = MESES_NUM[String(m).padStart(2, "0")];
  if (!mesStr) return null;
  return {
    mes: `${mesStr} ${y}`,
    fecha: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
  };
}

function parsearMesDesdeValor(valor: unknown): { mes: string; fecha: string } | null {
  if (!valor && valor !== 0) return null;
  const num = Number(valor);

  // Excel serial date: use XLSX.SSF.parse_date_code for any positive finite number
  // (integer = date-only; fractional = date+time, e.g. 45352.5)
  if (!isNaN(num) && isFinite(num) && num > 0) {
    try {
      const date = XLSX.SSF.parse_date_code(num);
      if (date && date.y >= 2000 && date.y <= 2050) {
        return validarYFormatearFecha(date.d, date.m, date.y);
      }
    } catch {
      // Not a valid serial — fall through to string parsing
    }
    // If numeric but parse failed or year out of range, reject
    return null;
  }

  const str = String(valor).trim();
  if (!str) return null;

  // Strip time part ("YYYY-MM-DD HH:MM" or "YYYY-MM-DDTHH:MM:SS")
  const strDate = str.split(/[\sT]/)[0].trim();

  // YYYY-MM-DD
  const isoMatch = strDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return validarYFormatearFecha(
      parseInt(isoMatch[3], 10),
      parseInt(isoMatch[2], 10),
      parseInt(isoMatch[1], 10)
    );
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyFull = strDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyFull) {
    return validarYFormatearFecha(
      parseInt(dmyFull[1], 10),
      parseInt(dmyFull[2], 10),
      parseInt(dmyFull[3], 10)
    );
  }

  // DD/MM/YY (2-digit year → 20YY)
  const dmyShort = strDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (dmyShort) {
    return validarYFormatearFecha(
      parseInt(dmyShort[1], 10),
      parseInt(dmyShort[2], 10),
      2000 + parseInt(dmyShort[3], 10)
    );
  }

  return null;
}

function calcularMinutos(valor: unknown): number {
  if (!valor && valor !== 0) return 0;
  const num = Number(valor);
  if (isNaN(num)) return 0;
  return Math.round(num * 24 * 60);
}

// Parse a time value into total minutes since midnight (0–1439).
// Accepts: "HH:MM", "HH:MM:SS", fractional Excel serial (0–1), integer hour (0–23).
// Returns null if the value cannot be parsed.
function parsearHoraEnMinutos(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const str = String(valor).trim();

  // "HH:MM" or "HH:MM:SS"
  const hhMm = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hhMm) {
    const h = parseInt(hhMm[1], 10);
    const m = parseInt(hhMm[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m;
    return null;
  }

  const num = Number(valor);
  if (isNaN(num)) return null;

  // Excel fractional serial time (0 to <1 represents 00:00–23:59)
  if (num >= 0 && num < 1) {
    return Math.round(num * 24 * 60) % 1440;
  }

  // Excel datetime serial with time part (e.g. 45352.75 → take fractional part)
  if (num > 1) {
    const fraccion = num - Math.floor(num);
    if (fraccion > 0) return Math.round(fraccion * 24 * 60) % 1440;
    // Integer serial → no time part, treat as hour 0
    return 0;
  }

  return null;
}

function leerWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
  const bytes = new Uint8Array(buffer);
  const isXls =
    bytes[0] === 0xd0 && bytes[1] === 0xcf &&
    bytes[2] === 0x11 && bytes[3] === 0xe0;
  if (isXls) {
    try {
      return XLSX.read(buffer, { type: "array", bookVBA: false });
    } catch {
      return XLSX.read(buffer, { type: "array", bookVBA: false, codepage: 1252 });
    }
  }
  return XLSX.read(buffer, { type: "array" });
}

export function parsearExcel(buffer: ArrayBuffer): DatosDashboard {
  const workbook = leerWorkbook(buffer);
  const solicitudes: Solicitud[] = [];
  const registros: RegistroGenerico[] = [];
  let ordenMeses: string[] = [];

  // Detect single-sheet mode: activate when exactly one sheet exists OR no sheet name matches a month pattern
  const sheetesConMes = workbook.SheetNames.filter(
    (n) => normalizarNombreHoja(n) !== null
  );
  const modoHojaUnica = workbook.SheetNames.length === 1 || sheetesConMes.length === 0;
  let registrosSinFechaValida = 0;

  let columnasGlobales: import("./columnClassifier").ColumnaDetectada[] = [];
  let colCategorica1: string | null = null;
  let colCategorica2: string | null = null;
  let colCategoricaEsTexto = false;
  let tieneColumnaStatus = false;
  let tieneColumnasCalles = false;
  let tieneColumnaLinea = false;

  let idxPrimariaGlobal = -1;
  let idxSecundariaGlobal = -1;
  let idxLineaGlobal = -1;
  let idxCalle1Global = -1;
  let idxCalle2Global = -1;
  let idxCalle3Global = -1;
  let idxFechaGlobal = -1;
  let idxIdGlobal = -1;
  let idxDescGlobal = -1;
  let idxResueltoGlobal = -1;
  let idxResolucionGlobal = -1;
  let idxTiempoGlobal = -1;
  let idxHoraGlobal = -1;
  let idxHoraDerivacionGlobal = -1;
  let tieneHoraDerivacion = false;
  let idxProgramacionGlobal = -1;
  let tieneColumnaProgramacion = false;
  let diagnosticoSemantico: DiagnosticoSemantico | null = null;
  let etiquetaStatus = "Resuelto";
  let colLinea: string | null = null;
  let colCalle1: string | null = null;


  for (const sheetName of workbook.SheetNames) {
    let mesNombreHoja: string | null = null;
    if (!modoHojaUnica) {
      mesNombreHoja = normalizarNombreHoja(sheetName);
      if (!mesNombreHoja) {
        console.warn(`[Dashboard] Hoja "${sheetName}" ignorada: nombre no corresponde a un mes.`);
        continue;
      }
    }

    const ws = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (rows.length < 2) continue;

    const headers = (rows[0] as unknown[]).map((h) => String(h));

    if (columnasGlobales.length === 0) {
      columnasGlobales = clasificarColumnas(headers, rows.slice(1) as unknown[][]);

      // ── Motor Semántico ───────────────────────────────────────────────────
      diagnosticoSemantico = detectarConceptos(columnasGlobales, rows.slice(1) as unknown[][]);
      const idx = (c: ConceptoSemantico): number =>
        diagnosticoSemantico!.mapa[c]?.indice ?? -1;

      if (import.meta.env?.DEV) {
        console.group("[SemanticMotor] Diagnóstico de columnas");
        console.table(
          Object.entries(diagnosticoSemantico.mapa).map(([concepto, asig]) => ({
            Concepto: concepto,
            Columna: asig?.columnaOriginal ?? "—",
            Confianza: asig?.confianza ?? 0,
            Fuente: asig?.fuenteDeteccion ?? "—",
            Tensión: asig?.evidencia.tensionDetectada ? "⚠️" : "—",
          }))
        );
        if (diagnosticoSemantico.columnasSinConcepto.length > 0) {
          console.warn("[SemanticMotor] Sin concepto:", diagnosticoSemantico.columnasSinConcepto);
        }
        console.groupEnd();
      }

      tieneColumnaStatus = columnasGlobales.some((c) => c.tipo === "status");
      tieneColumnasCalles =
        idx("CallePrincipal") >= 0 || columnasGlobales.some((c) => c.tipo === "direccion");

      // Fill-rate check: if status column exists but has <5% data, suppress resolution UI
      if (tieneColumnaStatus) {
        const colsStatus = columnasGlobales.filter((c) => c.tipo === "status");
        const muestraStatus = (rows as unknown[][]).slice(1, 101);
        const statusFilled = colsStatus.some((col) => {
          const filled = muestraStatus.filter(
            (r) => String(r[col.indice] ?? "").trim().length > 0
          ).length;
          return muestraStatus.length > 0 && filled / muestraStatus.length >= 0.05;
        });
        if (!statusFilled) tieneColumnaStatus = false;
      }

      const categoricas = columnasGlobales.filter((c) => c.tipo === "categorica");

      // Semantic: primary category and secondary/area columns
      const colMotivoDet = idx("Categoria");
      const colAreaDet = idx("ResponsableOperativo");

      // Semantic: fecha column (structural fallback when semantic misses it)
      idxFechaGlobal = idx("FechaPrincipal");
      if (idxFechaGlobal < 0) {
        idxFechaGlobal = columnasGlobales.find((c) => c.tipo === "fecha")?.indice ?? -1;
      }

      // Semantic: id, description, response time
      idxIdGlobal = idx("Identificador");
      idxDescGlobal = idx("TextoLibre");
      idxTiempoGlobal = idx("TiempoRespuestaMin");

      // Semantic: status columns (structural fallback)
      idxResueltoGlobal = idx("Estado");
      idxResolucionGlobal = idx("ResultadoIntervencion");
      const colsStatus = columnasGlobales.filter((c) => c.tipo === "status");
      if (idxResueltoGlobal < 0 && colsStatus.length > 0) {
        idxResueltoGlobal = colsStatus[0].indice;
      }
      if (idxResolucionGlobal < 0 && colsStatus.length > 1) {
        idxResolucionGlobal = colsStatus[1].indice;
      }

      if (tieneColumnaStatus) {
        const nombreEstado = idxResueltoGlobal >= 0 ? headers[idxResueltoGlobal].toLowerCase() : "";
        etiquetaStatus = nombreEstado.includes("resuelto") ? "Resuelto" : "Finalizado";
      }

      // Semantic: linea / cobertura column (structural fallback)
      tieneColumnaLinea = idx("Cobertura") >= 0;
      idxLineaGlobal = idx("Cobertura");
      colLinea = idxLineaGlobal >= 0 ? headers[idxLineaGlobal] : null;
      if (!tieneColumnaLinea) {
        const colLineaDetectada = categoricas.find(
          (c) =>
            c.nombre.toLowerCase().includes("linea") ||
            c.nombre.toLowerCase().includes("línea")
        );
        if (colLineaDetectada) {
          tieneColumnaLinea = true;
          idxLineaGlobal = colLineaDetectada.indice;
          colLinea = colLineaDetectada.nombre;
        }
      }

      // Semantic: calle columns (structural fallback)
      idxCalle1Global = idx("CallePrincipal");
      idxCalle2Global = idx("CalleSecundaria");
      idxCalle3Global = idx("CalleTerciaria");
      if (idxCalle1Global < 0) {
        const calles = columnasGlobales.filter((c) => c.tipo === "direccion");
        idxCalle1Global = calles[0]?.indice ?? -1;
        idxCalle2Global = calles[1]?.indice ?? -1;
        idxCalle3Global = calles[2]?.indice ?? -1;
      }
      colCalle1 = idxCalle1Global >= 0 ? headers[idxCalle1Global] : null;

      if (colMotivoDet >= 0) {
        idxPrimariaGlobal = colMotivoDet;
        colCategorica1 = headers[colMotivoDet];
      } else if (categoricas.length > 0) {
        const primera = categoricas.find(
          (c) =>
            !c.nombre.toLowerCase().includes("linea") &&
            !c.nombre.toLowerCase().includes("línea") &&
            !c.nombre.toLowerCase().includes("area") &&
            !c.nombre.toLowerCase().includes("área")
        ) ?? categoricas[0];
        idxPrimariaGlobal = primera.indice;
        colCategorica1 = primera.nombre;
      }

      if (colAreaDet >= 0) {
        idxSecundariaGlobal = colAreaDet;
        colCategorica2 = headers[colAreaDet];
      } else if (categoricas.length > 1) {
        const segunda = categoricas.find(
          (c) =>
            c.indice !== idxPrimariaGlobal &&
            !c.nombre.toLowerCase().includes("linea") &&
            !c.nombre.toLowerCase().includes("línea")
        ) ?? categoricas.find((c) => c.indice !== idxPrimariaGlobal);
        if (segunda) {
          idxSecundariaGlobal = segunda.indice;
          colCategorica2 = segunda.nombre;
        }
      }

      // Check fill rate of primary category; fall back to texto_libre if nearly empty
      const muestraFill = (rows as unknown[][]).slice(1, 101);
      if (idxPrimariaGlobal >= 0 && muestraFill.length > 0) {
        const llenado = muestraFill.filter(
          (r) => String(r[idxPrimariaGlobal] ?? "").trim()
        ).length;
        if (llenado / muestraFill.length < 0.05) {
          idxPrimariaGlobal = -1;
          colCategorica1 = null;
        }
      }
      if (idxPrimariaGlobal < 0 && muestraFill.length > 0) {
        const textoLibres = columnasGlobales.filter((c) => c.tipo === "texto_libre");
        for (const col of textoLibres) {
          const llenado = muestraFill.filter(
            (r) => String(r[col.indice] ?? "").trim()
          ).length;
          if (llenado / muestraFill.length > 0.5) {
            idxPrimariaGlobal = col.indice;
            colCategorica1 = col.nombre;
            colCategoricaEsTexto = true;
            break;
          }
        }
      }

      // Semantic: hora columns (structural fallback preserving ingreso/derivación heuristic)
      idxHoraGlobal = idx("HoraPrincipal");
      idxHoraDerivacionGlobal = idx("HoraDerivacion");
      if (idxHoraGlobal < 0) {
        const colsHora = columnasGlobales.filter((c) => c.tipo === "hora");
        const colHoraIngreso = colsHora.find((c) => {
          const n = c.nombre.toLowerCase();
          return n.includes("ingreso") || n.includes("entrada");
        });
        const colHoraDerivacion = colsHora.find((c) => {
          const n = c.nombre.toLowerCase();
          return (
            n.includes("derivaci") ||
            n.includes("salida") ||
            n.includes("egreso") ||
            n.includes("despacho") ||
            n.includes("derivado")
          );
        });
        idxHoraGlobal = (colHoraIngreso ?? colsHora[0])?.indice ?? -1;
        idxHoraDerivacionGlobal =
          colHoraDerivacion?.indice ??
          (colsHora.length >= 2
            ? colsHora.find((c) => c.indice !== idxHoraGlobal)?.indice ?? -1
            : -1);
      }
      tieneHoraDerivacion =
        idxHoraDerivacionGlobal >= 0 && idxHoraDerivacionGlobal !== idxHoraGlobal;

      // Detect programacion column — structural type, no semantic concept yet
      const colsProg = columnasGlobales.filter((c) => c.tipo === "programacion");
      if (colsProg.length > 0) {
        idxProgramacionGlobal = colsProg[0].indice;
        tieneColumnaProgramacion = true;
      }
    }

    let sheetHasData = false;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] as unknown[];

      const valPrimaria =
        idxPrimariaGlobal >= 0
          ? (colCategoricaEsTexto
            ? String(row[idxPrimariaGlobal] ?? "").trim().slice(0, 60)
            : String(row[idxPrimariaGlobal] ?? "").trim())
          : "";
      const valSecundaria =
        idxSecundariaGlobal >= 0 ? String(row[idxSecundariaGlobal] ?? "").trim() : "";
      const idVal = idxIdGlobal >= 0 ? row[idxIdGlobal] : "";

      const allEmpty = headers.every(
        (_, hi) => !String(row[hi] ?? "").trim()
      );
      if (allEmpty) continue;

      const resueltoVal =
        idxResueltoGlobal >= 0 ? String(row[idxResueltoGlobal] ?? "").trim() : "";
      const resolucionVal =
        idxResolucionGlobal >= 0 ? String(row[idxResolucionGlobal] ?? "").trim() : "";
      const descripcionText =
        idxDescGlobal >= 0 ? String(row[idxDescGlobal] ?? "").trim() : "";

      // Extract programacion flag (before hora, so hora filtering can use it)
      let esProgramado: boolean | null = null;
      if (idxProgramacionGlobal >= 0) {
        const progRaw = String(row[idxProgramacionGlobal] ?? "").replace(/\s+/g, " ").trim();
        // "No Programado" variants must be checked FIRST to avoid matching "programado" inside
        if (/^(no\s+programado[s]?|np|n\/p)(\s.*)?$/i.test(progRaw)) {
          esProgramado = false;
        } else if (/^(programado[s]?|p)(\s.*)?$/i.test(progRaw)) {
          esProgramado = true;
        }
      }

      const falsoPositivoEtiqueta = detectarFalsoPositivo(descripcionText, resolucionVal);

      // Derive mesNombreEfectivo and fechaStr — per-row in single-sheet mode; validate date in all modes
      let mesNombreEfectivo: string;
      let fechaStr: string;
      if (modoHojaUnica) {
        const rawDate = idxFechaGlobal >= 0 ? row[idxFechaGlobal] : "";
        const parsed = parsearMesDesdeValor(rawDate);
        if (!parsed) {
          registrosSinFechaValida++;
          continue;
        }
        mesNombreEfectivo = parsed.mes;
        fechaStr = parsed.fecha;
        if (!ordenMeses.includes(mesNombreEfectivo)) ordenMeses.push(mesNombreEfectivo);
      } else {
        // Multi-sheet mode: validate date when a fecha column exists; quarantine rows with null/invalid dates
        if (idxFechaGlobal >= 0) {
          const rawDate = row[idxFechaGlobal];
          const parsed = parsearMesDesdeValor(rawDate);
          if (!parsed) {
            registrosSinFechaValida++;
            continue;
          }
          fechaStr = parsed.fecha;
        } else {
          fechaStr = "";
        }
        mesNombreEfectivo = mesNombreHoja!;
      }

      // Extract hora de ingreso — used for porHora distribution and the `hora` field
      let horaNum: number | null = null;
      let horaIngresoMin: number | null = null;
      if (idxHoraGlobal >= 0) {
        horaIngresoMin = parsearHoraEnMinutos(row[idxHoraGlobal]);
        if (horaIngresoMin !== null) {
          horaNum = Math.floor(horaIngresoMin / 60);
        }
      }

      // Extract hora de derivación and compute internal response time
      let horaDerivacionNum: number | null = null;
      let tiempoRespuestaInternoMin: number | null = null;
      if (tieneHoraDerivacion && idxHoraDerivacionGlobal >= 0) {
        const derivMin = parsearHoraEnMinutos(row[idxHoraDerivacionGlobal]);
        if (derivMin !== null) {
          horaDerivacionNum = Math.floor(derivMin / 60);
          if (horaIngresoMin !== null) {
            let diff = derivMin - horaIngresoMin;
            // Handle crossing midnight: if negative, add 24h
            if (diff < 0) diff += 1440;
            // Cap at 24h (1440 min) to avoid data entry errors
            if (diff <= 1440) tiempoRespuestaInternoMin = diff;
          }
        }
      }

      solicitudes.push({
        id: Number(idVal) || 0,
        mes: mesNombreEfectivo,
        fecha: fechaStr,
        hora: horaNum,
        horaDerivacion: horaDerivacionNum,
        tiempoRespuestaInternoMin,
        motivo: valPrimaria || (colCategoricaEsTexto ? "" : "Sin datos"),
        descripcion: descripcionText,
        areaAsignada: valSecundaria || "Sin área",
        resuelto: resueltoVal,
        linea:
          idxLineaGlobal >= 0 ? String(row[idxLineaGlobal] ?? "").trim() : "",
        calle1:
          idxCalle1Global >= 0 ? String(row[idxCalle1Global] ?? "").trim() : "",
        calle2:
          idxCalle2Global >= 0 ? String(row[idxCalle2Global] ?? "").trim() : "",
        calle3:
          idxCalle3Global >= 0 ? String(row[idxCalle3Global] ?? "").trim() : "",
        tiempoRespuestaMin: calcularMinutos(
          idxTiempoGlobal >= 0 ? row[idxTiempoGlobal] : 0
        ),
        resolucion: resolucionVal,
        esFalsoPositivo: falsoPositivoEtiqueta !== null,
        esRecurrente: false,
        esProgramado,
      });

      const valores: Record<string, string> = {};
      headers.forEach((h, hi) => {
        valores[h] = String(row[hi] ?? "").trim();
      });
      registros.push({ _mes: mesNombreEfectivo, _fecha: fechaStr, valores });

      sheetHasData = true;
    }

    if (!modoHojaUnica && sheetHasData && mesNombreHoja && !ordenMeses.includes(mesNombreHoja)) {
      ordenMeses.push(mesNombreHoja);
    }
  }

  // In single-sheet mode, sort months chronologically by year then month
  if (modoHojaUnica && ordenMeses.length > 1) {
    const mesOrden: Record<string, number> = {};
    Object.entries(MESES_NUM).forEach(([k, v]) => { mesOrden[v] = parseInt(k, 10); });
    ordenMeses = ordenMeses.sort((a, b) => {
      const [mA, yA] = a.split(" ");
      const [mB, yB] = b.split(" ");
      const yAn = parseInt(yA ?? "0", 10);
      const yBn = parseInt(yB ?? "0", 10);
      if (yAn !== yBn) return yAn - yBn;
      return (mesOrden[mA] ?? 0) - (mesOrden[mB] ?? 0);
    });
  }

  if (solicitudes.length === 0) {
    if (modoHojaUnica && registrosSinFechaValida > 0) {
      throw new Error(
        `Se encontraron ${registrosSinFechaValida} registros pero ninguno tiene fecha válida. ` +
        "Verificá que exista una columna de fecha con valores en formato DD/MM/YYYY, YYYY-MM-DD o similar, " +
        "y que las fechas estén dentro del rango 2000-2050."
      );
    }
    if (modoHojaUnica) {
      throw new Error(
        "No se encontraron registros en el archivo. " +
        "Verificá que la primera fila contenga los encabezados de columnas y que haya una columna de fecha."
      );
    }
    throw new Error(
      "No se encontraron registros en el archivo. " +
      "Verificá que las hojas tengan nombres de mes (ej: Nov-2025, Ene-2026, 2026-03) " +
      "y que la primera fila de cada hoja contenga los encabezados de columnas."
    );
  }

  const totalSolicitudes = solicitudes.length;
  const totalResueltas = solicitudes.filter((s) =>
    esResuelta(s.resuelto, s.resolucion)
  ).length;
  const totalNoResueltas = totalSolicitudes - totalResueltas;
  const tasaResolucion =
    totalSolicitudes > 0
      ? Math.round((totalResueltas / totalSolicitudes) * 100)
      : 0;

  const porMotivo = calcularPorMotivo(solicitudes);
  const porArea = calcularPorArea(solicitudes);

  const mesMap = new Map<string, { cantidad: number; resueltas: number; programados: number; noProgramados: number }>();
  solicitudes.forEach((s) => {
    const actual = mesMap.get(s.mes) ?? { cantidad: 0, resueltas: 0, programados: 0, noProgramados: 0 };
    mesMap.set(s.mes, {
      cantidad: actual.cantidad + 1,
      resueltas: actual.resueltas + (esResuelta(s.resuelto, s.resolucion) ? 1 : 0),
      programados: actual.programados + (s.esProgramado === true ? 1 : 0),
      noProgramados: actual.noProgramados + (s.esProgramado === false ? 1 : 0),
    });
  });
  const porMes = ordenMeses
    .filter((m) => mesMap.has(m))
    .map((m) => ({
      mes: m,
      cantidad: mesMap.get(m)!.cantidad,
      resueltas: mesMap.get(m)!.resueltas,
      programados: mesMap.get(m)!.programados,
      noProgramados: mesMap.get(m)!.noProgramados,
    }));

  const resolucionPorMotivo = calcularResolucion(solicitudes, "motivo");
  const resolucionPorArea = calcularResolucion(solicitudes, "areaAsignada");

  const porLinea = calcularPorLinea(solicitudes);
  const porCalle = calcularPorCalle(solicitudes);
  const porSegmento = calcularPorSegmento(solicitudes);
  const porCalle1Ranking = calcularPorCalle1Ranking(solicitudes);
  const { porDiaSemana } = calcularPorDiaSemana(solicitudes);
  const porTiempoRespuestaArea = calcularPorTiempoRespuestaArea(solicitudes);
  const porHora = calcularPorHora(solicitudes);
  const porInterseccion = calcularPorInterseccion(solicitudes);

  // ── Derived field 1: False positive aggregates ──────────────────────────────
  const totalFalsosPositivos = solicitudes.filter((s) => s.esFalsoPositivo).length;
  const tasaFalsosPositivos =
    totalSolicitudes > 0
      ? Math.round((totalFalsosPositivos / totalSolicitudes) * 100)
      : 0;
  const tiposFalsosPositivos = calcularTiposFalsosPositivos(solicitudes);

  // ── Derived field 2: Recurrence detection ───────────────────────────────────
  // Build map: motivo\x00interseccion → { meses, solicitudesIdx, motivo, interseccion }
  const recurrenciaMap = new Map<
    string,
    { meses: Set<string>; idx: number[]; motivo: string; interseccion: string }
  >();
  solicitudes.forEach((s, i) => {
    if (!s.motivo || s.motivo === "Sin datos") return;
    const interseccion = canonicalizarInterseccion(s.calle1, s.calle2);
    if (!interseccion) return;
    const key = `${s.motivo}\x00${interseccion}`;
    const existing = recurrenciaMap.get(key);
    if (existing) {
      existing.meses.add(s.mes);
      existing.idx.push(i);
    } else {
      recurrenciaMap.set(key, {
        meses: new Set([s.mes]),
        idx: [i],
        motivo: s.motivo,
        interseccion,
      });
    }
  });

  // Backfill esRecurrente on solicitudes where ≥2 distinct months appear
  recurrenciaMap.forEach(({ meses, idx }) => {
    if (meses.size >= 2) {
      idx.forEach((i) => {
        solicitudes[i].esRecurrente = true;
      });
    }
  });

  // Build crucesCronicos (top 20)
  const crucesCronicos: CruceCronico[] = [];
  recurrenciaMap.forEach(({ meses, idx, motivo, interseccion }) => {
    if (meses.size >= 2) {
      crucesCronicos.push({
        interseccion,
        motivo,
        meses: Array.from(meses),
        cantidad: idx.length,
      });
    }
  });
  crucesCronicos.sort((a, b) => b.cantidad - a.cantidad);
  const top20CrucesCronicos = crucesCronicos.slice(0, 20);

  // ── Derived field 3: Response time by category (motivo) ─────────────────────
  const tiempoRespuestaPorMotivo = calcularTiempoRespuestaPorMotivo(solicitudes);

  // ── Derived field 4: Fragility index per zone ───────────────────────────────
  const globalSolsConTiempo = solicitudes.filter((s) => s.tiempoRespuestaMin > 0);
  const globalAvgTiempo =
    globalSolsConTiempo.length > 0
      ? globalSolsConTiempo.reduce((sum, s) => sum + s.tiempoRespuestaMin, 0) /
        globalSolsConTiempo.length
      : 0;

  interface ZonaStats {
    zona: string;
    volumen: number;
    cantRecurrentes: number;
    sumaTiempo: number;
    contTiempo: number;
  }
  const zonaStatsMap = new Map<string, ZonaStats>();
  solicitudes.forEach((s) => {
    const interseccion = canonicalizarInterseccion(s.calle1, s.calle2);
    if (!interseccion) return;
    const existing = zonaStatsMap.get(interseccion) ?? {
      zona: interseccion,
      volumen: 0,
      cantRecurrentes: 0,
      sumaTiempo: 0,
      contTiempo: 0,
    };
    existing.volumen += 1;
    if (s.esRecurrente) existing.cantRecurrentes += 1;
    if (s.tiempoRespuestaMin > 0) {
      existing.sumaTiempo += s.tiempoRespuestaMin;
      existing.contTiempo += 1;
    }
    zonaStatsMap.set(interseccion, existing);
  });

  const zonasCalificables = Array.from(zonaStatsMap.values()).filter(
    (z) => z.volumen >= 3
  );
  const maxVolumen = zonasCalificables.reduce(
    (max, z) => Math.max(max, z.volumen),
    1
  );
  const indiceFragilidad: ZonaFragilidad[] = zonasCalificables
    .map((z) => {
      const volNorm = z.volumen / maxVolumen;
      const tasaRecurrencia = z.volumen > 0 ? z.cantRecurrentes / z.volumen : 0;
      const tiempoPromedio =
        z.contTiempo > 0 ? Math.round(z.sumaTiempo / z.contTiempo) : 0;
      const factorTiempo =
        globalAvgTiempo > 0 && tiempoPromedio > 0
          ? Math.min(tiempoPromedio / globalAvgTiempo, 3)
          : 1;
      const puntuacion =
        Math.round(volNorm * (1 + tasaRecurrencia) * factorTiempo * 100) / 100;
      return {
        zona: z.zona,
        puntuacion,
        volumen: z.volumen,
        tasaRecurrencia: Math.round(tasaRecurrencia * 100),
        tiempoPromedio,
      };
    })
    .sort((a, b) => b.puntuacion - a.puntuacion)
    .slice(0, 20);

  // ── Derived field 5: Dataset quality stats ──────────────────────────────────
  const total = solicitudes.length;
  const pctSinFecha =
    total > 0
      ? Math.round((solicitudes.filter((s) => !s.fecha).length / total) * 100)
      : 0;
  const pctSinCategoria =
    total > 0
      ? Math.round(
          (solicitudes.filter((s) => !s.motivo || s.motivo === "Sin datos").length /
            total) *
            100
        )
      : 0;
  const pctSinUbicacion =
    total > 0
      ? Math.round(
          (solicitudes.filter((s) => !s.calle1 && !s.calle2).length / total) * 100
        )
      : 0;
  // When there is a programacion column, measure pctSinHora only over non-programados
  const baseParaHora = tieneColumnaProgramacion
    ? solicitudes.filter((s) => s.esProgramado === false)
    : solicitudes;
  const pctSinHora =
    baseParaHora.length > 0
      ? Math.round((baseParaHora.filter((s) => s.hora === null).length / baseParaHora.length) * 100)
      : 0;
  const pctSinResolucion =
    total > 0
      ? Math.round(
          (solicitudes.filter((s) => !s.resuelto && !s.resolucion).length / total) *
            100
        )
      : 0;

  const columnasDetectadas = columnasGlobales
    .filter((c) => c.tipo !== "ignorar")
    .map((c) => c.nombre);

  const sugerencias: string[] = [];
  if (pctSinFecha > 5)
    sugerencias.push(
      `${pctSinFecha}% de los registros no tienen fecha — considerá hacer el campo de fecha obligatorio en el sistema de carga.`
    );
  if (pctSinCategoria > 20)
    sugerencias.push(
      `${pctSinCategoria}% de los registros no tienen categoría/motivo — un menú desplegable normalizado reduciría el ruido y facilitaría el análisis.`
    );
  if (pctSinUbicacion > 30)
    sugerencias.push(
      `${pctSinUbicacion}% de los registros no tienen ubicación — considerá hacer el campo de calles obligatorio para habilitar el análisis espacial.`
    );
  if (tieneColumnaProgramacion) {
    if (pctSinHora > 10)
      sugerencias.push(
        `${pctSinHora}% de los sucesos No Programados no tienen hora registrada — dato crítico para el análisis de pico operativo.`
      );
  } else if (pctSinHora > 50) {
    sugerencias.push(
      `${pctSinHora}% de los registros no tienen hora — registrar la hora de ingreso habilitaría análisis de pico operativo y tiempos de respuesta reales.`
    );
  }
  if (tieneColumnaStatus && pctSinResolucion > 30)
    sugerencias.push(
      `${pctSinResolucion}% de los registros no tienen resolución registrada — completar este campo mejoraría el análisis de eficiencia y tasa de cierre.`
    );
  if (totalFalsosPositivos > 0 && tasaFalsosPositivos >= 10)
    sugerencias.push(
      `${tasaFalsosPositivos}% de los registros parecen ser falsos positivos operativos (ej: "no se visualiza", "sin novedad") — evaluar si estos deben separarse o codificarse con un campo de tipo de cierre.`
    );
  if (sugerencias.length === 0)
    sugerencias.push(
      "El dataset tiene buena calidad general — todos los campos clave presentan buen nivel de completitud."
    );

  // Quarantine notice — prepend so it's always the first suggestion
  if (registrosSinFechaValida > 0) {
    sugerencias.unshift(
      `${registrosSinFechaValida} registro${registrosSinFechaValida !== 1 ? "s" : ""} ${registrosSinFechaValida !== 1 ? "fueron excluidos" : "fue excluido"} del análisis por tener fecha inválida, ausente o futura. Revisá la columna de fecha en el archivo original para corregir estos registros.`
    );
  }

  const totalProgramados = tieneColumnaProgramacion
    ? solicitudes.filter((s) => s.esProgramado === true).length
    : 0;
  const totalNoProgramados = tieneColumnaProgramacion
    ? solicitudes.filter((s) => s.esProgramado === false).length
    : 0;

  const calidadDataset: CalidadDataset = {
    pctSinFecha,
    pctSinCategoria,
    pctSinUbicacion,
    pctSinHora,
    pctSinResolucion,
    columnasDetectadas,
    sugerencias,
    tieneColumnaProgramacion,
    registrosSinFechaValida,
    modoHojaUnica,
  };

  // ── Global fill-rate check for status column: if <5% of all solicitudes have a resuelto value, suppress
  if (tieneColumnaStatus && solicitudes.length > 0) {
    const conResuelto = solicitudes.filter((s) => s.resuelto.length > 0).length;
    if (conResuelto / solicitudes.length < 0.05) {
      tieneColumnaStatus = false;
    }
  }

  // Determine dataset type
  const tieneCallesMultiples = columnasGlobales.filter((c) => c.tipo === "direccion").length >= 2;
  let tipoDato: TipoDato = 'generico';
  if (tieneColumnaStatus || tieneColumnaLinea) {
    tipoDato = 'solicitudes';
  } else if (tieneCallesMultiples && porHora.length > 0) {
    tipoDato = 'sucesos';
  } else if (tieneCallesMultiples || porHora.length > 0 || porInterseccion.length > 0) {
    tipoDato = 'sucesos';
  }

  // Build automatic cross-tabulations
  const crucesAutomaticos: CruceAutomatico[] = [];
  const topCatsCruce = porMotivo.filter((m) => m.nombre && m.nombre !== "Sin datos").slice(0, 8).map((m) => m.nombre);

  const cruceHora = calcularCruceCategoriaHora(
    solicitudes,
    topCatsCruce,
    `${colCategorica1 ?? "Categoría"} por hora del día`
  );
  if (cruceHora) crucesAutomaticos.push(cruceHora);

  const cruceDia = calcularCruceCategoriaDia(
    solicitudes,
    topCatsCruce,
    `${colCategorica1 ?? "Categoría"} por día de la semana`
  );
  if (cruceDia) crucesAutomaticos.push(cruceDia);

  if (topCatsCruce.length >= 2 && ordenMeses.length >= 2) {
    const catMesMap = new Map<string, Map<string, number>>();
    solicitudes.forEach((s) => {
      if (!s.motivo || s.motivo === "Sin datos") return;
      if (!topCatsCruce.includes(s.motivo)) return;
      const mm = catMesMap.get(s.motivo) ?? new Map<string, number>();
      mm.set(s.mes, (mm.get(s.mes) ?? 0) + 1);
      catMesMap.set(s.motivo, mm);
    });
    const mesConDatos = ordenMeses.filter((m) =>
      topCatsCruce.some((cat) => (catMesMap.get(cat)?.get(m) ?? 0) > 0)
    );
    if (mesConDatos.length >= 2) {
      const valores = topCatsCruce.map((cat) => {
        const mm = catMesMap.get(cat) ?? new Map<string, number>();
        return mesConDatos.map((m) => mm.get(m) ?? 0);
      });
      const colsMes = mesConDatos.map((m) => {
        const partes = m.split(" ");
        return partes.length >= 2 ? `${partes[0].slice(0, 3)} ${partes[1].slice(2)}` : m;
      });
      crucesAutomaticos.push({
        titulo: `${colCategorica1 ?? "Categoría"} por mes`,
        tipo: "categoria_dia",
        filas: topCatsCruce,
        columnas: colsMes,
        valores,
      });
    }
  }

  const columnasCategoricas = columnasGlobales.filter(
    (c) => c.tipo === "categorica"
  );
  const distribucionesCategoricas = columnasCategoricas
    .map((col) => {
      const distMap = new Map<string, number>();
      for (const reg of registros) {
        const val = (reg.valores[col.nombre] ?? "").trim();
        if (!val) continue;
        distMap.set(val, (distMap.get(val) ?? 0) + 1);
      }
      return {
        columna: col.nombre,
        datos: Array.from(distMap.entries())
          .map(([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad),
      };
    })
    .filter((d) => d.datos.length >= 2);

  // ── Capacidades del dataset ────────────────────────────────────────────────────
  // nMeses = porMes.length: meses del dataset COMPLETO antes de cualquier filtro.
  // Contrato: nunca pasar meses filtrados por la UI. Ver capacidades.ts.
  const capacidades = derivarCapacidades(
    diagnosticoSemantico?.mapa ?? {},
    porMes.length,
  );

  const calidad = calcularCalidad({
    porMotivo,
    porHora,
    porDiaSemana,
    porLinea,
    porCalle1Ranking,
    porTiempoRespuestaArea,
    tiempoRespuestaPorMotivo,
    meses: ordenMeses,
    calidadDataset,
    crucesCronicos: top20CrucesCronicos,
    indiceFragilidad,
  });

  // ── Tiempo de respuesta interno (hora de derivación − hora de ingreso) ────────
  const {
    promedio: tiempoRespuestaInternoPromedio,
    porMotivo: tiempoRespuestaInternoPorMotivo,
    porArea: tiempoRespuestaInternoPorArea,
    distribucion: distribucionTiempoRespuestaInterno,
  } = calcularTiempoRespuestaInterno(solicitudes);

  return {
    solicitudes,
    totalSolicitudes,
    totalResueltas,
    totalNoResueltas,
    tasaResolucion,
    porMotivo,
    porArea,
    porMes,
    resolucionPorMotivo,
    resolucionPorArea,
    porLinea,
    porCalle,
    porSegmento,
    porCalle1Ranking,
    porDiaSemana,
    porHora,
    porInterseccion,
    porTiempoRespuestaArea,
    tiempoRespuestaPorMotivo,
    crucesAutomaticos,
    meses: ordenMeses,

    totalFalsosPositivos,
    tasaFalsosPositivos,
    tiposFalsosPositivos,
    crucesCronicos: top20CrucesCronicos,
    indiceFragilidad,
    calidadDataset,

    tieneHoraDerivacion,
    tiempoRespuestaInternoPromedio,
    tiempoRespuestaInternoPorMotivo,
    tiempoRespuestaInternoPorArea,
    distribucionTiempoRespuestaInterno,

    columnas: columnasGlobales,
    colCategorica1,
    colCategorica2,
    colCategoricaEsTexto,
    distribucionesCategoricas,
    tipoDato,
    tieneColumnaStatus,
    etiquetaStatus,
    tieneColumnaProgramacion,
    totalProgramados,
    totalNoProgramados,
    colLinea,
    colCalle1,
    registros,
    mapaSemantico: diagnosticoSemantico ?? undefined,
    capacidades,
    calidad,
  };
}
