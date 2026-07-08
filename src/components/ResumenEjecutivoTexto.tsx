import { useState } from "react";
import { FileText, Copy, Download, Check, AlertCircle } from "lucide-react";
import type { DatosDashboard } from "@/lib/excelParser";
import type { PerfilDataset } from "@/lib/insights/tipos";
import type { SemaforoResultado, Recomendacion } from "@/lib/semaforoRecomendaciones";

interface ResumenEjecutivoTextoProps {
  datos: DatosDashboard;
  perfil: PerfilDataset;
  semaforo: SemaforoResultado;
  recomendaciones: Recomendacion[];
  nombreArchivo: string;
  mesFiltro?: string;
}

// ── Helpers de formato ─────────────────────────────────────────────────────────

const MESES_ES: Record<string, string> = {
  "01": "enero", "02": "febrero", "03": "marzo", "04": "abril",
  "05": "mayo", "06": "junio", "07": "julio", "08": "agosto",
  "09": "septiembre", "10": "octubre", "11": "noviembre", "12": "diciembre",
};

function formatearMes(mes: string): string {
  const [anio, num] = mes.split("-");
  return num && anio ? `${MESES_ES[num] ?? mes} ${anio}` : mes;
}

function formatearPeriodo(meses: string[]): string {
  if (meses.length === 0) return "";
  if (meses.length === 1) return formatearMes(meses[0]);
  const primero = formatearMes(meses[0]);
  const ultimo = formatearMes(meses[meses.length - 1]);
  return `${primero} a ${ultimo}`;
}

function etiquetaTipo(tipo: string): string {
  if (tipo === "solicitudes") return "solicitudes de servicio";
  if (tipo === "sucesos") return "sucesos operativos";
  return "registros";
}

function etiquetaTendencia(t?: "creciente" | "estable" | "decreciente"): string {
  if (t === "creciente") return "una tendencia creciente";
  if (t === "decreciente") return "una tendencia decreciente";
  return "un comportamiento estable";
}

function estadoSemaforoTexto(estado: string): string {
  if (estado === "verde") return "satisfactorio";
  if (estado === "amarillo") return "moderado, con oportunidades de mejora";
  if (estado === "rojo") return "crítico, requiere atención inmediata";
  return "no determinado por ausencia de datos";
}

function hoy(): string {
  const d = new Date();
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

// ── Generador principal ────────────────────────────────────────────────────────

function generarTexto(
  datos: DatosDashboard,
  perfil: PerfilDataset,
  semaforo: SemaforoResultado,
  recomendaciones: Recomendacion[],
  nombreArchivo: string,
  mesFiltro: string,
): string {
  const periodo = mesFiltro ? formatearMes(mesFiltro) : formatearPeriodo(datos.meses);
  const mesesCount = mesFiltro ? 1 : datos.meses.length;
  const tipo = etiquetaTipo(datos.tipoDato);
  const total = datos.totalSolicitudes.toLocaleString("es-AR");
  const tendencia = perfil.caracteristicas.tendenciaGeneral;
  const confianza = perfil.caracteristicas.confianzaAnalitica;

  const lineas: string[] = [];

  // ── Encabezado institucional ─────────────────────────────────────────────────
  lineas.push("CENTRO DE GESTIÓN Y MONITOREO DE LA MOVILIDAD — CGM");
  lineas.push("RESUMEN EJECUTIVO OPERATIVO");
  lineas.push(`Período: ${periodo}   ·   Fecha de emisión: ${hoy()}`);
  lineas.push(`Fuente: ${nombreArchivo}`);
  lineas.push("");

  // ── 1. Contexto ──────────────────────────────────────────────────────────────
  lineas.push("1. CONTEXTO");
  const contextoBase = mesesCount === 1
    ? `El presente informe sintetiza el análisis de un mes de datos de ${tipo} correspondiente al período ${periodo}.`
    : `El presente informe sintetiza el análisis de ${mesesCount} meses de datos de ${tipo} correspondientes al período ${periodo}.`;
  const contextoCalidad = confianza >= 0.7
    ? "El dataset presenta alta confianza analítica."
    : confianza >= 0.4
    ? "El dataset presenta confianza analítica moderada; las conclusiones deben leerse en ese contexto."
    : "El dataset presenta baja confianza analítica; las cifras deben interpretarse con cautela.";
  lineas.push(`${contextoBase} ${contextoCalidad}`);
  lineas.push("");

  // ── 2. Volumen y tendencia ───────────────────────────────────────────────────
  lineas.push("2. VOLUMEN Y TENDENCIA");
  let volumen = `Durante el período se registraron ${total} ${tipo}`;
  if (tendencia && tendencia !== "estable") {
    volumen += `, con ${etiquetaTendencia(tendencia)} en el volumen de casos`;
  } else {
    volumen += `, con un comportamiento de volumen estable`;
  }
  volumen += ".";

  if (datos.tieneColumnaStatus) {
    const labelTasa = datos.etiquetaStatus === "Resuelto" ? "resolución" : "finalización";
    volumen += ` La tasa de ${labelTasa} del período fue del ${datos.tasaResolucion}%`;
    if (datos.tasaResolucion < 50) {
      volumen += `, nivel que requiere atención operativa`;
    } else if (datos.tasaResolucion >= 75) {
      volumen += `, dentro de parámetros aceptables`;
    }
    volumen += ".";
  }
  lineas.push(volumen);
  lineas.push("");

  // ── 3. Hallazgos clave ───────────────────────────────────────────────────────
  lineas.push("3. HALLAZGOS CLAVE");

  const hallazgosBloques: string[] = [];

  // Top categoría
  if (datos.porMotivo.length > 0 && datos.colCategorica1) {
    const top = datos.porMotivo[0];
    const pct = datos.totalSolicitudes > 0
      ? Math.round((top.cantidad / datos.totalSolicitudes) * 100)
      : 0;
    hallazgosBloques.push(
      `El tipo operativo más frecuente fue "${top.nombre}" con ${pct}% del total (${top.cantidad.toLocaleString("es-AR")} casos).`
    );
  }

  // Hora pico
  if (datos.porHora.length >= 3) {
    const pico = [...datos.porHora].sort((a, b) => b.cantidad - a.cantidad)[0];
    hallazgosBloques.push(
      `La franja horaria de mayor actividad fue las ${String(pico.hora).padStart(2, "0")}:00 hs.`
    );
  }

  // Día pico
  if (datos.porDiaSemana.length >= 3) {
    const pico = [...datos.porDiaSemana].sort((a, b) => b.cantidad - a.cantidad)[0];
    hallazgosBloques.push(`El día con mayor concentración de casos fue ${pico.dia}.`);
  }

  // Insights de concentración o tendencia del perfil
  const insightsRelevantes = perfil.insights
    .filter((i) => i.severidad === "critico" || i.severidad === "atencion")
    .slice(0, 2);
  for (const ins of insightsRelevantes) {
    if (!hallazgosBloques.some((h) => h.includes(ins.texto.slice(0, 20)))) {
      hallazgosBloques.push(ins.texto);
    }
  }

  // Patrones de recurrencia
  if (perfil.patrones.length > 0) {
    hallazgosBloques.push(perfil.patrones[0].descripcion);
  }

  // Falsos positivos
  if (datos.totalFalsosPositivos > 0 && datos.tasaFalsosPositivos > 15) {
    hallazgosBloques.push(
      `Se detectó una tasa de falsos positivos del ${datos.tasaFalsosPositivos}%, lo que sugiere revisar el proceso de cierre operativo.`
    );
  }

  if (hallazgosBloques.length === 0) {
    lineas.push("No se detectaron hallazgos de alerta durante el período analizado. El comportamiento del dataset se mantiene dentro de parámetros habituales.");
  } else {
    hallazgosBloques.slice(0, 5).forEach((h, i) => lineas.push(`${i + 1}. ${h}`));
  }
  lineas.push("");

  // ── 4. Geografía ─────────────────────────────────────────────────────────────
  const tieneGeo = datos.porInterseccion.length > 0 || datos.indiceFragilidad.length > 0;
  if (tieneGeo) {
    lineas.push("4. GEOGRAFÍA");
    const geoPartes: string[] = [];

    if (datos.porInterseccion.length > 0) {
      const top = datos.porInterseccion[0];
      const pct = datos.totalSolicitudes > 0
        ? Math.round((top.cantidad / datos.totalSolicitudes) * 100)
        : 0;
      geoPartes.push(
        `La intersección con mayor volumen de casos fue ${top.nombre} (${top.cantidad.toLocaleString("es-AR")} registros, ${pct}% del total).`
      );
    }

    if (datos.indiceFragilidad.length > 0) {
      const topFragil = datos.indiceFragilidad[0];
      geoPartes.push(
        `La zona de mayor fragilidad operativa fue ${topFragil.zona}, con un score de ${topFragil.puntuacion.toFixed(2)} sobre 3, combinando alto volumen y alta recurrencia.`
      );
    }

    lineas.push(geoPartes.join(" "));
    lineas.push("");
  }

  // ── 5. Desempeño operativo ───────────────────────────────────────────────────
  lineas.push(tieneGeo ? "5. DESEMPEÑO OPERATIVO" : "4. DESEMPEÑO OPERATIVO");

  const ejesActivos = (["calidad", "eficiencia", "resolucion", "recurrencia"] as const).filter(
    (e) => semaforo[e].estado !== "nd"
  );

  if (ejesActivos.length === 0) {
    lineas.push("El semáforo operacional no pudo calcularse por insuficiencia de datos en los ejes de análisis.");
  } else {
    const nombresEje: Record<string, string> = {
      calidad: "Calidad de datos",
      eficiencia: "Eficiencia operativa (TRI)",
      resolucion: "Tasa de resolución",
      recurrencia: "Recurrencia",
    };
    const descripcionesEje = ejesActivos
      .map((e) => `${nombresEje[e]}: ${semaforo[e].etiqueta} (${semaforo[e].valor})`)
      .join("; ");

    const ejesCriticos = ejesActivos.filter((e) => semaforo[e].estado === "rojo");
    const ejesAtenci = ejesActivos.filter((e) => semaforo[e].estado === "amarillo");

    let desempeno = `El semáforo operacional registró: ${descripcionesEje}.`;
    if (ejesCriticos.length > 0) {
      desempeno += ` Los ejes ${ejesCriticos.map((e) => nombresEje[e]).join(" y ")} presentan estado crítico y requieren intervención prioritaria.`;
    } else if (ejesAtenci.length > 0) {
      desempeno += ` Los ejes ${ejesAtenci.map((e) => nombresEje[e]).join(" y ")} requieren seguimiento.`;
    }

    if (datos.tiempoRespuestaInternoPromedio > 0) {
      desempeno += ` El tiempo de respuesta interno promedio fue de ${datos.tiempoRespuestaInternoPromedio} minutos.`;
    }
    lineas.push(desempeno);
  }
  lineas.push("");

  // ── 6. Recomendaciones ───────────────────────────────────────────────────────
  const secRecom = tieneGeo ? "6" : "5";
  lineas.push(`${secRecom}. RECOMENDACIONES`);

  const recAlta = recomendaciones.filter((r) => r.prioridad === "alta").slice(0, 3);
  const recMedia = recomendaciones.filter((r) => r.prioridad === "media").slice(0, 2);
  const recTotal = [...recAlta, ...recMedia].slice(0, 4);

  if (recTotal.length === 0) {
    lineas.push("No se generaron recomendaciones de alta prioridad para el período analizado.");
  } else {
    recTotal.forEach((r, i) => {
      const prio = r.prioridad === "alta" ? "Alta prioridad" : "Prioridad media";
      lineas.push(`${i + 1}. [${prio}] ${r.texto}`);
      if (r.detalle) lineas.push(`   ${r.detalle}`);
    });
  }
  lineas.push("");

  // ── 7. Conclusión ────────────────────────────────────────────────────────────
  const secConc = tieneGeo ? "7" : "6";
  lineas.push(`${secConc}. CONCLUSIÓN`);

  const ejesRojos = (["calidad", "eficiencia", "resolucion", "recurrencia"] as const).filter(
    (e) => semaforo[e].estado === "rojo"
  );
  const nombresEjeCortos: Record<string, string> = {
    calidad: "calidad de datos",
    eficiencia: "eficiencia operativa",
    resolucion: "resolución de casos",
    recurrencia: "recurrencia geográfica",
  };

  let conclusion = `El período ${periodo} `;
  if (tendencia === "creciente") {
    conclusion += "muestra un incremento sostenido de la demanda operativa";
  } else if (tendencia === "decreciente") {
    conclusion += "muestra una reducción en la demanda operativa";
  } else {
    conclusion += "presenta un volumen operativo estable";
  }

  if (ejesRojos.length > 0) {
    conclusion += `, con señales de alerta en ${ejesRojos.map((e) => nombresEjeCortos[e]).join(" y ")}.`;
    conclusion += ` La atención inmediata sobre estos ejes es recomendable antes del próximo período de análisis.`;
  } else {
    conclusion += ` y un desempeño operativo general ${estadoSemaforoTexto("verde")}.`;
    if (recAlta.length > 0) {
      conclusion += ` Se identifican oportunidades de mejora que conviene abordar en el corto plazo.`;
    }
  }
  lineas.push(conclusion);
  lineas.push("");
  lineas.push("— Documento generado automáticamente por el sistema CGM de Análisis Operativo —");

  return lineas.join("\n");
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function ResumenEjecutivoTexto({
  datos,
  perfil,
  semaforo,
  recomendaciones,
  nombreArchivo,
  mesFiltro = "",
}: ResumenEjecutivoTextoProps) {
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState("");

  const texto = generarTexto(datos, perfil, semaforo, recomendaciones, nombreArchivo, mesFiltro);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setError("");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setError("No se pudo acceder al portapapeles. Seleccioná y copiá el texto manualmente.");
    }
  };

  const handleDescargar = () => {
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const periodo = mesFiltro || (datos.meses[0] ?? "periodo");
    const nombre = `resumen-ejecutivo-cgm-${periodo}.txt`;
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-[#1f2535]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[rgba(200,168,75,0.10)] rounded-lg shrink-0">
            <FileText className="h-4 w-4 text-[#c8a84b]" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              Resumen Ejecutivo
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Generado automáticamente · listo para copiar o descargar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopiar}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              copiado
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                : "bg-slate-100 dark:bg-[#252d3d] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#2e3852] hover:bg-slate-200 dark:hover:bg-[#2e3852]"
            }`}
          >
            {copiado
              ? <><Check className="h-3.5 w-3.5" />Copiado</>
              : <><Copy className="h-3.5 w-3.5" />Copiar</>
            }
          </button>
          <button
            onClick={handleDescargar}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#c8a84b] hover:bg-[#d4b96a] text-[#0a0c10] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar TXT
          </button>
        </div>
      </div>

      {/* Error de clipboard */}
      {error && (
        <div className="flex items-center gap-2 px-5 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Texto */}
      <pre className="px-5 py-4 text-[12px] leading-relaxed text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-[480px] overflow-y-auto bg-slate-50 dark:bg-[#0d0f14]">
        {texto}
      </pre>
    </div>
  );
}
