export type ConceptoSemantico =
  | "FechaPrincipal"
  | "HoraPrincipal"
  | "FechaFin"
  | "HoraDerivacion"
  | "HoraLlegada"
  | "HoraRetiro"
  | "Categoria"
  | "Subcategoria"
  | "Severidad"
  | "TipoEvento"
  | "Programacion"
  | "Estado"
  | "ResultadoIntervencion"
  | "ResponsableOperativo"
  | "Cobertura"
  | "CallePrincipal"
  | "CalleSecundaria"
  | "CalleTerciaria"
  | "Territorio"
  | "Latitud"
  | "Longitud"
  | "Identificador"
  | "GrupoOperativo"
  | "TiempoRespuestaMin"
  | "TiempoOperativoMin"
  | "ActivoAfectado"
  | "TextoLibre";

export type FuenteDeteccion = "nombre" | "alias" | "valores" | "cardinalidad";

export interface SeñalDeteccion {
  evaluada: boolean;
  resultado: boolean;
  detalle?: string;
}

export interface EvidenciaDeteccion {
  señales: {
    nombre: SeñalDeteccion;
    alias: SeñalDeteccion & { coincidente?: string };
    valores: SeñalDeteccion & { muestrasEvaluadas?: number };
    cardinalidad: SeñalDeteccion & { unicosDetectados?: number; totalFilas?: number };
  };
  fuenteGanadora: FuenteDeteccion;
  confianza: number;
  tensionDetectada: boolean;
}

export interface AsignacionSemantica {
  concepto: ConceptoSemantico;
  confianza: number;
  fuenteDeteccion: FuenteDeteccion;
  columnaOriginal: string;
  indice: number;
  evidencia: EvidenciaDeteccion;
}

export type MapaSemantico = Partial<Record<ConceptoSemantico, AsignacionSemantica>>;

export interface ConflictoSemantico {
  columna: string;
  candidatos: { concepto: ConceptoSemantico; confianza: number }[];
  ganador: ConceptoSemantico;
  motivo: string;
}

export interface DiagnosticoSemantico {
  mapa: MapaSemantico;
  ordenDeteccion: ConceptoSemantico[];
  columnasSinConcepto: string[];
  conflictosResueltos: ConflictoSemantico[];
}
