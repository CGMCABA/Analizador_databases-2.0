import type { ColumnaDetectada } from "@/lib/columnClassifier";
import type {
  AsignacionSemantica,
  ConceptoSemantico,
  ConflictoSemantico,
  DiagnosticoSemantico,
  EvidenciaDeteccion,
  FuenteDeteccion,
  MapaSemantico,
  SeñalDeteccion,
} from "./conceptos";
import { REGLAS_DETECCION } from "./aliases";

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Normaliza también guiones bajos/medios como separadores de token
function normalizarConTokens(s: string): string {
  return normalizar(s).replace(/[_\-]/g, " ").replace(/\s+/g, " ").trim();
}

// El needle debe iniciar en límite de palabra del haystack (inicio o después de espacio).
// No requiere borde al final: permite que el alias sea prefijo de un nombre más largo,
// ej: alias "hora llegada" coincide con "hora llegada cat", "calle 1" con "calle 1 principal".
function esPrefijo(haystack: string, needle: string): boolean {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${esc}`).test(haystack);
}

function buscarAlias(h: string, aliases: string[]): string | null {
  const hn = normalizar(h);
  const ht = normalizarConTokens(h);
  for (const a of aliases) {
    const an = normalizar(a);
    const at = normalizarConTokens(a);
    if (hn === an || ht === at) return a;  // coincidencia exacta (ambas formas)
    if (esPrefijo(ht, at)) return a;       // alias inicia en límite de palabra (form. tokens)
    if (esPrefijo(hn, an)) return a;       // alias inicia en límite de palabra (form. raw)
  }
  return null;
}

function extraerMuestras(columna: ColumnaDetectada, filas: unknown[][]): string[] {
  const muestras: string[] = [];
  for (const fila of filas) {
    const val = fila[columna.indice];
    if (val !== null && val !== undefined) {
      const s = String(val).trim();
      if (s !== "") muestras.push(s);
    }
    if (muestras.length >= 50) break;
  }
  return muestras;
}

export function detectarConceptos(
  columnas: ColumnaDetectada[],
  filas?: unknown[][]
): DiagnosticoSemantico {
  const mapa: MapaSemantico = {};
  const ordenDeteccion: ConceptoSemantico[] = [];
  const conflictosResueltos: ConflictoSemantico[] = [];
  const columnasAsignadas = new Map<number, ConceptoSemantico>();
  const totalFilas = filas?.length ?? 0;

  const reglasOrdenadas = [...REGLAS_DETECCION].sort((a, b) => a.prioridad - b.prioridad);

  for (const regla of reglasOrdenadas) {
    for (const columna of columnas) {
      if (columnasAsignadas.has(columna.indice)) continue;

      if (regla.excluirSiAsignado?.some((c) => mapa[c] !== undefined)) continue;

      // ── Señal: nombre ──────────────────────────────────────────────────────
      const señalNombre: SeñalDeteccion = { evaluada: false, resultado: false };
      if (regla.matchNombre) {
        señalNombre.evaluada = true;
        señalNombre.resultado = regla.matchNombre(columna.nombre);
      }

      // ── Señal: alias ───────────────────────────────────────────────────────
      const señalAlias: SeñalDeteccion & { coincidente?: string } = {
        evaluada: true,
        resultado: false,
      };
      {
        const coincidente = buscarAlias(columna.nombre, regla.aliases);
        señalAlias.resultado = coincidente !== null;
        if (coincidente !== null) señalAlias.coincidente = coincidente;
      }

      // ── Señal: valores ─────────────────────────────────────────────────────
      const señalValores: SeñalDeteccion & { muestrasEvaluadas?: number } = {
        evaluada: false,
        resultado: false,
      };
      if (regla.matchValores) {
        const muestras =
          columna.muestras.length >= 5
            ? columna.muestras
            : filas
            ? extraerMuestras(columna, filas)
            : [];
        if (muestras.length > 0) {
          señalValores.evaluada = true;
          señalValores.muestrasEvaluadas = muestras.length;
          señalValores.resultado = regla.matchValores(
            muestras,
            columna.cantidadUnicos,
            totalFilas,
          );
        }
      }

      // ── Señal: cardinalidad ────────────────────────────────────────────────
      const señalCardinalidad: SeñalDeteccion & {
        unicosDetectados?: number;
        totalFilas?: number;
      } = { evaluada: false, resultado: false };
      if (regla.matchCardinalidad) {
        señalCardinalidad.evaluada = true;
        señalCardinalidad.resultado = regla.matchCardinalidad(
          columna.cantidadUnicos,
          Math.max(totalFilas, 1),
        );
        señalCardinalidad.unicosDetectados = columna.cantidadUnicos;
        señalCardinalidad.totalFilas = totalFilas;
      }

      // ── Determinar fuente ganadora ─────────────────────────────────────────
      let fuente: FuenteDeteccion | null = null;
      let confianza = 0;

      if (señalNombre.resultado) {
        fuente = "nombre";
        confianza = 1.0;
      } else if (señalAlias.resultado) {
        fuente = "alias";
        confianza = 0.9;
      } else if (señalValores.resultado) {
        fuente = "valores";
        confianza = 0.75;
      } else if (señalCardinalidad.resultado) {
        fuente = "cardinalidad";
        confianza = 0.5;
      }

      if (fuente === null) continue;

      // ── Tensión semántica ──────────────────────────────────────────────────
      // El nombre indica un concepto pero los valores no lo respaldan.
      // La asignación se mantiene (semantics = intención); la tensión se documenta (calidad = validez).
      const tensionDetectada =
        (señalNombre.resultado || señalAlias.resultado) &&
        señalValores.evaluada &&
        !señalValores.resultado;

      const evidencia: EvidenciaDeteccion = {
        señales: {
          nombre: señalNombre,
          alias: señalAlias,
          valores: señalValores,
          cardinalidad: señalCardinalidad,
        },
        fuenteGanadora: fuente,
        confianza,
        tensionDetectada,
      };

      const asignacion: AsignacionSemantica = {
        concepto: regla.concepto,
        confianza,
        fuenteDeteccion: fuente,
        columnaOriginal: columna.nombre,
        indice: columna.indice,
        evidencia,
      };

      // ── Resolver conflicto (mismo concepto, dos columnas candidatas) ───────
      const existente = mapa[regla.concepto];

      if (existente !== undefined) {
        if (confianza > existente.confianza) {
          conflictosResueltos.push({
            columna: columna.nombre,
            candidatos: [
              { concepto: regla.concepto, confianza },
              { concepto: existente.concepto, confianza: existente.confianza },
            ],
            ganador: regla.concepto,
            motivo: `"${columna.nombre}" (${confianza}) supera a "${existente.columnaOriginal}" (${existente.confianza})`,
          });
          columnasAsignadas.delete(existente.indice);
          mapa[regla.concepto] = asignacion;
          columnasAsignadas.set(columna.indice, regla.concepto);
          ordenDeteccion.push(regla.concepto);
        }
      } else {
        mapa[regla.concepto] = asignacion;
        columnasAsignadas.set(columna.indice, regla.concepto);
        ordenDeteccion.push(regla.concepto);
      }
    }
  }

  const columnasSinConcepto = columnas
    .filter((c) => !columnasAsignadas.has(c.indice))
    .map((c) => c.nombre);

  return { mapa, ordenDeteccion, columnasSinConcepto, conflictosResueltos };
}
