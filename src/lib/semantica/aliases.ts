import type { ConceptoSemantico } from "./conceptos";

export interface ReglaDeteccion {
  concepto: ConceptoSemantico;
  prioridad: number;
  excluirSiAsignado?: ConceptoSemantico[];
  aliases: string[];
  matchNombre?: (h: string) => boolean;
  matchValores?: (muestras: string[], cantidadUnicos: number, totalFilas: number) => boolean;
  matchCardinalidad?: (cantidadUnicos: number, totalFilas: number) => boolean;
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function incluyeAlguno(h: string, terminos: string[]): boolean {
  const hn = normalizar(h);
  return terminos.some((t) => hn.includes(normalizar(t)));
}

// Igual que incluyeAlguno pero requiere límite de palabra al inicio del término.
// Evita que tokens cortos como "lat", "lon", "id" coincidan como subcadenas internas.
function incluyeToken(h: string, termino: string): boolean {
  const ht = normalizar(h).replace(/[_\-]/g, " ");
  const esc = normalizar(termino).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${esc}`).test(ht);
}

function esIgualAlguno(h: string, terminos: string[]): boolean {
  const hn = normalizar(h);
  return terminos.some((t) => hn === normalizar(t));
}

function esNumeroDecimal(v: string): boolean {
  return /^-?\d+([.,]\d+)?$/.test(v.trim());
}

function esFecha(v: string): boolean {
  return (
    /^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$/.test(v.trim()) ||
    /^\d{4}[/\-]\d{1,2}[/\-]\d{1,2}$/.test(v.trim())
  );
}

function esHora(v: string): boolean {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(v.trim()) || /^\d{1,2}h\d{2}$/i.test(v.trim());
}

function esNumeroEnteroPositivo(v: string): boolean {
  return /^\d+$/.test(v.trim());
}

const VALORES_TIPO_EVENTO = [
  "alerta", "incidente", "solicitud", "reclamo", "consulta", "denuncia",
  "infraccion", "accidente", "programado", "no programado",
  "programada", "no programada",
];

const VALORES_ESTADO = [
  "si", "sí", "no", "resuelto", "pendiente", "cerrado", "abierto",
  "finalizado", "en curso",
];

const VALORES_RESULTADO = [
  "resuelto", "sin novedad", "derivado", "no corresponde",
  "falso positivo", "en tramite", "archivado",
];

const VALORES_SEVERIDAD = [
  "alta", "media", "baja", "critica", "crítica", "urgente",
  "normal", "leve", "grave",
];

export const REGLAS_DETECCION: ReglaDeteccion[] = [
  // ── Coordenadas ───────────────────────────────────────────────────────────
  {
    concepto: "Latitud",
    prioridad: 5,
    aliases: ["latitud", "lat", "latitude", "coord_y", "coordenada_y", "y_coord"],
    // incluyeToken para "lat": evita falso positivo en "plataforma", "relativo", etc.
    matchNombre: (h) =>
      incluyeToken(h, "latitud") || incluyeToken(h, "lat") || esIgualAlguno(h, ["y"]),
    // matchValores ELIMINADO: demasiados falsos positivos con binarias, enteros, horas y secuenciales.
    // Cuando un dataset tiene coordenadas, el nombre siempre las identifica ("lat", "latitud", "coord_y").
  },
  {
    concepto: "Longitud",
    prioridad: 5,
    aliases: ["longitud", "lon", "lng", "longitude", "coord_x", "coordenada_x", "x_coord"],
    matchNombre: (h) =>
      incluyeToken(h, "longitud") || incluyeToken(h, "lon") || incluyeToken(h, "lng") || esIgualAlguno(h, ["x"]),
    // matchValores ELIMINADO: misma razón que Latitud.
  },

  // ── Identificador ─────────────────────────────────────────────────────────
  {
    concepto: "Identificador",
    prioridad: 10,
    aliases: [
      "id", "numero", "número", "nro", "nro.", "expediente",
      "cod", "codigo", "código", "ticket", "case_id", "folio",
    ],
    matchNombre: (h) => {
      // esIgualAlguno es seguro (exact match)
      if (esIgualAlguno(h, ["id", "nro", "numero", "número", "n°", "folio", "ticket"])) return true;
      // "id" como subcadena requiere límite de palabra: evita "critic_id_ad", "rapid_id_ez"
      const ht = normalizar(h).replace(/[_\-]/g, " ");
      const tieneId = /(^|\s)id(\s|$)/.test(ht);
      return (
        (tieneId || incluyeAlguno(h, ["numero", "número", "codigo", "código"])) &&
        !incluyeAlguno(h, ["motivo", "area", "estado", "tipo"])
      );
    },
    matchCardinalidad: (unicos, total) => total > 0 && unicos / total > 0.95,
  },

  // ── Fechas ────────────────────────────────────────────────────────────────
  {
    concepto: "FechaFin",
    prioridad: 15,
    aliases: [
      "fecha fin", "fecha_fin", "fecha cierre", "fecha_cierre",
      "fecha resolucion", "fecha_resolucion", "fecha resolución", "fecha_resolución",
      "fecha baja", "fecha_baja", "fecha egreso", "fecha_egreso",
    ],
    matchNombre: (h) =>
      incluyeAlguno(h, ["fin", "cierre", "resolucion", "resolución", "baja", "egreso"]) &&
      incluyeAlguno(h, ["fecha"]),
    matchValores: (muestras) =>
      muestras.length > 0 && muestras.filter(esFecha).length >= muestras.length * 0.6,
  },
  {
    concepto: "FechaPrincipal",
    prioridad: 20,
    aliases: [
      "fecha", "fecha ingreso", "fecha_ingreso", "fecha alta", "fecha_alta",
      "fecha inicio", "fecha_inicio", "date", "fecha solicitud", "fecha_solicitud",
      "fecha evento", "fecha_evento", "fecha registro", "fecha_registro",
    ],
    matchNombre: (h) =>
      esIgualAlguno(h, ["fecha", "date"]) ||
      (incluyeAlguno(h, ["fecha"]) &&
        !incluyeAlguno(h, ["fin", "cierre", "resolucion", "baja"])),
    matchValores: (muestras) =>
      muestras.length > 0 && muestras.filter(esFecha).length >= muestras.length * 0.6,
  },

  // ── Horas ─────────────────────────────────────────────────────────────────
  {
    concepto: "HoraDerivacion",
    prioridad: 25,
    aliases: [
      "hora derivacion", "hora_derivacion", "hora derivación", "hora_derivación",
      "hora despacho", "hora_despacho", "hora envio", "hora_envio",
    ],
    matchNombre: (h) =>
      incluyeAlguno(h, ["derivac", "despacho", "envio", "envío"]) &&
      incluyeAlguno(h, ["hora"]),
    matchValores: (muestras) =>
      muestras.length > 0 && muestras.filter(esHora).length >= muestras.length * 0.5,
  },
  {
    concepto: "HoraLlegada",
    prioridad: 26,
    aliases: [
      "hora llegada", "hora_llegada", "hora arribo", "hora_arribo",
      "hora inicio atencion", "hora_inicio_atencion",
    ],
    matchNombre: (h) =>
      incluyeAlguno(h, ["llegada", "arribo"]) && incluyeAlguno(h, ["hora"]),
    matchValores: (muestras) =>
      muestras.length > 0 && muestras.filter(esHora).length >= muestras.length * 0.5,
  },
  {
    concepto: "HoraRetiro",
    prioridad: 27,
    aliases: [
      "hora retiro", "hora_retiro", "hora salida", "hora_salida",
      "hora fin atencion", "hora fin", "hora_fin",
    ],
    matchNombre: (h) =>
      incluyeAlguno(h, ["retiro", "salida"]) && incluyeAlguno(h, ["hora"]),
    matchValores: (muestras) =>
      muestras.length > 0 && muestras.filter(esHora).length >= muestras.length * 0.5,
  },
  {
    concepto: "HoraPrincipal",
    prioridad: 30,
    aliases: [
      "hora", "hora ingreso", "hora_ingreso", "hora solicitud", "hora_solicitud",
      "hora evento", "hora_evento", "hora registro", "hora_registro", "time",
    ],
    matchNombre: (h) =>
      esIgualAlguno(h, ["hora", "time"]) ||
      (incluyeAlguno(h, ["hora", "ingreso"]) &&
        !incluyeAlguno(h, ["derivac", "llegada", "arribo", "retiro", "salida", "fin", "prog"])),
    matchValores: (muestras) =>
      muestras.length > 0 && muestras.filter(esHora).length >= muestras.length * 0.5,
  },

  // ── Tiempos calculados ────────────────────────────────────────────────────
  {
    concepto: "TiempoRespuestaMin",
    prioridad: 35,
    aliases: [
      "tiempo de respuesta", "tiempo_respuesta", "tiempo respuesta",
      "tiempo atencion", "tiempo_atencion", "tiempo atención", "tiempo_atención",
      "minutos respuesta", "t_respuesta",
    ],
    matchNombre: (h) =>
      incluyeAlguno(h, ["respuesta", "atencion", "atención"]) &&
      incluyeAlguno(h, ["tiempo", "minutos", "min"]),
    // matchValores ELIMINADO: columnas numéricas legítimas (líneas de colectivo, comunas, flags)
    // son indistinguibles de duraciones en minutos por sus valores. La detección por nombre
    // ("tiempo_respuesta", "t_respuesta", "minutos respuesta") es siempre suficiente.
  },
  {
    concepto: "TiempoOperativoMin",
    prioridad: 36,
    aliases: [
      "tiempo operativo", "tiempo_operativo", "tiempo en sitio", "tiempo_sitio",
      "duracion", "duración", "duration", "tiempo intervencion", "tiempo_intervencion",
    ],
    matchNombre: (h) =>
      incluyeAlguno(h, ["operativo", "sitio", "duracion", "duración", "intervencion", "intervención"]) &&
      incluyeAlguno(h, ["tiempo", "minutos", "min"]),
    // matchValores ELIMINADO: misma razón que TiempoRespuestaMin.
  },

  // ── Clasificación del evento ──────────────────────────────────────────────
  {
    // TipoEvento detecta SOLO por nombre compuesto o por valores específicos.
    // "tipo" solo es demasiado ambiguo: no está en matchNombre ni en aliases.
    // El desambiguado entre TipoEvento / Severidad / Categoria para header "TIPO"
    // lo resuelve matchValores de cada concepto según su prioridad.
    concepto: "TipoEvento",
    prioridad: 40,
    aliases: [
      "tipo evento", "tipo_evento", "tipo de evento", "tipo_de_evento",
      "clase", "naturaleza", "kind",
    ],
    matchNombre: (h) =>
      esIgualAlguno(h, ["tipo evento", "tipo de evento", "clase", "kind", "naturaleza"]) ||
      incluyeAlguno(h, ["tipo_evento", "tipo_de_evento"]),
    matchValores: (muestras, unicos) => {
      if (unicos > 20) return false;
      const norm = muestras.map((v) => normalizar(v));
      const hits = norm.filter((v) => VALORES_TIPO_EVENTO.some((t) => v === normalizar(t) || v.includes(normalizar(t)))).length;
      return hits >= muestras.length * 0.4;
    },
  },
  {
    concepto: "Estado",
    prioridad: 45,
    aliases: [
      "estado", "estado solicitud", "estado_solicitud", "resuelto",
      "status", "estado actual", "estado_actual", "situacion", "situación",
    ],
    matchNombre: (h) =>
      esIgualAlguno(h, ["estado", "resuelto", "status", "situacion", "situación"]) ||
      incluyeAlguno(h, ["estado"]),
    matchValores: (muestras, unicos) => {
      if (unicos > 10) return false;
      const norm = muestras.map((v) => normalizar(v));
      const hits = norm.filter((v) => VALORES_ESTADO.some((t) => v === normalizar(t) || v.includes(normalizar(t)))).length;
      return hits >= muestras.length * 0.5;
    },
  },
  {
    concepto: "ResultadoIntervencion",
    prioridad: 50,
    aliases: [
      "resolucion", "resolución", "resultado", "resultado intervencion",
      "resultado_intervencion", "cierre", "motivo cierre", "motivo_cierre",
      "tipo cierre", "tipo_cierre",
    ],
    matchNombre: (h) =>
      incluyeAlguno(h, ["resolucion", "resolución", "resultado"]) &&
      !incluyeAlguno(h, ["fecha", "hora"]),
    matchValores: (muestras, unicos) => {
      if (unicos > 20) return false;
      const norm = muestras.map((v) => normalizar(v));
      const hits = norm.filter((v) => VALORES_RESULTADO.some((t) => v.includes(normalizar(t)))).length;
      return hits >= muestras.length * 0.4;
    },
  },
  {
    concepto: "Severidad",
    prioridad: 55,
    aliases: [
      "severidad", "prioridad", "urgencia", "criticidad", "nivel",
      "nivel urgencia", "nivel_urgencia", "priority", "severity",
    ],
    matchNombre: (h) =>
      esIgualAlguno(h, ["severidad", "prioridad", "urgencia", "criticidad", "priority", "severity"]) ||
      incluyeAlguno(h, ["severidad", "prioridad", "urgencia"]),
    matchValores: (muestras, unicos) => {
      if (unicos > 8) return false;
      const norm = muestras.map((v) => normalizar(v));
      const hits = norm.filter((v) => VALORES_SEVERIDAD.some((t) => v === normalizar(t))).length;
      return hits >= muestras.length * 0.5;
    },
  },
  {
    concepto: "Subcategoria",
    prioridad: 58,
    aliases: [
      "subcategoria", "subcategoría", "sub categoria", "sub categoría",
      "sub_categoria", "sub_categoría", "subtipo", "sub tipo", "sub_tipo",
      "detalle motivo", "detalle_motivo", "especificacion", "especificación",
    ],
    matchNombre: (h) =>
      incluyeAlguno(h, ["subcategoria", "subcategoría", "subtipo", "sub "]),
  },
  {
    // Categoria detecta por nombre o por exclusión de otros patrones.
    // matchValores actúa como red de seguridad para headers ambiguos como "TIPO":
    // si los valores no son fechas, horas, números, severidad, estado ni tipoEvento,
    // y tienen cardinalidad moderada con strings cortos, se trata de una clasificación operativa.
    concepto: "Categoria",
    prioridad: 60,
    aliases: [
      "motivo", "categoria", "categoría", "category",
      "motivo detallado", "motivo_detallado", "tipo motivo", "tipo_motivo",
      "descripcion corta", "descripcion_corta", "reclamo", "novedad",
      "tipo solicitud", "tipo_solicitud", "clasificacion", "clasificación",
    ],
    matchNombre: (h) =>
      esIgualAlguno(h, ["motivo", "categoria", "categoría", "category", "reclamo", "novedad"]) ||
      incluyeAlguno(h, ["motivo", "categoria", "categoría"]),
    matchValores: (muestras, unicos) => {
      if (unicos < 3 || unicos > 150) return false;
      if (muestras.length === 0) return false;
      // Excluir si los valores son fechas, horas o puramente numéricos
      if (muestras.filter(esFecha).length >= muestras.length * 0.5) return false;
      if (muestras.filter(esHora).length >= muestras.length * 0.5) return false;
      if (muestras.filter(esNumeroDecimal).length >= muestras.length * 0.7) return false;
      // Excluir si los valores son de severidad o estado (detectados antes por prioridad,
      // pero esta regla actúa como doble verificación para matchValores aislado)
      const norm = muestras.map((v) => normalizar(v));
      const hitsSev = norm.filter((v) => VALORES_SEVERIDAD.some((t) => v === normalizar(t))).length;
      if (hitsSev >= muestras.length * 0.5) return false;
      const hitsEst = norm.filter((v) => VALORES_ESTADO.some((t) => v === normalizar(t) || v.includes(normalizar(t)))).length;
      if (hitsEst >= muestras.length * 0.5) return false;
      const hitsTipo = norm.filter((v) => VALORES_TIPO_EVENTO.some((t) => v === normalizar(t) || v.includes(normalizar(t)))).length;
      if (hitsTipo >= muestras.length * 0.4) return false;
      // Excluir si son strings muy largos (texto libre)
      const avgLen = muestras.reduce((acc, v) => acc + v.length, 0) / muestras.length;
      if (avgLen > 60) return false;
      return true;
    },
  },

  // ── Organización y responsables ───────────────────────────────────────────
  {
    concepto: "ResponsableOperativo",
    prioridad: 65,
    aliases: [
      "area asignada", "area_asignada", "área asignada", "área_asignada",
      "sector", "dependencia", "organismo", "responsable",
      "unidad responsable", "unidad_responsable", "asignado a", "asignado_a",
    ],
    matchNombre: (h) =>
      esIgualAlguno(h, ["sector", "responsable", "dependencia", "organismo"]) ||
      incluyeAlguno(h, ["area asig", "área asig", "area_asig", "área_asig", "responsable"]),
  },
  {
    concepto: "Cobertura",
    prioridad: 70,
    aliases: [
      "linea", "línea", "guardia", "turno", "circuito", "ronda",
      "zona operativa", "zona_operativa", "recorrido", "servicio",
      "linea de servicio", "línea_de_servicio",
    ],
    matchNombre: (h) =>
      esIgualAlguno(h, ["linea", "línea", "guardia", "turno", "circuito", "ronda", "recorrido"]) ||
      incluyeAlguno(h, ["linea", "línea", "turno", "guardia", "circuito"]),
  },
  {
    concepto: "ActivoAfectado",
    prioridad: 72,
    aliases: [
      "semaforo", "semáforo", "luminaria", "local", "activo", "objeto",
      "bien", "infraestructura", "elemento", "activo afectado", "activo_afectado",
      "equipo", "instalacion", "instalación",
    ],
    matchNombre: (h) =>
      incluyeAlguno(h, [
        "semaforo", "semáforo", "luminaria", "local", "activo",
        "equipo", "instalacion", "instalación", "infraestructura",
      ]),
  },

  // ── Ubicación ─────────────────────────────────────────────────────────────
  {
    concepto: "CallePrincipal",
    prioridad: 80,
    aliases: [
      "calle 1", "calle1", "calle_1", "calle principal", "calle_principal",
      "calle", "via", "vía", "calle ingreso", "calle_ingreso",
      "domicilio", "direccion", "dirección",
    ],
    matchNombre: (h) =>
      esIgualAlguno(h, ["calle", "calle 1", "calle1", "via", "vía", "domicilio", "direccion", "dirección"]) ||
      (incluyeAlguno(h, ["calle"]) && !incluyeAlguno(h, ["2", "3", "secund", "tercer"])),
  },
  {
    concepto: "CalleSecundaria",
    prioridad: 81,
    aliases: [
      "calle 2", "calle2", "calle_2", "calle secundaria", "calle_secundaria",
      "interseccion", "intersección", "esquina", "entre calle", "entre_calle",
    ],
    matchNombre: (h) =>
      incluyeAlguno(h, ["calle 2", "calle2", "calle_2", "calle secund", "intersec", "esquina"]),
  },
  {
    concepto: "CalleTerciaria",
    prioridad: 82,
    aliases: [
      "calle 3", "calle3", "calle_3", "calle terciaria", "calle_terciaria",
      "y calle", "entre calle 2", "entre_calle_2",
    ],
    matchNombre: (h) => incluyeAlguno(h, ["calle 3", "calle3", "calle_3", "terciaria"]),
  },
  {
    concepto: "Territorio",
    prioridad: 85,
    aliases: [
      "barrio", "localidad", "municipio", "partido", "zona", "region", "región",
      "distrito", "comuna", "neighborhood", "location",
      "area geografica", "área geográfica", "area_geografica", "zona geografica",
    ],
    matchNombre: (h) =>
      esIgualAlguno(h, ["barrio", "localidad", "municipio", "partido", "zona", "distrito", "comuna", "region", "región"]) ||
      incluyeAlguno(h, ["barrio", "localidad", "municipio", "zona", "geografica", "geográfica"]),
  },
  {
    concepto: "GrupoOperativo",
    prioridad: 88,
    aliases: [
      "grupo", "equipo", "cuadrilla", "brigada", "movil", "móvil",
      "unidad", "recurso", "agente", "operador",
    ],
    matchNombre: (h) =>
      esIgualAlguno(h, [
        "grupo", "equipo", "cuadrilla", "brigada", "movil",
        "móvil", "unidad", "recurso", "agente", "operador",
      ]),
  },

  // ── Texto libre (fallback) ────────────────────────────────────────────────
  {
    // Umbral 0.6: si más del 60% de los valores son únicos, casi con certeza es texto libre.
    // Un umbral menor (0.3) capturaba columnas categóricas con cardinalidad media-alta.
    // Un umbral mayor (0.8) sería más conservador pero dejaría texto real sin detectar.
    // 0.6 es el punto donde la probabilidad de ser texto libre supera a la de ser categoría.
    concepto: "TextoLibre",
    prioridad: 95,
    aliases: [
      "descripcion", "descripción", "observacion", "observación",
      "detalle", "comentario", "notas", "nota", "observaciones",
      "detalle observacion", "detalle_observacion",
    ],
    matchNombre: (h) =>
      incluyeAlguno(h, [
        "descripcion", "descripción", "observacion", "observación",
        "detalle", "comentario", "nota",
      ]),
    matchCardinalidad: (unicos, total) => total > 0 && unicos / total > 0.6,
  },
];
