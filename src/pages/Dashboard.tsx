import { useState, useCallback, useMemo, useEffect } from "react";
import { parsearExcel, DatosDashboard } from "@/lib/excelParser";
import { filtrarDatos } from "@/lib/filtrarDatos";
import { construirUrlExportXlsx } from "@/lib/googleSheetsUrl";
import { perfilarDataset } from "@/lib/insights/perfilDataset";
import { calcularSemaforo, generarRecomendaciones } from "@/lib/semaforoRecomendaciones";
import { etiquetaTipo } from "@/lib/columnClassifier";
import { PaginaInicio } from "@/components/PaginaInicio";
import { MetricCard } from "@/components/MetricCard";
import { GraficoBarras } from "@/components/GraficoBarras";
import { GraficoResolucion } from "@/components/GraficoResolucion";
import { GraficoLineas } from "@/components/GraficoLineas";
import { GraficoCalles } from "@/components/GraficoCalles";
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
import { ClipboardList, Sun, Moon, Filter, Printer, Monitor, X, CheckCircle2, Tag, MapPin, BarChart2, Info, Ban, GitCompareArrows, FileSpreadsheet, AlertCircle } from "lucide-react";
import { PresentacionDiapositivas } from "@/components/PresentacionDiapositivas";
import { GraficoTiempoRespuesta } from "@/components/GraficoTiempoRespuesta";
import { PanelTiempoRespuestaInterno } from "@/components/PanelTiempoRespuestaInterno";
import { PanelFalsosPositivos } from "@/components/PanelFalsosPositivos";
import { PanelEventosCronicos } from "@/components/PanelEventosCronicos";
import { IndiceFragilidad } from "@/components/IndiceFragilidad";
import { CalidadDataset } from "@/components/CalidadDataset";
import { SemaforoOperacional } from "@/components/SemaforoOperacional";
import { RecomendacionesOperativas } from "@/components/RecomendacionesOperativas";
import { ComparacionPeriodos } from "@/components/ComparacionPeriodos";
import { compararPeriodos, ComparacionResultado } from "@/lib/compararPeriodos";
import { VentanaPredictiva } from "@/components/VentanaPredictiva";

function SeparadorCapa({
  etiqueta,
  pregunta,
  acento,
}: {
  etiqueta: string;
  pregunta: string;
  acento: "slate" | "amber" | "teal";
}) {
  const colores = {
    slate: {
      label: "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
      dot: "bg-slate-400 dark:bg-slate-500",
      pregunta: "text-slate-500 dark:text-slate-400",
      gradFrom: "from-slate-200 dark:from-slate-700",
    },
    amber: {
      label: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800",
      dot: "bg-amber-400 dark:bg-amber-500",
      pregunta: "text-amber-600 dark:text-amber-500",
      gradFrom: "from-amber-300 dark:from-amber-700",
    },
    teal: {
      label: "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800",
      dot: "bg-teal-400 dark:bg-teal-500",
      pregunta: "text-teal-600 dark:text-teal-500",
      gradFrom: "from-teal-300 dark:from-teal-700",
    },
  }[acento];

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

const TIPO_COLOR: Record<string, string> = {
  categorica: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
  status: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
  fecha: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  hora: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  programacion: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
  direccion: "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800",
  numerica: "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800",
  texto_libre: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600",
  id: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600",
  ignorar: "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700",
};

export default function Dashboard() {
  const [datos, setDatos] = useState<DatosDashboard | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string>("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string>("");
  const [mesFiltro, setMesFiltro] = useState<string>("");
  const [calleFiltro, setCalleFiltro] = useState<string>("");
  const [modoPresentation, setModoPresentation] = useState(false);
  const [bannerExpandido, setBannerExpandido] = useState(false);
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
        if (modoPresentation) setModoPresentation(false);
        if (modalComparacion) setModalComparacion(false);
        if (modoComparacion) setModoComparacion(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modoPresentation, modalComparacion, modoComparacion]);

  const ejecutarComparacionMeses = () => {
    if (!datos || !mesA || !mesB || mesA === mesB) return;
    const dA = filtrarDatos(datos, { mes: mesA });
    const dB = filtrarDatos(datos, { mes: mesB });
    const resultado = compararPeriodos(dA, dB, mesA, mesB, "meses");
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
      setBannerExpandido(false);
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

  return (
    <div
      className="min-h-screen bg-[#f0f2f5] dark:bg-[#0c1525] transition-colors duration-300"
      data-presentation={modoPresentation ? "true" : undefined}
    >
      <header className="bg-[#1a2b4a] text-white shadow-lg print-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3 flex-wrap">
          <ClipboardList className="h-7 w-7 text-[#4fc3f7] shrink-0" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dashboard de Reportes</h1>
            <p className="text-xs text-slate-300 mt-0.5">Inteligencia Urbana Operativa</p>
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
            {datos && datos.tieneColumnasCalles && datos.porCalle.length > 0 && (
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
                onClick={() => window.print()}
                title="Imprimir / Guardar como PDF"
                className="presentation-hide flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-md font-medium"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Exportar PDF</span>
              </button>
            )}
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
            <button
              onClick={() => setModoPresentation((v) => !v)}
              disabled={!datos}
              title={
                !datos
                  ? "Cargá un archivo para usar el modo presentación"
                  : modoPresentation
                  ? "Salir del modo presentación"
                  : "Activar modo presentación"
              }
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                modoPresentation
                  ? "bg-amber-400 hover:bg-amber-300 text-slate-900"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {modoPresentation
                ? <><X className="h-3.5 w-3.5" /><span>Salir</span></>
                : <><Monitor className="h-3.5 w-3.5" /><span>Modo Presentación</span></>
              }
            </button>
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
        ) : (
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
                <div className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {datos.meses.length} {datos.meses.length === 1 ? "mes" : "meses"} detectados
                </div>
              </div>
            </div>

            <div className="hidden print:block text-xs text-slate-500 mb-2">
              Archivo: {nombreArchivo}{mesFiltro ? ` · Mes: ${mesFiltro}` : ""}{calleFiltro ? ` · Calle: ${calleFiltro}` : ""}
            </div>

            {perfil && <HallazgosPrincipales perfil={perfil} />}

            {datos.columnas.length > 0 && (
              <div className="presentation-hide bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 print:hidden">
                <button
                  onClick={() => setBannerExpandido((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Info className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Columnas detectadas: {datos.columnas.filter((c) => c.tipo !== "ignorar").length}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {datos.tieneColumnaStatus && (
                        <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> {datos.etiquetaStatus === "Resuelto" ? "Resolución" : "Finalización"}
                        </span>
                      )}
                      {datos.tieneColumnasCalles && (
                        <span className="flex items-center gap-1 text-xs text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 px-2 py-0.5 rounded-full">
                          <MapPin className="h-3 w-3" /> Mapa
                        </span>
                      )}
                      {datos.distribucionesCategoricas.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                          <Tag className="h-3 w-3" /> {datos.distribucionesCategoricas.length} categorías
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 px-2 py-0.5 rounded-full">
                        <BarChart2 className="h-3 w-3" /> {datos.totalSolicitudes.toLocaleString("es-AR")} registros
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                    {bannerExpandido ? "Ocultar ▲" : "Ver detalles ▼"}
                  </span>
                </button>
                {bannerExpandido && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-1.5">
                    {datos.columnas
                      .filter((c) => c.tipo !== "ignorar")
                      .map((col) => (
                        <span
                          key={col.nombre}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${TIPO_COLOR[col.tipo] ?? TIPO_COLOR.texto_libre}`}
                          title={`${etiquetaTipo(col.tipo)} · ${col.cantidadUnicos} valores únicos`}
                        >
                          {col.nombre}
                          <span className="opacity-60 text-[10px]">({etiquetaTipo(col.tipo)})</span>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}

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

            {datos.tieneColumnaStatus ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    titulo: datos.etiquetaStatus === "Resuelto" ? "Resueltas" : "Finalizadas",
                    valor: (datosFiltrados?.totalResueltas ?? 0).toLocaleString("es-AR"),
                    subtitulo: mesFiltro
                      ? `${datos.etiquetaStatus === "Resuelto" ? "resueltas" : "finalizadas"} en ${mesFiltro}`
                      : datos.etiquetaStatus === "Resuelto" ? "con resolución positiva" : "con cierre positivo",
                    color: "green" as const, icono: "check" as const,
                    delta: mesFiltro ? undefined : deltaResueltas,
                    subtituloMes: mesFiltro ? undefined : ultimoMes?.mes,
                  },
                  {
                    titulo: datos.etiquetaStatus === "Resuelto" ? "Sin Resolver" : "Sin Finalizar",
                    valor: (datosFiltrados?.totalNoResueltas ?? 0).toLocaleString("es-AR"),
                    subtitulo: mesFiltro
                      ? `${datos.etiquetaStatus === "Resuelto" ? "sin resolver" : "sin finalizar"} en ${mesFiltro}`
                      : "pendientes o sin dato",
                    color: "red" as const, icono: "x" as const,
                    delta: mesFiltro ? undefined : deltaNoResueltas,
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

            {datos.tieneColumnaProgramacion && (
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

            <InsightsPanel datos={datosFiltrados!} perfil={perfil!} mesFiltro={mesFiltro} />

            <GraficoBarras
              datos={datos.porMes}
              mesFiltro={mesFiltro}
              mostrarResolucion={datos.tieneColumnaStatus}
              mostrarProgramacion={datos.tieneColumnaProgramacion}
              etiquetaStatus={datos.etiquetaStatus}
            />

            {(datosFiltrados?.porMotivo ?? []).length > 0 && (
              <GraficoRankingH
                datos={datosFiltrados!.porMotivo}
                titulo={`Ranking por ${datos.colCategorica1 ?? "Categoría Principal"}`}
                subtitulo="Valores ordenados por volumen — categoría principal de análisis"
                totalGlobal={datosFiltrados!.totalSolicitudes}
                acento="blue"
                limiteInicial={10}
              />
            )}

            {datos.tieneColumnaStatus && (
              <GraficoResolucion
                porMotivo={datosFiltrados?.resolucionPorMotivo ?? []}
                porArea={datosFiltrados?.resolucionPorArea ?? []}
              />
            )}

            {!mesFiltro && datos.meses.length >= 2 && (datosFiltrados?.porMotivo ?? []).length >= 2 && (
              <GraficoCruce
                solicitudes={datosFiltrados!.solicitudes}
                meses={datos.meses}
                porMotivo={datosFiltrados!.porMotivo}
                colNombreFila={datos.colCategorica1 ?? "Categoría"}
              />
            )}

            {(datosFiltrados?.crucesAutomaticos ?? []).map((cruce, idx) => (
              <GraficoCruceHeatmap
                key={`${cruce.tipo}-${idx}`}
                cruce={cruce}
                totalSolicitudes={datosFiltrados!.totalSolicitudes}
              />
            ))}

            {(datosFiltrados?.porDiaSemana ?? []).length >= 7 && (
              <GraficoHeatmap datos={datosFiltrados!.porDiaSemana} />
            )}

            {(datosFiltrados?.porHora ?? []).length > 0 && (
              <GraficoHorario
                datos={datosFiltrados!.porHora}
                totalSolicitudes={datosFiltrados!.totalSolicitudes}
              />
            )}

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
                {datos.tieneColumnaLinea && (datosFiltrados?.porLinea ?? []).length > 0 && (
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

            {datos.tieneColumnaLinea && (datosFiltrados?.porLinea ?? []).length >= 2 && (datosFiltrados?.porMotivo ?? []).length >= 2 && (
              <GraficoCruceLinea
                registros={datosFiltrados!.registros}
                porMotivo={datosFiltrados!.porMotivo}
                porLinea={datosFiltrados!.porLinea ?? []}
                colNombreFila={datos.colCategorica1}
                colNombreLinea={datos.colLinea}
              />
            )}

            {datos.tieneColumnasCalles && (
              <GraficoCalles
                datos={datosFiltrados?.porCalle ?? []}
                totalSolicitudes={datosFiltrados?.totalSolicitudes ?? 0}
              />
            )}

            {datos.tieneColumnasCalles && (datosFiltrados?.porCalle1Ranking ?? []).length >= 2 && (datosFiltrados?.porMotivo ?? []).length >= 2 && (
              <GraficoCruceCalle
                registros={datosFiltrados!.registros}
                porMotivo={datosFiltrados!.porMotivo}
                porCalle1Ranking={datosFiltrados!.porCalle1Ranking ?? []}
                colNombreFila={datos.colCalle1}
                colNombreMotivo={datos.colCategorica1}
              />
            )}

            {datos.tieneColumnasCalles && (
              <div className="print:hidden">
                <GraficoMapa
                  segmentos={datosFiltrados?.porSegmento ?? []}
                  totalSolicitudes={datosFiltrados?.totalSolicitudes ?? 0}
                />
              </div>
            )}

            <LineaDeTiempo
              solicitudes={datosFiltrados!.solicitudes}
              porMes={datos.porMes}
              porDiaSemana={datosFiltrados!.porDiaSemana}
              meses={datos.meses}
              totalSolicitudes={datosFiltrados!.totalSolicitudes}
            />

            {((datosFiltrados?.porTiempoRespuestaArea ?? []).length >= 2 || (datosFiltrados?.tiempoRespuestaPorMotivo ?? []).length >= 2) && (
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

            {datos.tieneHoraDerivacion && (
              <PanelTiempoRespuestaInterno
                promedioGeneral={datosFiltrados?.tiempoRespuestaInternoPromedio ?? 0}
                porMotivo={datosFiltrados?.tiempoRespuestaInternoPorMotivo ?? []}
                porArea={datosFiltrados?.tiempoRespuestaInternoPorArea ?? []}
                distribucion={datosFiltrados?.distribucionTiempoRespuestaInterno ?? []}
                etiquetaMotivo={datos.colCategorica1 ?? "Categoría"}
              />
            )}

            {(datosFiltrados?.registros ?? []).length > 0 && datos.columnas.length > 0 && (
              <TablaDetalle
                registros={datosFiltrados!.registros}
                columnas={datos.columnas}
                meses={datos.meses}
              />
            )}


            <CalidadDataset
              calidadDataset={datos.calidadDataset}
              tieneColumnaProgramacion={datos.tieneColumnaProgramacion}
              etiquetaStatus={datos.etiquetaStatus}
            />

            {/* ─── PRESENTE ─────────────────────────────────────────────── */}
            <SeparadorCapa etiqueta="Presente" pregunta="¿Dónde estamos parados y qué es urgente?" acento="amber" />

            {semaforo && <SemaforoOperacional resultado={semaforo} />}

            {!mesFiltro && <IndiceFragilidad indiceFragilidad={datosFiltrados?.indiceFragilidad ?? []} />}

            <PanelFalsosPositivos
              totalFalsosPositivos={datosFiltrados?.totalFalsosPositivos ?? 0}
              tasaFalsosPositivos={datosFiltrados?.tasaFalsosPositivos ?? 0}
              totalSolicitudes={datosFiltrados?.totalSolicitudes ?? 0}
              tiposFalsosPositivos={datosFiltrados?.tiposFalsosPositivos ?? []}
            />

            {!mesFiltro && <PanelEventosCronicos crucesCronicos={datosFiltrados?.crucesCronicos ?? []} />}

            {/* ─── FUTURO ───────────────────────────────────────────────── */}
            <SeparadorCapa etiqueta="Futuro" pregunta="¿Qué conviene hacer ahora?" acento="teal" />

            {recomendaciones.length > 0 && (
              <RecomendacionesOperativas recomendaciones={recomendaciones} />
            )}

            {datos.tipoDato === "solicitudes" && datos.porMes.length >= 2 && (
              <VentanaPredictiva datos={datos} />
            )}
          </div>
        )}
      </main>

      {modoPresentation && datosFiltrados && (
        <PresentacionDiapositivas
          datos={datosFiltrados}
          perfil={perfil!}
          nombreArchivo={nombreArchivo}
          onCerrar={() => setModoPresentation(false)}
        />
      )}

      {modoComparacion && comparacionResultado && (
        <ComparacionPeriodos
          resultado={comparacionResultado}
          onCerrar={() => setModoComparacion(false)}
        />
      )}

      {modalComparacion && datos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setModalComparacion(false); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
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
            <div className="flex border-b border-slate-200 dark:border-slate-700">
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
                              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
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
                    className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                  onClick={ejecutarComparacionMeses}
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
