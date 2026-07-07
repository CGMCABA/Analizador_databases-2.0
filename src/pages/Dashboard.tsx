import { useState, useCallback, useMemo, useEffect } from "react";
import { parsearExcel, DatosDashboard } from "@/lib/excelParser";
import { filtrarDatos } from "@/lib/filtrarDatos";
import { construirUrlExportXlsx } from "@/lib/googleSheetsUrl";
import { perfilarDataset } from "@/lib/insights/perfilDataset";
import { calcularSemaforo, generarRecomendaciones } from "@/lib/semaforoRecomendaciones";

import { PaginaInicio } from "@/components/PaginaInicio";
import { MetricCard } from "@/components/MetricCard";
import { GraficoBarras } from "@/components/GraficoBarras";
import { GraficoResolucion } from "@/components/GraficoResolucion";
import { GraficoLineas } from "@/components/GraficoLineas";
import { GraficoCalles } from "@/components/GraficoCalles";
import { ResumenGeografico } from "@/components/ResumenGeografico";
import { GraficoMapa } from "@/components/GraficoMapa";
import { GraficoHeatmap } from "@/components/GraficoHeatmap";
import { GraficoHorario } from "@/components/GraficoHorario";
import { GraficoRankingH } from "@/components/GraficoRankingH";
import { GraficoCruce } from "@/components/GraficoCruce";
import { GraficoCruceLinea } from "@/components/GraficoCruceLinea";
import { GraficoCruceCalle } from "@/components/GraficoCruceCalle";
import { LineaDeTiempo } from "@/components/LineaDeTiempo";
import { TablaDetalle } from "@/components/TablaDetalle";

import { InsightsPanel } from "@/components/InsightsPanel";
import { HallazgosPrincipales } from "@/components/HallazgosPrincipales";
import { GraficoCruceHeatmap } from "@/components/GraficoCruceHeatmap";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Sun, Moon, Filter, X, MapPin, Ban, GitCompareArrows, FileSpreadsheet, AlertCircle, TrendingUp, BarChart3, CheckCircle2, Clock, FilterX, LayoutDashboard, Briefcase, type LucideIcon } from "lucide-react";
import { GraficoTiempoRespuesta } from "@/components/GraficoTiempoRespuesta";
import { PanelTiempoRespuestaInterno } from "@/components/PanelTiempoRespuestaInterno";
import { PanelFalsosPositivos } from "@/components/PanelFalsosPositivos";
import { ZonasDeAtencion } from "@/components/ZonasDeAtencion";
import { OrientacionDataset } from "@/components/OrientacionDataset";
import { SemaforoOperacional } from "@/components/SemaforoOperacional";
import { RecomendacionesOperativas } from "@/components/RecomendacionesOperativas";
import { ComparacionPeriodos } from "@/components/ComparacionPeriodos";
import { compararPeriodos, ComparacionResultado } from "@/lib/compararPeriodos";
import { activa } from "@/lib/capacidades";
import { utilizable } from "@/lib/calidad";
import { VentanaPredictiva } from "@/components/VentanaPredictiva";
import { PlaceholderAnalisis } from "@/components/PlaceholderAnalisis";
import { ResumenEjecutivoTexto } from "@/components/ResumenEjecutivoTexto";

function SeparadorCapa({
  etiqueta,
  pregunta,
  acento,
}: {
  etiqueta: string;
  pregunta: string;
  acento: "slate" | "amber" | "teal";
}) {
  const _acento = acento; // conservado para compatibilidad de prop; todos los capítulos usan identidad dorada CGM
  void _acento;
  const colores = {
    label: "text-[#c8a84b] bg-[rgba(200,168,75,0.10)] border border-[rgba(200,168,75,0.35)]",
    dot:   "bg-[#c8a84b]",
    pregunta: "text-[#d4b96a]",
    gradFrom: "from-[#c8a84b]/50",
  };

  return (
    <div className="presentation-hide print:hidden flex items-center gap-3 pt-4 pb-1">
      <span className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${colores.label}`}>
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${colores.dot} pres-dot-active`} />
        {etiqueta}
      </span>
      <span className={`shrink-0 text-xs font-medium italic ${colores.pregunta}`}>{pregunta}</span>
      <div className={`flex-1 h-px bg-gradient-to-r ${colores.gradFrom} to-transparent`} />
    </div>
  );
}


function SeccionPasado({
  icono: Icono,
  titulo,
  subtitulo,
}: {
  icono: LucideIcon;
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <div className="presentation-hide print:hidden flex items-center gap-2.5 pt-2 pb-0.5">
      <Icono className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 shrink-0">{titulo}</p>
      {subtitulo && (
        <p className="text-xs italic text-slate-400 dark:text-slate-500 shrink-0">{subtitulo}</p>
      )}
      <div className="flex-1 h-px bg-slate-200 dark:bg-[#252d3d]" />
    </div>
  );
}

export default function Dashboard() {
  const [datos, setDatos] = useState<DatosDashboard | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string>("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string>("");
  const [mesFiltro, setMesFiltro] = useState<string>("");
  const [calleFiltro, setCalleFiltro] = useState<string>("");
  const [modoEjecutivo, setModoEjecutivo] = useState(false);
  const [bannerCuarentenaVisible, setBannerCuarentenaVisible] = useState(false);
  const { isDark, toggle } = useDarkMode();

  // Comparación de períodos
  const [modalComparacion, setModalComparacion] = useState(false);
  const [modoSeleccion, setModoSeleccion] = useState<"meses" | "archivo">("meses");
  const [mesA, setMesA] = useState("");
  const [mesB, setMesB] = useState("");
  const [cargandoB, setCargandoB] = useState(false);
  const [errorB, setErrorB] = useState("");
  const [modoComparacion, setModoComparacion] = useState(false);
  const [comparacionResultado, setComparacionResultado] = useState<ComparacionResultado | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modoEjecutivo) setModoEjecutivo(false);
        if (modalComparacion) setModalComparacion(false);
        if (modoComparacion) setModoComparacion(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modoEjecutivo, modalComparacion, modoComparacion]);

  // Acepta mesA/mesB opcionales para poder dispararse directo (ej. desde el CTA de
  // HallazgosPrincipales con los últimos 2 meses) sin pasar por el modal de selección.
  // Misma lógica de siempre — solo agrega de dónde puede venir el mes elegido.
  const ejecutarComparacionMeses = (mesAParam?: string, mesBParam?: string) => {
    const a = mesAParam ?? mesA;
    const b = mesBParam ?? mesB;
    if (!datos || !a || !b || a === b) return;
    const dA = filtrarDatos(datos, { mes: a });
    const dB = filtrarDatos(datos, { mes: b });
    const resultado = compararPeriodos(dA, dB, a, b, "meses");
    setComparacionResultado(resultado);
    setModalComparacion(false);
    setModoComparacion(true);
  };

  const [urlComparacion, setUrlComparacion] = useState("");
  const ejecutarComparacionUrl = async (url: string) => {
    if (!datos) return;
    const exportUrl = construirUrlExportXlsx(url);
    if (!exportUrl) {
      setErrorB("URL de Google Sheet no válida.");
      return;
    }
    setCargandoB(true);
    setErrorB("");
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error("No se pudo descargar. Verificá que el Sheet esté compartido.");
      const buffer = await res.arrayBuffer();
      const datosSegundoArchivo = parsearExcel(buffer);
      if (datosSegundoArchivo.tipoDato !== datos.tipoDato) {
        setErrorB(
          `Los archivos tienen tipos de datos distintos: "${datos.tipoDato}" vs "${datosSegundoArchivo.tipoDato}". Cargá dos archivos del mismo tipo.`
        );
        setCargandoB(false);
        return;
      }
      const labelA = nombreArchivo.replace(/\.(xlsx|xls)$/i, "");
      const labelB = "Sheet comparado";
      const resultado = compararPeriodos(datos, datosSegundoArchivo, labelA, labelB, "archivos");
      setComparacionResultado(resultado);
      setModalComparacion(false);
      setModoComparacion(true);
    } catch (e) {
      setErrorB(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    } finally {
      setCargandoB(false);
    }
  };

  const procesarBuffer = useCallback(async (buffer: ArrayBuffer, nombre: string) => {
    setCargando(true);
    setError("");
    try {
      const resultado = parsearExcel(buffer);
      setDatos(resultado);
      setNombreArchivo(nombre);
      setMesFiltro("");
      setCalleFiltro("");
      setBannerCuarentenaVisible((resultado.calidadDataset.registrosSinFechaValida ?? 0) > 0);
    } catch (e) {
      console.error("[Dashboard] Error al parsear Excel:", e);
      const mensaje =
        e instanceof Error && e.message
          ? e.message
          : "No se pudo leer el archivo. Asegurate de que sea un Excel válido (.xlsx o .xls).";
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  const handleBuffer = useCallback(async (buffer: ArrayBuffer, nombre: string) => {
    procesarBuffer(buffer, nombre);
  }, [procesarBuffer]);

  const handleUrl = useCallback(async (url: string, nombre: string) => {
    setCargando(true);
    setError("");
    try {
      const exportUrl = construirUrlExportXlsx(url);
      if (!exportUrl) throw new Error("URL de Google Sheet no válida. Pegá la URL completa de tu Google Sheet.");
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error("No se pudo descargar el archivo. Verificá que el Sheet esté compartido como 'cualquiera con el link puede ver'.");
      const buffer = await res.arrayBuffer();
      procesarBuffer(buffer, nombre || "Google Sheet");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar desde la URL.";
      setError(msg);
      setCargando(false);
    }
  }, [procesarBuffer]);

  const handleNuevaCarga = () => {
    setDatos(null);
    setNombreArchivo("");
    setError("");
    setMesFiltro("");
    setCalleFiltro("");
    setModoEjecutivo(false);
  };

  const datosFiltrados = useMemo<DatosDashboard | null>(() => {
    if (!datos) return null;
    if (!mesFiltro && !calleFiltro) return datos;
    return filtrarDatos(datos, { mes: mesFiltro || undefined, calle: calleFiltro || undefined });
  }, [datos, mesFiltro, calleFiltro]);

  const ultimoMes = datos?.porMes?.[datos.porMes.length - 1];
  const penultimoMes = datos?.porMes?.[datos.porMes.length - 2];

  const calcDelta = (curr: number, prev: number | undefined) =>
    prev && prev > 0 ? Math.round(((curr - prev) / prev) * 100) : undefined;

  const deltaTotal = ultimoMes && penultimoMes
    ? calcDelta(ultimoMes.cantidad, penultimoMes.cantidad) : undefined;
  const deltaResueltas = ultimoMes && penultimoMes
    ? calcDelta(ultimoMes.resueltas, penultimoMes.resueltas) : undefined;
  const deltaNoResueltas = ultimoMes && penultimoMes
    ? calcDelta(ultimoMes.cantidad - ultimoMes.resueltas, penultimoMes.cantidad - penultimoMes.resueltas) : undefined;
  const deltaTasa = ultimoMes && penultimoMes && penultimoMes.cantidad > 0
    ? Math.round(((ultimoMes.resueltas / ultimoMes.cantidad) - (penultimoMes.resueltas / penultimoMes.cantidad)) * 100)
    : undefined;

  const distribucionesCategoricasExtras = useMemo(() => {
    if (!datosFiltrados) return [];
    const primaria = datos?.colCategorica1;
    const secundaria = datos?.colCategorica2;
    return datosFiltrados.distribucionesCategoricas.filter(
      (d) => d.columna !== primaria && d.columna !== secundaria
    );
  }, [datosFiltrados, datos]);

  const semaforo = useMemo(
    () => (datosFiltrados ? calcularSemaforo(datosFiltrados) : null),
    [datosFiltrados]
  );

  // Perfilado de dataset (capacidades/características/insights) — se calcula una sola
  // vez acá y se reutiliza tanto en InsightsPanel como en generarRecomendaciones, para
  // no correr perfilarDataset() dos veces sobre el mismo datosFiltrados por render.
  const perfil = useMemo(
    () => (datosFiltrados ? perfilarDataset(datosFiltrados) : null),
    [datosFiltrados]
  );

  const recomendaciones = useMemo(
    () => (datosFiltrados && perfil ? generarRecomendaciones(datosFiltrados, perfil) : []),
    [datosFiltrados, perfil]
  );

  const topMotivoPorDia = useMemo<Record<string, string>>(() => {
    if (!datosFiltrados) return {};
    const DIAS_SEMANA_JS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    const mapa = new Map<string, Map<string, number>>();
    for (const s of datosFiltrados.solicitudes) {
      const p = s.fecha.split("/");
      if (p.length !== 3) continue;
      const date = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
      if (isNaN(date.getTime())) continue;
      const dia = DIAS_SEMANA_JS[date.getDay()];
      const mm = mapa.get(dia) ?? new Map<string, number>();
      mm.set(s.motivo, (mm.get(s.motivo) ?? 0) + 1);
      mapa.set(dia, mm);
    }
    const resultado: Record<string, string> = {};
    mapa.forEach((motivoMap, dia) => {
      const top = Array.from(motivoMap.entries()).sort((a, b) => b[1] - a[1])[0];
      if (top) resultado[dia] = top[0];
    });
    return resultado;
  }, [datosFiltrados]);

  return (
    <div
      className="min-h-screen bg-[#f0f2f5] dark:bg-[#0d0f14] transition-colors duration-300"
    >
      <header className="bg-[#0a0c10] text-white shadow-lg border-b-2 border-[#c8a84b] print-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3 flex-wrap">
          <div className="flex flex-col shrink-0">
            <span className="text-[17px] font-black tracking-[.15em] text-[#c8a84b] leading-none uppercase">CGM</span>
            <span className="text-[9px] text-slate-500 tracking-[.06em] uppercase mt-0.5">Centro de Monitoreo y Gestión de la Movilidad</span>
          </div>
          <div className="w-px h-7 bg-slate-700 shrink-0" />
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white">Dashboard de Reportes</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Inteligencia Urbana Operativa</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap print:hidden">
            {datos && (
              <div className="presentation-hide flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                <select
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                  className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer pr-1"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="" className="bg-slate-800 text-white">Todos los meses</option>
                  {datos.meses.map((m) => (
                    <option key={m} value={m} className="bg-slate-800 text-white">{m}</option>
                  ))}
                </select>
              </div>
            )}
            {datos && activa(datos.capacidades, "GeograficaCalles") && datos.porCalle.length > 0 && (
              <div className="presentation-hide flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                <select
                  value={calleFiltro}
                  onChange={(e) => setCalleFiltro(e.target.value)}
                  className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer pr-1 max-w-[180px]"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="" className="bg-slate-800 text-white">Todas las calles</option>
                  {datos.porCalle.map((c) => (
                    <option key={c.nombre} value={c.nombre} className="bg-slate-800 text-white">{c.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={toggle}
              title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              className="presentation-hide p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
            >
              {isDark
                ? <Sun className="h-4 w-4 text-yellow-300" />
                : <Moon className="h-4 w-4 text-slate-200" />
              }
            </button>
            {datos && (
              <button
                onClick={() => {
                  setModalComparacion(true);
                  setModoSeleccion("meses");
                  setMesA(datos.meses[0] ?? "");
                  setMesB(datos.meses[datos.meses.length - 1] ?? "");
                  setErrorB("");
                }}
                title="Comparar dos períodos de datos"
                className="presentation-hide flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-md font-medium"
              >
                <GitCompareArrows className="h-3.5 w-3.5" />
                <span>Comparar períodos</span>
              </button>
            )}
            {datos && (
              <button
                onClick={handleNuevaCarga}
                className="presentation-hide text-sm bg-white/10 hover:bg-white/20 transition-colors px-4 py-1.5 rounded-md font-medium"
              >
                Cargar otro archivo
              </button>
            )}
            {datos && (
              <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => setModoEjecutivo(false)}
                  title="Vista operativa completa"
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-semibold transition-colors ${
                    !modoEjecutivo
                      ? "bg-white/15 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Operativo
                </button>
                <button
                  onClick={() => setModoEjecutivo(true)}
                  title="Vista ejecutiva — KPIs, hallazgos y recomendaciones"
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-semibold transition-colors ${
                    modoEjecutivo
                      ? "bg-[#c8a84b] text-[#0a0c10]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  Ejecutivo
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!datos ? (
          <PaginaInicio
            onUrl={handleUrl}
            onBuffer={handleBuffer}
            onError={setError}
            cargando={cargando}
            error={error}
          />
        ) : modoEjecutivo ? (
          // ── MODO EJECUTIVO ─────────────────────────────────────────────────
          // VISIBLES (A): ResumenEjecutivoTexto · KPIs · SemaforoOperacional
          //               HallazgosPrincipales · GraficoMapa · RecomendacionesOperativas
          // OCULTOS  (C): OrientacionDataset · CalidadDataset · GraficoBarras
          //               GraficoLineas · GraficoHorario · GraficoHeatmap · GraficoCruce*
          //               GraficoCalles · GraficoRankingH · GraficoResolucion
          //               GraficoTiempoRespuesta · TablaDetalle · LineaDeTiempo
          //               VentanaPredictiva · PanelEventosCronicos · PanelFalsosPositivos
          //               PanelTiempoRespuestaInterno · ZonasDeAtencion · InsightsPanel
          <div id="ejecutivo-content" className="space-y-5">

            {/* ── Barra de contexto ────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-[rgba(200,168,75,0.10)] rounded-lg shrink-0">
                  <Briefcase className="h-4 w-4 text-[#c8a84b]" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug">
                    {nombreArchivo}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {datos.meses.length} {datos.meses.length === 1 ? "mes" : "meses"} · {datos.totalSolicitudes.toLocaleString("es-AR")} registros
                    {mesFiltro ? ` · Filtrando: ${mesFiltro}` : ""}
                  </p>
                </div>
              </div>
              {mesFiltro && (
                <button
                  onClick={() => setMesFiltro("")}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 bg-slate-100 dark:bg-[#252d3d] px-2.5 py-1 rounded-md border border-slate-200 dark:border-[#2e3852] transition-colors"
                >
                  <FilterX className="h-3 w-3" />
                  Quitar filtro
                </button>
              )}
            </div>

            {/* ── Resumen ejecutivo texto ──────────────────────────────────── */}
            {datosFiltrados && perfil && semaforo && (
              <ResumenEjecutivoTexto
                datos={datosFiltrados}
                perfil={perfil}
                semaforo={semaforo}
                recomendaciones={recomendaciones}
                nombreArchivo={nombreArchivo}
                mesFiltro={mesFiltro}
              />
            )}

            {/* ── KPIs ─────────────────────────────────────────────────────── */}
            {datosFiltrados && (() => {
              const total = datosFiltrados.totalSolicitudes;
              const horaPico = datosFiltrados.porHora.length > 0
                ? [...datosFiltrados.porHora].sort((a, b) => b.cantidad - a.cantidad)[0]
                : null;
              const diaPico = datosFiltrados.porDiaSemana.length > 0
                ? [...datosFiltrados.porDiaSemana].sort((a, b) => b.cantidad - a.cantidad)[0]
                : null;
              const topMotivo = datosFiltrados.porMotivo[0] ?? null;
              const topInt = datosFiltrados.porInterseccion[0] ?? null;

              const cards = [
                {
                  titulo: "Total Registros",
                  valor: total.toLocaleString("es-AR"),
                  subtitulo: mesFiltro ? `registros en ${mesFiltro}` : "registros totales",
                  color: "blue" as const, icono: "chart" as const,
                  delta: mesFiltro ? undefined : deltaTotal,
                  subtituloMes: mesFiltro ? undefined : ultimoMes?.mes,
                },
                datos.tieneColumnaStatus
                  ? {
                      titulo: datos.etiquetaStatus === "Resuelto" ? "Tasa de Resolución" : "Tasa de Finalización",
                      valor: `${datosFiltrados.tasaResolucion}%`,
                      subtitulo: datosFiltrados.tasaResolucion >= 75 ? "dentro de parámetro" : datosFiltrados.tasaResolucion >= 50 ? "requiere seguimiento" : "requiere atención urgente",
                      color: datosFiltrados.tasaResolucion >= 75 ? "green" as const : datosFiltrados.tasaResolucion >= 50 ? "amber" as const : "red" as const,
                      icono: "activity" as const,
                      delta: mesFiltro ? undefined : deltaTasa,
                      subtituloMes: mesFiltro ? undefined : ultimoMes?.mes,
                    }
                  : horaPico
                  ? {
                      titulo: "Hora pico",
                      valor: `${String(horaPico.hora).padStart(2, "0")}:00 hs`,
                      subtitulo: `${horaPico.cantidad.toLocaleString("es-AR")} registros en esa franja`,
                      color: "amber" as const, icono: "activity" as const,
                    }
                  : null,
                horaPico && datos.tieneColumnaStatus
                  ? {
                      titulo: "Hora pico",
                      valor: `${String(horaPico.hora).padStart(2, "0")}:00 hs`,
                      subtitulo: `${horaPico.cantidad.toLocaleString("es-AR")} registros en esa franja`,
                      color: "amber" as const, icono: "activity" as const,
                    }
                  : diaPico
                  ? {
                      titulo: "Día más activo",
                      valor: diaPico.dia,
                      subtitulo: `${diaPico.cantidad.toLocaleString("es-AR")} registros`,
                      color: "indigo" as const, icono: "calendar" as const,
                    }
                  : null,
                topInt
                  ? {
                      titulo: "Intersección principal",
                      valor: topInt.cantidad.toLocaleString("es-AR"),
                      subtitulo: topInt.nombre,
                      color: "violet" as const, icono: "tag" as const,
                    }
                  : topMotivo
                  ? {
                      titulo: `Tipo más frecuente`,
                      valor: `${total > 0 ? Math.round((topMotivo.cantidad / total) * 100) : 0}%`,
                      subtitulo: topMotivo.nombre,
                      color: "cyan" as const, icono: "tag" as const,
                    }
                  : null,
              ].filter(Boolean) as NonNullable<typeof cards[number]>[];

              return (
                <div className={`grid gap-4 grid-cols-2 ${cards.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                  {cards.slice(0, 4).map((card, i) => (
                    <div key={card.titulo} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                      <MetricCard
                        titulo={card.titulo}
                        valor={card.valor}
                        subtitulo={card.subtitulo}
                        color={card.color}
                        icono={card.icono}
                        delta={"delta" in card ? card.delta : undefined}
                        subtituloMes={"subtituloMes" in card ? card.subtituloMes : undefined}
                      />
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* ── Semáforo operacional ─────────────────────────────────────── */}
            {semaforo && <SemaforoOperacional resultado={semaforo} />}

            {/* ── Hallazgos + Mapa ─────────────────────────────────────────── */}
            {(() => {
              const tieneMapa = activa(datos.capacidades, "GeograficaCalles") && (datosFiltrados?.porCalle ?? []).length > 0;
              return (
                <div className={tieneMapa ? "grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start" : ""}>
                  {perfil && (
                    <HallazgosPrincipales
                      perfil={perfil}
                      onVerComparacion={() => {
                        const ultimo = datos.meses[datos.meses.length - 1];
                        const penultimo = datos.meses[datos.meses.length - 2];
                        if (ultimo && penultimo) ejecutarComparacionMeses(penultimo, ultimo);
                      }}
                    />
                  )}
                  {tieneMapa && datosFiltrados && (
                    <GraficoMapa
                      intersecciones={datosFiltrados.porInterseccion}
                      totalSolicitudes={datosFiltrados.totalSolicitudes}
                    />
                  )}
                </div>
              );
            })()}

            {/* ── Recomendaciones ──────────────────────────────────────────── */}
            {recomendaciones.length > 0 && (
              <RecomendacionesOperativas recomendaciones={recomendaciones} />
            )}

          </div>
        ) : (
          // ── MODO OPERATIVO ─────────────────────────────────────────────────
          <div id="dashboard-content" className="space-y-6">
            <div className="presentation-hide flex items-center justify-between flex-wrap gap-3 print:hidden">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Archivo cargado</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{nombreArchivo}</p>
              </div>
              <div className="flex items-center gap-2">
                {mesFiltro && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-md font-medium">
                    Filtrando: {mesFiltro}
                    <button
                      onClick={() => setMesFiltro("")}
                      className="ml-1.5 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                    >×</button>
                  </span>
                )}
                {calleFiltro && (
                  <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-md font-medium">
                    Calle: {calleFiltro}
                    <button
                      onClick={() => setCalleFiltro("")}
                      className="ml-1.5 text-violet-400 hover:text-violet-600 dark:hover:text-violet-300"
                    >×</button>
                  </span>
                )}
                <div className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-[#131720] px-3 py-1.5 rounded-md border border-slate-200 dark:border-[#1f2535]">
                  {datos.meses.length} {datos.meses.length === 1 ? "mes" : "meses"} detectados
                </div>
              </div>
            </div>

            <div className="hidden print:block text-xs text-slate-500 mb-2">
              Archivo: {nombreArchivo}{mesFiltro ? ` · Mes: ${mesFiltro}` : ""}{calleFiltro ? ` · Calle: ${calleFiltro}` : ""}
            </div>

            <OrientacionDataset datos={datos} nombreArchivo={nombreArchivo} />

            {bannerCuarentenaVisible && (datos.calidadDataset.registrosSinFechaValida ?? 0) > 0 && (
              <div className="presentation-hide flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-4 print:hidden">
                <Ban className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {(datos.calidadDataset.registrosSinFechaValida ?? 0).toLocaleString("es-AR")} registro{(datos.calidadDataset.registrosSinFechaValida ?? 0) !== 1 ? "s" : ""} excluido{(datos.calidadDataset.registrosSinFechaValida ?? 0) !== 1 ? "s" : ""} del análisis
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-0.5 leading-relaxed">
                    {(datos.calidadDataset.registrosSinFechaValida ?? 0) !== 1 ? "Estos registros tienen" : "Este registro tiene"} fecha inválida, ausente o fuera del rango permitido y no {(datos.calidadDataset.registrosSinFechaValida ?? 0) !== 1 ? "fueron tomados" : "fue tomado"} en ninguna métrica ni gráfico. Revisá la columna de fecha en el archivo original para corregirlos.
                  </p>
                </div>
                <button
                  onClick={() => setBannerCuarentenaVisible(false)}
                  className="shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-800/40 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                  title="Cerrar aviso"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <SeparadorCapa etiqueta="Pasado" pregunta="¿Qué pasó y por qué?" acento="slate" />

            {/* ─── A. Evolución temporal ────────────────────────────── */}
            <SeccionPasado icono={TrendingUp} titulo="Evolución temporal" subtitulo="¿cómo evolucionó el volumen?" />

            {activa(datos.capacidades, "Estado") && utilizable(datos.calidad, "Estado") ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    titulo: "Total Registros",
                    valor: (datosFiltrados?.totalSolicitudes ?? 0).toLocaleString("es-AR"),
                    subtitulo: mesFiltro ? `registros en ${mesFiltro}` : "registros totales",
                    color: "blue" as const, icono: "chart" as const,
                    delta: mesFiltro ? undefined : deltaTotal,
                    subtituloMes: mesFiltro ? undefined : ultimoMes?.mes,
                  },
                  {
                    titulo: datos.etiquetaStatus === "Resuelto" ? "Tasa de Resolución" : "Tasa de Finalización",
                    valor: `${datosFiltrados?.tasaResolucion ?? 0}%`,
                    subtitulo: mesFiltro
                      ? `tasa en ${mesFiltro}`
                      : datos.etiquetaStatus === "Resuelto" ? "porcentaje resueltas" : "porcentaje finalizadas",
                    color: "cyan" as const, icono: "activity" as const,
                    delta: mesFiltro ? undefined : deltaTasa,
                    subtituloMes: mesFiltro ? undefined : ultimoMes?.mes,
                  },
                ].map((card, i) => (
                  <div
                    key={card.titulo}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <MetricCard
                      titulo={card.titulo}
                      valor={card.valor}
                      subtitulo={card.subtitulo}
                      color={card.color}
                      icono={card.icono}
                      delta={card.delta}
                      subtituloMes={card.subtituloMes}
                    />
                  </div>
                ))}
              </div>
            ) : datos.tipoDato === 'sucesos' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(() => {
                  const horaPico = (datosFiltrados?.porHora ?? []).length > 0
                    ? [...datosFiltrados!.porHora].sort((a, b) => b.cantidad - a.cantidad)[0]
                    : null;
                  const diaPico = (datosFiltrados?.porDiaSemana ?? []).length > 0
                    ? [...datosFiltrados!.porDiaSemana].sort((a, b) => b.cantidad - a.cantidad)[0]
                    : null;
                  const intPico = (datosFiltrados?.porInterseccion ?? []).length > 0 ? datosFiltrados!.porInterseccion[0] : null;
                  const total = datosFiltrados?.totalSolicitudes ?? 0;
                  return [
                    {
                      titulo: "Total Registros",
                      valor: total.toLocaleString("es-AR"),
                      subtitulo: mesFiltro ? `registros en ${mesFiltro}` : "registros totales",
                      color: "blue" as const, icono: "chart" as const,
                      delta: mesFiltro ? undefined : deltaTotal,
                      subtituloMes: mesFiltro ? undefined : ultimoMes?.mes,
                    },
                    {
                      titulo: "Hora pico",
                      valor: horaPico ? `${String(horaPico.hora).padStart(2, "0")}:00 hs` : "—",
                      subtitulo: horaPico ? `${horaPico.cantidad.toLocaleString("es-AR")} registros en esa franja` : "sin datos de hora",
                      color: "amber" as const, icono: "activity" as const,
                    },
                    {
                      titulo: "Día más activo",
                      valor: diaPico ? diaPico.dia : "—",
                      subtitulo: diaPico ? `${diaPico.cantidad.toLocaleString("es-AR")} registros` : "sin datos de fecha",
                      color: "indigo" as const, icono: "calendar" as const,
                    },
                    {
                      titulo: "Intersección principal",
                      valor: intPico ? intPico.cantidad.toLocaleString("es-AR") : "—",
                      subtitulo: intPico ? intPico.nombre : ((datosFiltrados?.porInterseccion ?? []).length === 0 ? "sin datos de calles" : ""),
                      color: "violet" as const, icono: "tag" as const,
                    },
                  ].map((card, i) => (
                    <div
                      key={card.titulo}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <MetricCard
                        titulo={card.titulo}
                        valor={card.valor}
                        subtitulo={card.subtitulo}
                        color={card.color}
                        icono={card.icono}
                        delta={"delta" in card ? card.delta : undefined}
                        subtituloMes={"subtituloMes" in card ? card.subtituloMes : undefined}
                      />
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                  titulo="Total Registros"
                  valor={(datosFiltrados?.totalSolicitudes ?? 0).toLocaleString("es-AR")}
                  subtitulo={mesFiltro ? `registros en ${mesFiltro}` : "registros totales en el archivo"}
                  color="blue"
                  icono="chart"
                  delta={mesFiltro ? undefined : deltaTotal}
                  subtituloMes={mesFiltro ? undefined : ultimoMes?.mes}
                />
                <MetricCard
                  titulo="Meses con datos"
                  valor={String(datos.meses.length)}
                  subtitulo={datos.meses.length > 0 ? `${datos.meses[0]} → ${datos.meses[datos.meses.length - 1]}` : ""}
                  color="indigo"
                  icono="calendar"
                />
                {datosFiltrados?.distribucionesCategoricas[0] && (
                  <MetricCard
                    titulo={`Valores en ${datos.colCategorica1 ?? "Categoría"}`}
                    valor={String(datosFiltrados.distribucionesCategoricas[0].datos.length)}
                    subtitulo={`categorías distintas detectadas`}
                    color="violet"
                    icono="tag"
                  />
                )}
              </div>
            )}

            {activa(datos.capacidades, "Programacion") && (
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  titulo="No Programados"
                  valor={(datosFiltrados?.totalNoProgramados ?? 0).toLocaleString("es-AR")}
                  subtitulo="sucesos reactivos sin planificación previa"
                  color="red"
                  icono="activity"
                />
                <MetricCard
                  titulo="Programados"
                  valor={(datosFiltrados?.totalProgramados ?? 0).toLocaleString("es-AR")}
                  subtitulo="eventos y tareas con planificación previa"
                  color="amber"
                  icono="calendar"
                />
              </div>
            )}

            <GraficoBarras
              datos={datos.porMes}
              mesFiltro={mesFiltro}
              mostrarResolucion={activa(datos.capacidades, "Estado") && utilizable(datos.calidad, "Estado")}
              mostrarProgramacion={activa(datos.capacidades, "Programacion")}
              etiquetaStatus={datos.etiquetaStatus}
            />

            {perfil && (
              <HallazgosPrincipales
                perfil={perfil}
                onVerComparacion={() => {
                  const ultimo = datos.meses[datos.meses.length - 1];
                  const penultimo = datos.meses[datos.meses.length - 2];
                  if (ultimo && penultimo) ejecutarComparacionMeses(penultimo, ultimo);
                }}
              />
            )}

            <InsightsPanel datos={datosFiltrados!} mesFiltro={mesFiltro} soloAlertas />

            {!mesFiltro && activa(datos.capacidades, "CruceCategoriaMes") && (datosFiltrados?.porMotivo ?? []).length >= 2 && (
              <GraficoCruce
                solicitudes={datosFiltrados!.solicitudes}
                meses={datos.meses}
                porMotivo={datosFiltrados!.porMotivo}
                colNombreFila={datos.colCategorica1 ?? "Categoría"}
              />
            )}

            {mesFiltro && activa(datos.capacidades, "CruceCategoriaMes") && datos.porMotivo.length >= 2 && (
              <PlaceholderAnalisis
                icono={FilterX}
                titulo="Análisis por mes no disponible con filtro activo"
                descripcion={`Este gráfico necesita todos los meses para mostrar la evolución por categoría. Estás viendo solo ${mesFiltro}.`}
                variante="filtro"
                accion={{ label: "Quitar filtro de mes", onClick: () => setMesFiltro("") }}
              />
            )}

            {datos.meses.length >= 1 && (datosFiltrados?.solicitudes ?? []).length > 0 && (
              <LineaDeTiempo
                solicitudes={datosFiltrados!.solicitudes}
                meses={datos.meses}
              />
            )}

            {/* ─── B. Distribución ─────────────────────────────────── */}
            <SeccionPasado icono={BarChart3} titulo="Distribución" subtitulo="¿qué ocurre más y en qué categorías?" />

            {activa(datos.capacidades, "Categoria") && (datosFiltrados?.porMotivo ?? []).length > 0 && (
              <GraficoRankingH
                datos={datosFiltrados!.porMotivo}
                titulo={`Ranking por ${datos.colCategorica1 ?? "Categoría Principal"}`}
                subtitulo="Valores ordenados por volumen — categoría principal de análisis"
                totalGlobal={datosFiltrados!.totalSolicitudes}
                acento="blue"
                limiteInicial={10}
              />
            )}

            {((datosFiltrados?.porArea ?? []).length > 0 || (datosFiltrados?.porLinea ?? []).length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {(datosFiltrados?.porArea ?? []).length > 0 && (
                  <div className="lg:col-span-2">
                    <GraficoRankingH
                      datos={datosFiltrados!.porArea}
                      titulo={`Por ${datos.colCategorica2 ?? "Categoría Secundaria"}`}
                      subtitulo="Segunda dimensión de análisis"
                      totalGlobal={datosFiltrados!.totalSolicitudes}
                      acento="violet"
                      limiteInicial={10}
                      alturaFila={24}
                    />
                  </div>
                )}
                {activa(datos.capacidades, "Cobertura") && (datosFiltrados?.porLinea ?? []).length > 0 && (
                  <div className={(datosFiltrados?.porArea ?? []).length > 0 ? "lg:col-span-3" : "lg:col-span-5"}>
                    <GraficoLineas datos={datosFiltrados!.porLinea ?? []} />
                  </div>
                )}
              </div>
            )}

            {distribucionesCategoricasExtras.map((dist, idx) => (
              <GraficoRankingH
                key={dist.columna}
                datos={dist.datos}
                titulo={`Distribución: ${dist.columna}`}
                subtitulo={`Frecuencia de valores detectados en la columna "${dist.columna}"`}
                totalGlobal={datosFiltrados!.totalSolicitudes}
                acento={idx % 2 === 0 ? "green" : "blue"}
                limiteInicial={10}
              />
            ))}

            {activa(datos.capacidades, "CruceCategoriaCobertura") && (datosFiltrados?.porLinea ?? []).length >= 2 && (datosFiltrados?.porMotivo ?? []).length >= 2 && (
              <GraficoCruceLinea
                registros={datosFiltrados!.registros}
                porMotivo={datosFiltrados!.porMotivo}
                porLinea={datosFiltrados!.porLinea ?? []}
                colNombreFila={datos.colCategorica1}
                colNombreLinea={datos.colLinea}
              />
            )}

            {/* ─── C. Calidad de atención ──────────────────────────── */}
            <SeccionPasado icono={CheckCircle2} titulo="Calidad de atención" subtitulo="¿se resuelve bien y rápido?" />

            {((activa(datos.capacidades, "Estado") && utilizable(datos.calidad, "Estado")) ||
              activa(datos.capacidades, "TiempoRespuesta") ||
              activa(datos.capacidades, "DerivacionInterna")) ? (
              <>
                {activa(datos.capacidades, "Estado") && utilizable(datos.calidad, "Estado") && (
                  <GraficoResolucion
                    porMotivo={datosFiltrados?.resolucionPorMotivo ?? []}
                    porArea={datosFiltrados?.resolucionPorArea ?? []}
                  />
                )}

                {activa(datos.capacidades, "TiempoRespuesta") && ((datosFiltrados?.porTiempoRespuestaArea ?? []).length >= 2 || (datosFiltrados?.tiempoRespuestaPorMotivo ?? []).length >= 2) && (
                  <div className={
                    (datosFiltrados?.porTiempoRespuestaArea ?? []).length >= 2 && (datosFiltrados?.tiempoRespuestaPorMotivo ?? []).length >= 2
                      ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
                      : ""
                  }>
                    {(datosFiltrados?.porTiempoRespuestaArea ?? []).length >= 2 && (
                      <GraficoTiempoRespuesta datos={datosFiltrados!.porTiempoRespuestaArea} />
                    )}
                    {(datosFiltrados?.tiempoRespuestaPorMotivo ?? []).length >= 2 && (
                      <GraficoTiempoRespuesta
                        datos={datosFiltrados!.tiempoRespuestaPorMotivo}
                        titulo={`Tiempo de respuesta por ${datos.colCategorica1 ?? "categoría"}`}
                        subtitulo={`Promedio de tiempo en minutos · por tipo de ${datos.colCategorica1 ?? "categoría"} · top 15`}
                      />
                    )}
                  </div>
                )}

                {activa(datos.capacidades, "DerivacionInterna") && (
                  <PanelTiempoRespuestaInterno
                    promedioGeneral={datosFiltrados?.tiempoRespuestaInternoPromedio ?? 0}
                    porMotivo={datosFiltrados?.tiempoRespuestaInternoPorMotivo ?? []}
                    porArea={datosFiltrados?.tiempoRespuestaInternoPorArea ?? []}
                    distribucion={datosFiltrados?.distribucionTiempoRespuestaInterno ?? []}
                    etiquetaMotivo={datos.colCategorica1 ?? "Categoría"}
                  />
                )}
              </>
            ) : (
              <PlaceholderAnalisis
                icono={AlertCircle}
                titulo="Sin datos de resolución ni tiempos de atención"
                descripcion="Para ver este análisis el archivo necesita una columna de estado/resolución, tiempo de respuesta o derivación interna."
                variante="ausente"
              />
            )}

            {/* ─── D. Geografía ────────────────────────────────────── */}
            {activa(datos.capacidades, "GeograficaCalles") && (
              <>
                <SeccionPasado icono={MapPin} titulo="Geografía" subtitulo="¿dónde se concentra el problema?" />

                {perfil && (
                  <ResumenGeografico
                    porCalle={datosFiltrados?.porCalle ?? []}
                    totalSolicitudes={datosFiltrados?.totalSolicitudes ?? 0}
                    perfil={perfil}
                  />
                )}

                <GraficoCalles
                  datos={datosFiltrados?.porCalle ?? []}
                  totalSolicitudes={datosFiltrados?.totalSolicitudes ?? 0}
                />

                {(datosFiltrados?.porInterseccion ?? []).length > 0 && (
                  <GraficoRankingH
                    datos={datosFiltrados!.porInterseccion}
                    titulo="Intersecciones más cargadas"
                    subtitulo="Combinación de calles con mayor cantidad de registros"
                    totalGlobal={datosFiltrados!.totalSolicitudes}
                    acento="violet"
                    limiteInicial={10}
                  />
                )}

                <div className="print:hidden">
                  <GraficoMapa
                    intersecciones={datosFiltrados?.porInterseccion ?? []}
                    totalSolicitudes={datosFiltrados?.totalSolicitudes ?? 0}
                  />
                </div>
              </>
            )}

            {/* ─── E. Patrones temporales ──────────────────────────── */}
            {activa(datos.capacidades, "TemporalBasica") && (
              <>
                <SeccionPasado icono={Clock} titulo="Patrones temporales" subtitulo="¿cuándo ocurre?" />

                {(datosFiltrados?.porDiaSemana ?? []).length >= 7 && (
                  <GraficoHeatmap
                    datos={datosFiltrados!.porDiaSemana}
                    topMotivoPorDia={topMotivoPorDia}
                    totalSolicitudes={datosFiltrados!.totalSolicitudes}
                  />
                )}

                {activa(datos.capacidades, "TemporalBasica") &&
                  (datosFiltrados?.porDiaSemana ?? []).length > 0 &&
                  (datosFiltrados?.porDiaSemana ?? []).length < 7 && (
                  <p className="presentation-hide print:hidden text-xs text-slate-400 dark:text-slate-500 italic px-1">
                    El mapa de calor por día requiere datos de los 7 días de la semana — este período cubre {(datosFiltrados?.porDiaSemana ?? []).length} día{(datosFiltrados?.porDiaSemana ?? []).length !== 1 ? "s" : ""}.
                  </p>
                )}

                {activa(datos.capacidades, "Horaria") && (datosFiltrados?.porHora ?? []).length > 0 && (
                  <GraficoHorario
                    datos={datosFiltrados!.porHora}
                    totalSolicitudes={datosFiltrados!.totalSolicitudes}
                  />
                )}

                {(() => {
                  const crucesSinMes = (datosFiltrados?.crucesAutomaticos ?? []).filter(
                    (c) => !c.titulo.toLowerCase().includes("mes")
                  );
                  if (crucesSinMes.length === 0) return null;
                  return (
                    <details className="group print:hidden">
                      <summary className="presentation-hide flex items-center gap-2 cursor-pointer select-none px-1 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 list-none hover:text-slate-800 dark:hover:text-slate-100">
                        <span className="transition-transform group-open:rotate-90 text-slate-400">▶</span>
                        Ver patrones temporales avanzados (categoría × hora / día)
                      </summary>
                      <div className="mt-2 space-y-4">
                        {crucesSinMes.map((cruce, idx) => (
                          <GraficoCruceHeatmap
                            key={`${cruce.tipo}-${idx}`}
                            cruce={cruce}
                            totalSolicitudes={datosFiltrados!.totalSolicitudes}
                          />
                        ))}
                      </div>
                    </details>
                  );
                })()}
              </>
            )}

            {/* ─── F. Datos complementarios ────────────────────────── */}
            <details className="group print:hidden">
              <summary className="presentation-hide flex items-center gap-2 cursor-pointer select-none px-1 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 list-none hover:text-slate-800 dark:hover:text-slate-100">
                <span className="transition-transform group-open:rotate-90 text-slate-400">▶</span>
                Datos complementarios
              </summary>
              <div className="mt-2 space-y-4">
                {activa(datos.capacidades, "CruceCategoriaCalle") && (datosFiltrados?.porCalle1Ranking ?? []).length >= 2 && (datosFiltrados?.porMotivo ?? []).length >= 2 && (
                  <GraficoCruceCalle
                    registros={datosFiltrados!.registros}
                    porMotivo={datosFiltrados!.porMotivo}
                    porCalle1Ranking={datosFiltrados!.porCalle1Ranking ?? []}
                    colNombreFila={datos.colCalle1}
                    colNombreMotivo={datos.colCategorica1}
                  />
                )}

                {(datosFiltrados?.registros ?? []).length > 0 && datos.columnas.length > 0 && (
                  <TablaDetalle
                    registros={datosFiltrados!.registros}
                    columnas={datos.columnas}
                    meses={datos.meses}
                  />
                )}
              </div>
            </details>

            {/* ─── PRESENTE ─────────────────────────────────────────────── */}
            <SeparadorCapa etiqueta="Presente" pregunta="¿Dónde estamos parados y qué es urgente?" acento="amber" />

            {semaforo && <SemaforoOperacional resultado={semaforo} />}

            {mesFiltro ? (
              <PlaceholderAnalisis
                icono={FilterX}
                titulo="Zonas de atención no disponibles con filtro de mes activo"
                descripcion={`Este análisis detecta patrones crónicos sobre el dataset completo. Estás viendo solo ${mesFiltro}.`}
                variante="filtro"
                accion={{ label: "Quitar filtro de mes", onClick: () => setMesFiltro("") }}
              />
            ) : (
              <ZonasDeAtencion
                indiceFragilidad={datosFiltrados?.indiceFragilidad ?? []}
                crucesCronicos={datosFiltrados?.crucesCronicos ?? []}
              />
            )}

            {(datosFiltrados?.totalFalsosPositivos ?? 0) > 0 && (
              <PanelFalsosPositivos
                totalFalsosPositivos={datosFiltrados!.totalFalsosPositivos}
                tasaFalsosPositivos={datosFiltrados!.tasaFalsosPositivos}
                totalSolicitudes={datosFiltrados!.totalSolicitudes}
                tiposFalsosPositivos={datosFiltrados!.tiposFalsosPositivos}
              />
            )}

            {/* ─── FUTURO ───────────────────────────────────────────────── */}
            <SeparadorCapa etiqueta="Futuro" pregunta="¿Qué conviene hacer ahora?" acento="teal" />

            {recomendaciones.length > 0 && (
              <RecomendacionesOperativas recomendaciones={recomendaciones} />
            )}

            {datos.tipoDato === "solicitudes" && datos.porMes.length >= 2 ? (
              <VentanaPredictiva datos={datos} />
            ) : datos.tipoDato !== "solicitudes" ? (
              <PlaceholderAnalisis
                icono={TrendingUp}
                titulo="Proyección no disponible para este tipo de dataset"
                descripcion="La ventana predictiva aplica solo a solicitudes de servicio, no a registros de sucesos o eventos."
                variante="ausente"
              />
            ) : (
              <PlaceholderAnalisis
                icono={Clock}
                titulo="Se necesitan al menos 2 meses para proyectar"
                descripcion="El modelo predictivo requiere una tendencia histórica. Aparecerá automáticamente cuando el dataset tenga más meses."
                variante="temporal"
              />
            )}
          </div>
        )}
      </main>

      {modoComparacion && comparacionResultado && (
        <ComparacionPeriodos
          resultado={comparacionResultado}
          onCerrar={() => setModoComparacion(false)}
        />
      )}

      {modalComparacion && datos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setModalComparacion(false); }}>
          <div className="bg-white dark:bg-[#131720] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
            {/* Encabezado */}
            <div className="bg-[#1a2b4a] text-white px-6 py-4 flex items-center gap-3">
              <GitCompareArrows className="h-5 w-5 shrink-0" />
              <div>
                <h3 className="font-bold text-base">Comparar períodos</h3>
                <p className="text-xs text-slate-300 mt-0.5">Elegí cómo querés comparar los datos</p>
              </div>
              <button onClick={() => setModalComparacion(false)} className="ml-auto p-1.5 rounded-md hover:bg-white/10 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-[#1f2535]">
              {(["meses", "archivo"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setModoSeleccion(tab); setErrorB(""); }}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${modoSeleccion === tab ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                >
                  {tab === "meses" ? "Comparar meses" : "Comparar con otra URL"}
                </button>
              ))}
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-5">
              {modoSeleccion === "meses" ? (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Seleccioná dos meses del archivo actual para comparar sus métricas lado a lado.
                  </p>
                  {datos.meses.length < 2 ? (
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      El archivo solo tiene un mes. Subí un archivo con múltiples meses para comparar.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {(["A", "B"] as const).map((letra) => {
                        const val = letra === "A" ? mesA : mesB;
                        const set = letra === "A" ? setMesA : setMesB;
                        return (
                          <div key={letra} className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              Período {letra}
                            </label>
                            <select
                              value={val}
                              onChange={(e) => set(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-[#2e3852] rounded-lg bg-white dark:bg-[#252d3d] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                            >
                              <option value="">-- Seleccionar --</option>
                              {datos.meses.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {mesA && mesB && mesA === mesB && (
                    <p className="text-xs text-red-500 dark:text-red-400">Seleccioná dos meses distintos para comparar.</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Pegá la URL de otro Google Sheet para comparar con <span className="font-semibold text-slate-700 dark:text-slate-200">{nombreArchivo}</span>.
                  </p>
                  <input
                    type="url"
                    value={urlComparacion}
                    onChange={(e) => setUrlComparacion(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    onKeyDown={(e) => e.key === "Enter" && ejecutarComparacionUrl(urlComparacion)}
                    className="w-full bg-white dark:bg-[#252d3d] border border-slate-200 dark:border-[#2e3852] rounded-lg px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    disabled={cargandoB}
                  />
                  <button
                    onClick={() => ejecutarComparacionUrl(urlComparacion)}
                    disabled={cargandoB || !urlComparacion.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {cargandoB ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4" />
                        Cargar y comparar
                      </>
                    )}
                  </button>
                  {errorB && (
                    <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      {errorB}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {modoSeleccion === "meses" && datos.meses.length >= 2 && (
              <div className="px-6 pb-6 flex justify-end">
                <button
                  onClick={() => ejecutarComparacionMeses()}
                  disabled={!mesA || !mesB || mesA === mesB}
                  className="flex items-center gap-2 bg-[#1a2b4a] hover:bg-[#243b63] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  <GitCompareArrows className="h-4 w-4" />
                  Ver comparación
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
