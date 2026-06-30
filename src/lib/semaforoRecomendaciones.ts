import { DatosDashboard, Solicitud } from "./excelParser";
import type { PerfilDataset } from "./insights/tipos";
import { calcularTopNPct, detectarPicoHistorico } from "./insights/detectores";

export type EstadoSemaforo = "verde" | "amarillo" | "rojo" | "nd";

export interface EjeSemaforo {
  estado: EstadoSemaforo;
  etiqueta: string;
  descripcion: string;
  valor: string;
}

export interface SemaforoResultado {
  calidad: EjeSemaforo;
  eficiencia: EjeSemaforo;
  resolucion: EjeSemaforo;
  recurrencia: EjeSemaforo;
}

function fmt(min: number): string {
  return min >= 120 ? `${(min / 60).toFixed(1)} h` : `${min} min`;
}

export function calcularSemaforo(datos: DatosDashboard): SemaforoResultado {
  const cal = datos.calidadDataset;

  // Calidad: promedio ponderado (fecha es más crítica)
  const pctScore = (cal.pctSinFecha * 2 + cal.pctSinCategoria + cal.pctSinUbicacion * 0.5) / 3.5;
  let calidadEstado: EstadoSemaforo;
  if (pctScore <= 5) calidadEstado = "verde";
  else if (pctScore <= 15) calidadEstado = "amarillo";
  else calidadEstado = "rojo";
  const camposCriticos = [
    cal.pctSinFecha > 0 ? `${cal.pctSinFecha}% sin fecha` : null,
    cal.pctSinCategoria > 0 ? `${cal.pctSinCategoria}% sin categoría` : null,
  ].filter(Boolean) as string[];
  const calidadEje: EjeSemaforo = {
    estado: calidadEstado,
    etiqueta:
      calidadEstado === "verde"
        ? "Óptima"
        : calidadEstado === "amarillo"
        ? "Mejorable"
        : "Crítica",
    descripcion:
      camposCriticos.length > 0
        ? camposCriticos.join(" · ")
        : "Completitud total de campos clave",
    valor: `${Math.max(0, Math.round(100 - pctScore))}% completo`,
  };

  // Eficiencia (TRI)
  let eficienciaEje: EjeSemaforo;
  if (!datos.tieneHoraDerivacion || datos.tiempoRespuestaInternoPromedio === 0) {
    eficienciaEje = {
      estado: "nd",
      etiqueta: "N/D",
      descripcion: "Sin datos de hora de derivación",
      valor: "—",
    };
  } else {
    const tri = datos.tiempoRespuestaInternoPromedio;
    const estado: EstadoSemaforo = tri < 15 ? "verde" : tri < 45 ? "amarillo" : "rojo";
    eficienciaEje = {
      estado,
      etiqueta:
        estado === "verde" ? "Eficiente" : estado === "amarillo" ? "Aceptable" : "Demorado",
      descripcion: "Tiempo promedio de derivación interna",
      valor: fmt(tri),
    };
  }

  // Resolución
  let resolucionEje: EjeSemaforo;
  if (!datos.tieneColumnaStatus) {
    resolucionEje = {
      estado: "nd",
      etiqueta: "N/D",
      descripcion: "Sin columna de resolución",
      valor: "—",
    };
  } else {
    const tasa = datos.tasaResolucion;
    const estado: EstadoSemaforo = tasa >= 75 ? "verde" : tasa >= 50 ? "amarillo" : "rojo";
    const labelTasa = datos.etiquetaStatus === "Resuelto" ? "resolución" : "finalización";
    resolucionEje = {
      estado,
      etiqueta: estado === "verde" ? "Buena" : estado === "amarillo" ? "Moderada" : "Crítica",
      descripcion: `Tasa de ${labelTasa} global`,
      valor: `${tasa}%`,
    };
  }

  // Recurrencia: % de solicitudes en zonas crónicas
  let recurrenciaEje: EjeSemaforo;
  if (datos.crucesCronicos.length > 0 && datos.totalSolicitudes > 0) {
    const totalEnCronicas = datos.crucesCronicos.reduce((acc, c) => acc + c.cantidad, 0);
    const pctCronicas = Math.min(100, Math.round((totalEnCronicas / datos.totalSolicitudes) * 100));
    const estado: EstadoSemaforo = pctCronicas <= 5 ? "verde" : pctCronicas <= 20 ? "amarillo" : "rojo";
    const n = datos.crucesCronicos.length;
    recurrenciaEje = {
      estado,
      etiqueta:
        estado === "verde"
          ? "Sin crónico"
          : estado === "amarillo"
          ? "Moderada"
          : "Alta",
      descripcion: `${n} zona${n !== 1 ? "s" : ""} crónica${n !== 1 ? "s" : ""} · ${pctCronicas}% del total`,
      valor: `${pctCronicas}%`,
    };
  } else if (datos.tieneColumnaStatus && datos.totalFalsosPositivos > 0) {
    const tasa = datos.tasaFalsosPositivos;
    const estado: EstadoSemaforo = tasa < 10 ? "verde" : tasa < 25 ? "amarillo" : "rojo";
    recurrenciaEje = {
      estado,
      etiqueta: estado === "verde" ? "Bajo" : estado === "amarillo" ? "Moderado" : "Alto",
      descripcion: "Tasa de falsos positivos (proxy de recurrencia)",
      valor: `${tasa}%`,
    };
  } else {
    recurrenciaEje = {
      estado: "nd",
      etiqueta: "N/D",
      descripcion: "Insuficientes datos multi-mes",
      valor: "—",
    };
  }

  return { calidad: calidadEje, eficiencia: eficienciaEje, resolucion: resolucionEje, recurrencia: recurrenciaEje };
}

export type PrioridadRecomendacion = "alta" | "media" | "baja";

export interface Recomendacion {
  prioridad: PrioridadRecomendacion;
  texto: string;
  detalle?: string;
  icono: "alerta" | "reloj" | "usuario" | "tendencia" | "ubicacion" | "datos";
}

// Motivos que aparecen en el top-3 mensual durante 3+ meses consecutivos
function motivosTopConsecutivos(solicitudes: Solicitud[], meses: string[]): string[] {
  if (meses.length < 3) return [];

  const topPorMes = new Map<string, string[]>();
  for (const mes of meses) {
    const cnt = new Map<string, number>();
    for (const s of solicitudes) {
      if (s.mes === mes && s.motivo && s.motivo !== "Sin datos") {
        cnt.set(s.motivo, (cnt.get(s.motivo) ?? 0) + 1);
      }
    }
    const sorted = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
    topPorMes.set(mes, sorted.slice(0, 3).map(([m]) => m));
  }

  const cronicosConsec: string[] = [];
  const todosMotivos = new Set(solicitudes.filter((s) => s.motivo && s.motivo !== "Sin datos").map((s) => s.motivo));
  for (const motivo of todosMotivos) {
    let maxConsec = 0;
    let consec = 0;
    for (const mes of meses) {
      if ((topPorMes.get(mes) ?? []).includes(motivo)) {
        consec++;
        maxConsec = Math.max(maxConsec, consec);
      } else {
        consec = 0;
      }
    }
    if (maxConsec >= 3) cronicosConsec.push(motivo);
  }
  return cronicosConsec;
}

// FP rate por motivo usando solicitudes directamente
function tasaFpPorMotivo(solicitudes: Solicitud[]): { motivo: string; pct: number; fp: number; total: number }[] {
  const cnts = new Map<string, { fp: number; total: number }>();
  for (const s of solicitudes) {
    if (!s.motivo || s.motivo === "Sin datos") continue;
    const e = cnts.get(s.motivo) ?? { fp: 0, total: 0 };
    e.total++;
    if (s.esFalsoPositivo) e.fp++;
    cnts.set(s.motivo, e);
  }
  return [...cnts.entries()]
    .filter(([, v]) => v.total >= 5)
    .map(([motivo, v]) => ({ motivo, pct: Math.round((v.fp / v.total) * 100), fp: v.fp, total: v.total }))
    .sort((a, b) => b.pct - a.pct);
}

export function generarRecomendaciones(datos: DatosDashboard, perfil: PerfilDataset): Recomendacion[] {
  const lista: Recomendacion[] = [];

  // 1. Tasa de resolución/finalización
  if (datos.tieneColumnaStatus) {
    const tasa = datos.tasaResolucion;
    const labelTasa = datos.etiquetaStatus === "Resuelto" ? "resolución" : "finalización";
    if (tasa < 60) {
      lista.push({
        prioridad: "alta",
        texto: `Tasa de ${labelTasa} crítica (${tasa}%) — revisar flujo de cierre`,
        detalle: `${datos.totalNoResueltas.toLocaleString("es-AR")} casos sin ${datos.etiquetaStatus === "Resuelto" ? "resolver" : "finalizar"} de ${datos.totalSolicitudes.toLocaleString("es-AR")} totales.`,
        icono: "alerta",
      });
    } else if (tasa < 75) {
      lista.push({
        prioridad: "media",
        texto: `Tasa de ${labelTasa} mejorable: ${tasa}%`,
        detalle: "Revisar qué categorías tienen menor tasa para priorizar acciones de cierre.",
        icono: "tendencia",
      });
    }
  }

  // 2. Falsos positivos por motivo usando solicitudes directamente (FP rate por categoría)
  if (datos.tieneColumnaStatus && datos.solicitudes.length > 0) {
    const fpPorMotivo = tasaFpPorMotivo(datos.solicitudes);
    const motivoCritico = fpPorMotivo.find((m) => m.pct >= 30);
    if (motivoCritico) {
      lista.push({
        prioridad: "alta",
        texto: `Falsos positivos críticos en "${motivoCritico.motivo}": ${motivoCritico.pct}%`,
        detalle: `${motivoCritico.fp.toLocaleString("es-AR")} cierres sin evento real de ${motivoCritico.total.toLocaleString("es-AR")} en esa categoría. Auditar el protocolo de cierre.`,
        icono: "alerta",
      });
    } else {
      const motivoElevado = fpPorMotivo.find((m) => m.pct >= 15);
      if (motivoElevado) {
        lista.push({
          prioridad: "media",
          texto: `Falsos positivos elevados en "${motivoElevado.motivo}": ${motivoElevado.pct}%`,
          detalle: "Revisar el protocolo de cierre para esta categoría y contrastar con el registro de eventos.",
          icono: "datos",
        });
      }
    }
  }

  // 3. Calidad — fecha faltante
  if (datos.calidadDataset.pctSinFecha > 20) {
    lista.push({
      prioridad: "alta",
      texto: `${datos.calidadDataset.pctSinFecha}% de registros sin fecha válida`,
      detalle: "La fecha es crítica para análisis temporales. Completar la columna de fecha en el archivo fuente.",
      icono: "datos",
    });
  } else if (datos.calidadDataset.pctSinFecha > 8) {
    lista.push({
      prioridad: "media",
      texto: `${datos.calidadDataset.pctSinFecha}% de registros sin fecha`,
      detalle: "Mejorar la carga de fecha permitirá análisis temporales más precisos.",
      icono: "datos",
    });
  }

  // 4. Calidad — categoría faltante
  if (datos.calidadDataset.pctSinCategoria > 20) {
    lista.push({
      prioridad: "alta",
      texto: `${datos.calidadDataset.pctSinCategoria}% de registros sin categoría principal`,
      detalle: `Sin categoría no es posible segmentar el análisis. Revisar el campo "${datos.colCategorica1 ?? "categoría"}" en el archivo fuente.`,
      icono: "datos",
    });
  } else if (datos.calidadDataset.pctSinCategoria > 8) {
    lista.push({
      prioridad: "media",
      texto: `${datos.calidadDataset.pctSinCategoria}% de registros sin categoría`,
      detalle: `Completar la tipificación en "${datos.colCategorica1 ?? "categoría"}" mejorará la calidad del análisis.`,
      icono: "datos",
    });
  }

  // 5. Calidad — ubicación faltante
  const pctSinUbicacion = datos.calidadDataset.pctSinUbicacion;
  if (pctSinUbicacion > 25) {
    lista.push({
      prioridad: "media",
      texto: `${pctSinUbicacion}% de registros sin ubicación geográfica`,
      detalle: "Sin ubicación no es posible identificar zonas de alta demanda ni generar mapas de calor.",
      icono: "ubicacion",
    });
  } else if (pctSinUbicacion > 10) {
    lista.push({
      prioridad: "baja",
      texto: `${pctSinUbicacion}% de registros sin ubicación — georreferenciación incompleta`,
      detalle: "Mejorar la carga de calles/intersecciones permitirá análisis espaciales más precisos.",
      icono: "ubicacion",
    });
  }

  // 6. TRI por categoría — categoría más lenta > 2x promedio
  if (datos.tieneHoraDerivacion && datos.tiempoRespuestaInternoPromedio > 0) {
    const sorted = [...datos.tiempoRespuestaInternoPorMotivo].sort((a, b) => b.promedio - a.promedio);
    const promedio = datos.tiempoRespuestaInternoPromedio;
    const maslento = sorted[0];
    if (maslento && maslento.promedio > promedio * 2) {
      lista.push({
        prioridad: "alta",
        texto: `TRI crítico en "${maslento.area}": ${fmt(maslento.promedio)} promedio`,
        detalle: `Más de 2× el promedio general (${fmt(promedio)}). Revisar flujo de derivación.`,
        icono: "reloj",
      });
    } else if (promedio >= 30) {
      lista.push({
        prioridad: "media",
        texto: `TRI promedio elevado: ${fmt(promedio)} — revisar objetivos de derivación`,
        detalle: "El tiempo de derivación global supera los 30 minutos. Considerar ajustar protocolos.",
        icono: "reloj",
      });
    }
  }

  // 7. TRI por área — área más lenta > 2x promedio
  if (datos.tieneHoraDerivacion && datos.tiempoRespuestaInternoPorArea.length >= 2) {
    const sorted = [...datos.tiempoRespuestaInternoPorArea].sort((a, b) => b.promedio - a.promedio);
    const promedio = datos.tiempoRespuestaInternoPromedio;
    const maslenta = sorted[0];
    if (maslenta && maslenta.promedio > promedio * 2) {
      lista.push({
        prioridad: "alta",
        texto: `Área con mayor demora interna: "${maslenta.area}" — ${fmt(maslenta.promedio)}`,
        detalle: "Más de 2× el promedio general. Considerar refuerzo de recursos en esa área.",
        icono: "usuario",
      });
    }
  }

  // 8. Pico nocturno
  if (datos.porHora.length >= 6) {
    const nocturnas = datos.porHora.filter((h) => h.hora >= 22 || h.hora < 6);
    const diurnas = datos.porHora.filter((h) => h.hora >= 8 && h.hora < 18);
    if (nocturnas.length > 0 && diurnas.length > 0) {
      const promNocturno = nocturnas.reduce((acc, h) => acc + h.cantidad, 0) / nocturnas.length;
      const promDiurno = diurnas.reduce((acc, h) => acc + h.cantidad, 0) / diurnas.length;
      if (promDiurno > 0 && promNocturno > promDiurno * 2) {
        lista.push({
          prioridad: "media",
          texto: "Actividad nocturna atípicamente alta — evaluar refuerzo de guardia",
          detalle: "El promedio nocturno (22–6h) supera 2× el promedio diurno (8–18h).",
          icono: "reloj",
        });
      }
    }
  }

  // 9. Zona frágil (solo si puntuación o recurrencia supera umbral mínimo)
  if (datos.indiceFragilidad.length > 0) {
    const top = datos.indiceFragilidad[0];
    if (top.puntuacion >= 1.5 || top.tasaRecurrencia >= 30) {
      lista.push({
        prioridad: "alta",
        texto: `Intervención urgente en zona "${top.zona}"`,
        detalle: `Score de fragilidad ${top.puntuacion.toFixed(2)} — ${top.volumen.toLocaleString("es-AR")} registros, ${top.tasaRecurrencia}% recurrente.`,
        icono: "ubicacion",
      });
    } else if (top.puntuacion >= 0.8) {
      lista.push({
        prioridad: "media",
        texto: `Zona de atención: "${top.zona}" — score de fragilidad ${top.puntuacion.toFixed(2)}`,
        detalle: `${top.volumen.toLocaleString("es-AR")} registros con ${top.tasaRecurrencia}% de recurrencia. Monitorear evolución.`,
        icono: "ubicacion",
      });
    }
  }

  // 10. Zona crónica (gateado por perfil.patrones — mismo dato subyacente que
  //     crucesCronicos[0], sin cambio visible; perfil.patrones es la fuente de verdad
  //     que decide SI hay un patrón, datos.crucesCronicos da el detalle exacto).
  if (perfil.patrones.length > 0 && datos.crucesCronicos.length > 0) {
    const top = datos.crucesCronicos[0];
    lista.push({
      prioridad: "alta",
      texto: `Problema estructural en "${top.interseccion}"`,
      detalle: `"${top.motivo}" se repite en ${top.meses.length} meses consecutivos. Requiere intervención.`,
      icono: "ubicacion",
    });
  }

  // 11. Concentración excesiva en una columna categórica (vía perfil.insights — generaliza
  //     a cualquier columna, no solo motivo; umbrales 40%/60% del motor reemplazan los
  //     40%/50% que tenía esta función antes — PerfilDataset es ahora la única fuente
  //     de verdad para "concentración significativa" en todo el proyecto).
  for (const insight of perfil.insights) {
    if (insight.tipo !== "concentracion") continue;
    lista.push({
      prioridad: insight.severidad === "critico" ? "alta" : "media",
      texto: insight.texto,
      detalle: insight.detalle,
      icono: "alerta",
    });
  }

  // 12. Motivos que lideran el top-3 mensual por 3+ meses consecutivos (demanda estructural)
  if (datos.solicitudes.length > 0 && datos.meses.length >= 3) {
    const motCronicos = motivosTopConsecutivos(datos.solicitudes, datos.meses);
    if (motCronicos.length > 0) {
      lista.push({
        prioridad: "media",
        texto: `Demanda estructural en ${motCronicos.length > 1 ? `${motCronicos.length} categorías` : `"${motCronicos[0]}"`}`,
        detalle:
          motCronicos.length > 1
            ? `"${motCronicos[0]}" y otras ${motCronicos.length - 1} categorías lideraron el top-3 mensual por 3+ meses consecutivos.`
            : `"${motCronicos[0]}" se mantiene en el top-3 mensual por 3 o más meses consecutivos.`,
        icono: "tendencia",
      });
    }
  }

  // 13. Cobertura temporal insuficiente (<3 meses).
  // NOTA: no se migró a capacidades.tieneComparacionPeriodos porque ese flag corta en
  // ">=2 meses" (para habilitar comparación de períodos), mientras que esta recomendación
  // usa un umbral de negocio distinto ("<3 meses" para hablar de tendencias/estacionalidad).
  // Son dos umbrales legítimamente distintos sobre la misma variable (datos.meses.length);
  // forzarlos a coincidir habría cambiado cuándo se dispara este aviso con exactamente 2 meses.
  if (datos.meses.length < 3 && datos.meses.length > 0) {
    lista.push({
      prioridad: "baja",
      texto: `Dataset con ${datos.meses.length} mes${datos.meses.length > 1 ? "es" : ""} de cobertura — análisis temporal limitado`,
      detalle: "Con más de 3 meses de datos se pueden detectar tendencias, patrones crónicos y estacionalidad.",
      icono: "datos",
    });
  }

  // 14. Tasa de resolución excelente — baja prioridad
  if (datos.tieneColumnaStatus && datos.tasaResolucion >= 90) {
    lista.push({
      prioridad: "baja",
      texto: `Tasa de ${datos.etiquetaStatus === "Resuelto" ? "resolución" : "finalización"} excelente: ${datos.tasaResolucion}%`,
      detalle: "Mantener protocolos de cierre vigentes y documentar las prácticas que generan este resultado.",
      icono: "tendencia",
    });
  }

  // 15. Top-2 categorías concentran ≥60% del total (vía calcularTopNPct sobre
  //     distribucionesCategoricas — reutiliza la agregación ya calculada por
  //     excelParser.ts, no recorre filas). No es redundante con el #11: detecta
  //     concentración repartida en 2 categorías que individualmente no llegan al 40%.
  if (datos.porMotivo.length >= 2 && datos.totalSolicitudes > 0) {
    const distribucionPrincipal = datos.distribucionesCategoricas.find(
      (d) => d.columna === datos.colCategorica1
    );
    if (distribucionPrincipal) {
      const pct2 = calcularTopNPct(distribucionPrincipal.datos, 2);
      const top2Nombres = [...distribucionPrincipal.datos]
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 2);
      if (pct2 >= 60) {
        lista.push({
          prioridad: "baja",
          texto: `Las 2 categorías más frecuentes concentran el ${pct2}% de los registros`,
          detalle: `"${top2Nombres[0]?.nombre}" y "${top2Nombres[1]?.nombre}" dominan la demanda. Analizar si requieren atención diferenciada.`,
          icono: "alerta",
        });
      }
    }
  }

  // 16. Mes pico: evaluar capacidad operativa.
  // NOTA: se probó reusar perfil.anomalias (detector de outliers por IQR, ya usado en
  // el resto del motor) pero detectarOutliers exige ≥5 puntos para ser confiable, y la
  // mayoría de los datasets reales tienen 3-4 meses — con tan pocos puntos el IQR no
  // detecta el pico (matemáticamente queda "escondido" en su propio cuartil). Se usa en
  // su lugar detectarPicoHistorico (insights/detectores.ts), un comparador directo
  // apto para series cortas — vive en insights/, no se duplica la lógica acá.
  const picoHistorico = detectarPicoHistorico(datos.porMes);
  if (picoHistorico) {
    lista.push({
      prioridad: "baja",
      texto: picoHistorico.texto,
      detalle: "Planificar capacidad operativa para meses de alta demanda con base en este patrón histórico.",
      icono: "tendencia",
    });
  }

  const orden: Record<PrioridadRecomendacion, number> = { alta: 0, media: 1, baja: 2 };
  const ordenadas = lista.sort((a, b) => orden[a.prioridad] - orden[b.prioridad]).slice(0, 7);

  // Garantizar mínimo 3: completar con las reglas baja ya calculadas que quedaron fuera
  // (no se agregan textos hardcodeados: si el dataset es muy limpio y pequeño, 2 podría ser lo máximo posible)
  return ordenadas;
}
