/**
 * Sistema de capacidades del dataset.
 *
 * FRONTERA CONCEPTUAL — Capacidad estructural vs. calidad analítica
 * ─────────────────────────────────────────────────────────────────
 * Este módulo modela CAPACIDAD ESTRUCTURAL: "¿tiene el dataset las columnas
 * semánticas necesarias para soportar este análisis?"
 *
 * La CALIDAD ANALÍTICA — "¿tiene esta columna suficiente varianza y volumen
 * para que el análisis sea útil?" — es una capa distinta y no está implementada
 * aquí. `activa = true` significa que los datos existen; no garantiza que el
 * análisis produzca resultados estadísticamente significativos.
 *
 * Ejemplos de calidad que este módulo NO evalúa:
 *   - FechaPrincipal existe pero hay 2 registros (TemporalBasica = true)
 *   - Categoria existe pero tiene un solo valor único (Categoria = true)
 *   - Cobertura existe pero representa una sola línea (Cobertura = true)
 *
 * Los consumidores (Dashboard.tsx) deben combinar `activa` con controles
 * de volumen/varianza propios cuando la diferencia sea relevante para el usuario.
 */

import type { ConceptoSemantico, MapaSemantico } from "./semantica/conceptos";

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type CapacidadBasica =
  | "TemporalBasica"
  | "Horaria"
  | "Categoria"
  | "Responsables"
  | "Estado"
  | "Resolucion"
  | "Cobertura"
  | "GeograficaCalles"
  | "GeograficaCoordenadas"
  | "TipoEvento"
  | "Programacion"
  | "TiempoRespuesta"
  | "DerivacionInterna"
  | "Identificacion"
  | "Severidad"
  | "TextoLibre"
  | "Territorio";

/**
 * Capacidades derivadas: combinaciones de básicas que habilitan análisis
 * compuestos de esta aplicación. Los nombres siguen el vocabulario del
 * dashboard (no vocabulario semántico universal) para facilitar el mapeo
 * directo con las secciones y guards de Dashboard.tsx.
 *
 * NOTA: No incluir capacidades que no tengan implementación activa en
 * agregaciones.ts / Dashboard.tsx. Modelar features futuras en este catálogo
 * crea capacidades fantasma que nunca se activan de forma útil.
 */
export type CapacidadDerivada =
  | "Recurrencia"
  | "Fragilidad"
  | "CruceCategoriaMes"
  | "CruceCategoriaHora"
  | "CruceCategoriaCalle"
  | "CruceCategoriaCobertura"
  | "TiempoRespuestaGeografico";

export type NombreCapacidad = CapacidadBasica | CapacidadDerivada;

export interface CapacidadDataset {
  activa: boolean;
  confianza: number;
  tipo: "basica" | "derivada";
  /** Conceptos semánticos presentes en el mapa que aportan a esta capacidad */
  conceptosPresentes: ConceptoSemantico[];
  /** Conceptos semánticos requeridos que faltan en el mapa */
  conceptosFaltantes: ConceptoSemantico[];
  /**
   * Capacidades de las que depende esta capacidad (solo para derivadas).
   * Para básicas siempre es []. Permite rastrear cadenas de dependencia
   * para debugging, explicaciones y capacidades compuestas futuras.
   */
  dependencias: NombreCapacidad[];
  /**
   * Explicación legible de por qué la capacidad está inactiva.
   * null si la capacidad está activa.
   * Pre-computada en derivarCapacidades() — no requiere parámetros adicionales.
   */
  razonAusencia: string | null;
  /**
   * true si el único bloqueo es insuficiencia temporal (nMeses < mínimo requerido)
   * y las columnas necesarias sí existen. Permite al consumidor distinguir:
   *   false → "le falta información estructural, no cambiará"
   *   true  → "tiene la estructura, le falta historia acumulada"
   */
  restriccionTemporal: boolean;
}

export type CapacidadesDataset = Record<NombreCapacidad, CapacidadDataset>;

// ── Definición interna de requisitos por capacidad ────────────────────────────

interface RequisitosBasica {
  tipo: "basica";
  conceptosRequeridos: ConceptoSemantico[];
  conceptosOpcionales?: ConceptoSemantico[];
}

interface RequisitosDerivada {
  tipo: "derivada";
  capsRequeridas: NombreCapacidad[];
  /** Restricción de historia temporal mínima del dataset completo */
  nMesesMin?: number;
}

type Requisitos = RequisitosBasica | RequisitosDerivada;

const REQUISITOS: Record<NombreCapacidad, Requisitos> = {
  // ── Básicas ────────────────────────────────────────────────────────────────
  TemporalBasica: {
    tipo: "basica",
    conceptosRequeridos: ["FechaPrincipal"],
  },
  Horaria: {
    tipo: "basica",
    conceptosRequeridos: ["FechaPrincipal", "HoraPrincipal"],
  },
  Categoria: {
    tipo: "basica",
    conceptosRequeridos: ["Categoria"],
  },
  Responsables: {
    tipo: "basica",
    conceptosRequeridos: ["ResponsableOperativo"],
  },
  Estado: {
    tipo: "basica",
    conceptosRequeridos: ["Estado"],
  },
  Resolucion: {
    tipo: "basica",
    conceptosRequeridos: ["ResultadoIntervencion"],
  },
  Cobertura: {
    tipo: "basica",
    conceptosRequeridos: ["Cobertura"],
  },
  GeograficaCalles: {
    tipo: "basica",
    conceptosRequeridos: ["CallePrincipal"],
    conceptosOpcionales: ["CalleSecundaria", "CalleTerciaria"],
  },
  GeograficaCoordenadas: {
    tipo: "basica",
    conceptosRequeridos: ["Latitud", "Longitud"],
  },
  TipoEvento: {
    tipo: "basica",
    conceptosRequeridos: ["TipoEvento"],
  },
  Programacion: {
    tipo: "basica",
    conceptosRequeridos: ["Programacion"],
  },
  TiempoRespuesta: {
    tipo: "basica",
    conceptosRequeridos: ["TiempoRespuestaMin"],
  },
  DerivacionInterna: {
    tipo: "basica",
    conceptosRequeridos: ["HoraDerivacion"],
  },
  Identificacion: {
    tipo: "basica",
    conceptosRequeridos: ["Identificador"],
  },
  Severidad: {
    tipo: "basica",
    conceptosRequeridos: ["Severidad"],
  },
  TextoLibre: {
    tipo: "basica",
    conceptosRequeridos: ["TextoLibre"],
  },
  Territorio: {
    tipo: "basica",
    conceptosRequeridos: ["Territorio"],
  },

  // ── Derivadas ──────────────────────────────────────────────────────────────
  Recurrencia: {
    tipo: "derivada",
    capsRequeridas: ["TemporalBasica", "GeograficaCalles", "Categoria"],
    nMesesMin: 2,
  },
  Fragilidad: {
    // Hereda la restricción temporal de Recurrencia (nMeses >= 2 implícito).
    // No se declara nMesesMin aquí para evitar redundancia y confusión.
    tipo: "derivada",
    capsRequeridas: ["Recurrencia"],
  },
  CruceCategoriaMes: {
    tipo: "derivada",
    capsRequeridas: ["Categoria", "TemporalBasica"],
    nMesesMin: 2,
  },
  CruceCategoriaHora: {
    tipo: "derivada",
    capsRequeridas: ["Categoria", "Horaria"],
  },
  CruceCategoriaCalle: {
    tipo: "derivada",
    capsRequeridas: ["Categoria", "GeograficaCalles"],
  },
  CruceCategoriaCobertura: {
    tipo: "derivada",
    capsRequeridas: ["Categoria", "Cobertura"],
  },
  TiempoRespuestaGeografico: {
    tipo: "derivada",
    capsRequeridas: ["TiempoRespuesta", "GeograficaCalles"],
  },
};

/**
 * Orden topológico explícito para capacidades derivadas.
 *
 * INVARIANTE: cada capacidad debe aparecer después de todas las capacidades
 * derivadas de las que depende. Las que solo dependen de básicas pueden ir
 * en cualquier posición.
 *
 * Cadenas actuales que imponen orden:
 *   Recurrencia → Fragilidad  (Fragilidad depende de Recurrencia)
 *
 * Si se agrega una cap que depende de otra derivada, actualizar este array
 * manteniendo el invariante.
 */
const ORDEN_DERIVADAS: CapacidadDerivada[] = [
  "Recurrencia",              // solo deps básicas → puede ir primero
  "Fragilidad",               // depende de Recurrencia → debe ir después
  "CruceCategoriaMes",        // solo deps básicas
  "CruceCategoriaHora",       // solo deps básicas
  "CruceCategoriaCalle",      // solo deps básicas
  "CruceCategoriaCobertura",  // solo deps básicas
  "TiempoRespuestaGeografico", // solo deps básicas
];

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Deriva el conjunto de capacidades del dataset a partir de su mapa semántico.
 *
 * CONTRATO DE nMeses:
 *   - Debe ser el número de meses del DATASET COMPLETO tal como fue cargado.
 *   - Proviene de parsearExcel(); nunca de filtrarDatos() ni de una vista filtrada.
 *   - Las capacidades son propiedades del archivo fuente, no del período seleccionado.
 *   - Ejemplo incorrecto: pasar meses.length después de aplicar un filtro mensual.
 *   - Ejemplo correcto: pasar porMes.length calculado sobre el dataset sin filtrar.
 *
 * Llamar esta función una sola vez por carga de archivo. El resultado es estático
 * para ese dataset y no debe recalcularse al cambiar filtros de la UI.
 */
export function derivarCapacidades(
  mapa: MapaSemantico,
  nMeses: number,
): CapacidadesDataset {
  const resultado = {} as CapacidadesDataset;

  // ── Pasada 1: capacidades básicas ─────────────────────────────────────────
  for (const [nombre, req] of Object.entries(REQUISITOS) as [NombreCapacidad, Requisitos][]) {
    if (req.tipo !== "basica") continue;

    const presentes: ConceptoSemantico[] = [];
    const faltantes: ConceptoSemantico[] = [];

    for (const c of req.conceptosRequeridos) {
      if (mapa[c] !== undefined) presentes.push(c);
      else faltantes.push(c);
    }
    for (const c of req.conceptosOpcionales ?? []) {
      if (mapa[c] !== undefined) presentes.push(c);
    }

    const esActiva = faltantes.length === 0;
    const confianza = esActiva
      ? Math.min(...req.conceptosRequeridos.map((c) => mapa[c]!.confianza))
      : 0;

    resultado[nombre] = {
      activa: esActiva,
      confianza,
      tipo: "basica",
      conceptosPresentes: presentes,
      conceptosFaltantes: faltantes,
      dependencias: [],
      razonAusencia: esActiva
        ? null
        : `Faltan columnas: ${faltantes.join(", ")}`,
      restriccionTemporal: false,
    };
  }

  // ── Pasada 2: capacidades derivadas en orden topológico ───────────────────
  // Se usa ORDEN_DERIVADAS (no Object.entries) para garantizar que una cap
  // derivada que depende de otra derivada (ej: Fragilidad→Recurrencia) siempre
  // lee un resultado ya calculado, sin importar el orden de las keys en REQUISITOS.
  for (const nombre of ORDEN_DERIVADAS) {
    const req = REQUISITOS[nombre] as RequisitosDerivada;

    const capsInactivas = req.capsRequeridas.filter((c) => !resultado[c]?.activa);
    const cumpleNMeses = req.nMesesMin === undefined || nMeses >= req.nMesesMin;

    const esActiva = capsInactivas.length === 0 && cumpleNMeses;

    const confianza = esActiva
      ? Math.min(...req.capsRequeridas.map((c) => resultado[c].confianza))
      : 0;

    const conceptosPresentes = Array.from(
      new Set(req.capsRequeridas.flatMap((c) => resultado[c]?.conceptosPresentes ?? [])),
    );
    const conceptosFaltantes = Array.from(
      new Set(req.capsRequeridas.flatMap((c) => resultado[c]?.conceptosFaltantes ?? [])),
    );

    // ── Razón de ausencia pre-computada ──────────────────────────────────────
    let razonAusencia: string | null = null;
    let restriccionTemporal = false;

    if (!esActiva) {
      const razones: string[] = [];

      if (capsInactivas.length > 0) {
        razones.push(`Capacidades inactivas: ${capsInactivas.join(", ")}`);
      }

      if (!cumpleNMeses) {
        razones.push(`Requiere ≥${req.nMesesMin} meses (dataset tiene ${nMeses})`);
        // Restricción temporal pura: las columnas existen, solo falta historia
        restriccionTemporal = capsInactivas.length === 0;
      }

      razonAusencia = razones.join("; ");
    }

    resultado[nombre] = {
      activa: esActiva,
      confianza,
      tipo: "derivada",
      conceptosPresentes,
      conceptosFaltantes,
      dependencias: req.capsRequeridas,
      razonAusencia,
      restriccionTemporal,
    };
  }

  return resultado;
}

// ── Helpers de consulta ───────────────────────────────────────────────────────

export function activa(
  caps: CapacidadesDataset,
  nombre: NombreCapacidad,
): boolean {
  return caps[nombre].activa;
}

/**
 * Devuelve la explicación pre-computada de por qué la capacidad está inactiva,
 * o null si está activa.
 */
export function explicarAusencia(
  caps: CapacidadesDataset,
  nombre: NombreCapacidad,
): string | null {
  return caps[nombre].razonAusencia;
}
