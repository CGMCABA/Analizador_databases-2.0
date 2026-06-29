import { useState, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  AlertCircle,
  Database,
  Sparkles,
  BarChart3,
  TrendingUp,
  Shield,
  RefreshCw,
  AlertTriangle,
  Clock,
  MapPin,
  Link2,
  Trash2,
  ExternalLink,
  Star,
  Loader2,
} from "lucide-react";
import { DriveFilePicker } from "@/components/DriveFilePicker";
import { esUrlGoogleSheetValida } from "@/lib/googleSheetsUrl";

interface PaginaInicioProps {
  onUrl: (url: string, nombre: string) => void;
  onBuffer: (buffer: ArrayBuffer, nombre: string) => void;
  onError: (msg: string) => void;
  cargando: boolean;
  error: string;
}

interface UrlGuardada {
  id: string;
  nombre: string;
  url: string;
  creadoEn: number;
}

const STORAGE_KEY = "reportes_urls_guardadas";

function cargarUrlsGuardadas(): UrlGuardada[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function guardarUrls(urls: UrlGuardada[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
}

const PILARES = [
  {
    icon: Database,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    titulo: "Normalización del dato",
    desc: "Unificación automática de formatos y períodos. Base sólida para análisis comparativo a lo largo del tiempo.",
  },
  {
    icon: Sparkles,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    titulo: "Enriquecimiento analítico",
    desc: "Indicadores derivados sin modificar la data original: franjas horarias, criticidad y patrones de repetición.",
  },
  {
    icon: BarChart3,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
    titulo: "Dashboards ejecutivos",
    desc: "Vistas orientadas a la decisión: zonas críticas, eficiencia operativa y calidad del reporte.",
  },
  {
    icon: TrendingUp,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    titulo: "Capacidad predictiva",
    desc: "A partir del histórico, anticipa colapsos, horarios críticos y necesidad de refuerzos operativos.",
  },
] as const;

const INDICADORES = [
  {
    icon: Shield,
    label: "Índice de Fragilidad Urbana",
    color: "text-red-400 bg-red-500/10 border-red-500/25 dark:bg-red-500/10",
  },
  {
    icon: RefreshCw,
    label: "Tasa de Repetición de Eventos",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/25 dark:bg-amber-500/10",
  },
  {
    icon: AlertTriangle,
    label: "Ratio de Falsos Positivos",
    color: "text-orange-400 bg-orange-500/10 border-orange-500/25 dark:bg-orange-500/10",
  },
  {
    icon: Clock,
    label: "Saturación Operativa Horaria",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/25 dark:bg-violet-500/10",
  },
  {
    icon: MapPin,
    label: "Eventos Crónicos por Zona",
    color: "text-teal-400 bg-teal-500/10 border-teal-500/25 dark:bg-teal-500/10",
  },
] as const;

const EXTENSIONES_VALIDAS = /\.(xlsx|xls)$/i;

export function PaginaInicio({ onUrl, onBuffer, onError, cargando, error }: PaginaInicioProps) {
  const [urlInput, setUrlInput] = useState("");
  const [nombreInput, setNombreInput] = useState("");
  const [guardadas, setGuardadas] = useState<UrlGuardada[]>(cargarUrlsGuardadas);
  const [arrastrando, setArrastrando] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement | null>(null);

  const procesarArchivoLocal = (file: File) => {
    if (!EXTENSIONES_VALIDAS.test(file.name)) {
      onError("Formato no soportado. Subí un archivo .xlsx o .xls.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        onBuffer(reader.result, file.name);
      }
    };
    reader.onerror = () => onError("No se pudo leer el archivo local.");
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivoLocal(file);
  };

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivoLocal(file);
    e.target.value = "";
  };

  useEffect(() => {
    guardarUrls(guardadas);
  }, [guardadas]);

  const validarUrl = (url: string) => esUrlGoogleSheetValida(url);

  const cargarDesdeUrl = (url: string, nombre: string) => {
    if (!validarUrl(url)) {
      onError("URL no válida. Pegá la URL completa de un Google Sheet.");
      return;
    }
    onUrl(url, nombre);
  };

  const handleCargar = () => {
    if (!urlInput.trim()) return;
    const nombre = nombreInput.trim() || `Archivo ${guardadas.length + 1}`;
    // Guardar automáticamente si es nueva
    const yaExiste = guardadas.some((g) => g.url === urlInput.trim());
    if (!yaExiste) {
      setGuardadas((prev) => [
        ...prev,
        { id: crypto.randomUUID(), nombre, url: urlInput.trim(), creadoEn: Date.now() },
      ]);
    }
    cargarDesdeUrl(urlInput.trim(), nombre);
  };

  const eliminarGuardada = (id: string) => {
    setGuardadas((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div className="-mx-6 -mt-8 overflow-x-hidden">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div
        className="relative px-8 py-20 text-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0b1828 0%, #1a2b4a 55%, #1e3d72 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-400/15 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-7">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Análisis de Datos Operativos
          </div>

          <h1 className="text-4xl md:text-[3.25rem] font-black text-white leading-[1.1] mb-5">
            Transformación de Datos Operativos
            <span className="block text-blue-300 mt-1">en Inteligencia Urbana</span>
          </h1>

          <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Tu Excel operativo dejó de ser un archivo histórico. Hoy es una herramienta
            estratégica capaz de explicar patrones, detectar problemas estructurales
            y anticipar escenarios críticos — sin aumentar costos ni complejidad operativa.
          </p>
        </div>
      </div>

      {/* ── 4 Pilares ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0c1525] border-b border-slate-200 dark:border-slate-800 px-6 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {PILARES.map(({ icon: Icon, color, bg, titulo, desc }) => (
            <div
              key={titulo}
              className="flex flex-col gap-3 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50"
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5 leading-snug">
                  {titulo}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Indicadores estratégicos ───────────────────────────── */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 px-6 py-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.18em] mb-4">
            Indicadores estratégicos detectados automáticamente
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {INDICADORES.map(({ icon: Icon, label, color }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${color}`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Carga de datos ────────────────────────────────────── */}
      <div className="px-6 py-14 bg-white dark:bg-[#0c1525]">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
              Cargá tus datos operativos
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Subí un archivo local, pegá la URL de un Google Sheet, o elegí un archivo desde Drive.
            </p>
          </div>

          {/* ── Subida de archivo local (drag & drop) ──── */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={handleDrop}
            onClick={() => !cargando && inputArchivoRef.current?.click()}
            className={`w-full rounded-2xl border-2 border-dashed p-7 flex flex-col items-center gap-2 text-center transition-colors cursor-pointer ${
              arrastrando
                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                : "border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500"
            } ${cargando ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input
              ref={inputArchivoRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleSeleccionarArchivo}
              disabled={cargando}
              className="hidden"
            />
            <FileSpreadsheet className="h-7 w-7 text-blue-500 dark:text-blue-400" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Arrastrá tu archivo Excel acá
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              o hacé clic para elegirlo desde tu computadora (.xlsx, .xls)
            </p>
          </div>

          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">o</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">

            {/* ── Columna izquierda: URL input + guardadas ──── */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-500 dark:text-blue-400 shrink-0" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Desde URL de Google Sheet
                </span>
              </div>

              {/* Input de nombre */}
              <input
                type="text"
                value={nombreInput}
                onChange={(e) => setNombreInput(e.target.value)}
                placeholder="Nombre (ej: Sucesos Enero 2026)"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />

              {/* Input de URL */}
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                onKeyDown={(e) => e.key === "Enter" && handleCargar()}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />

              <button
                onClick={handleCargar}
                disabled={cargando || !urlInput.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {cargando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4" />
                    Cargar y analizar
                  </>
                )}
              </button>

              {/* ── URLs guardadas ──── */}
              {guardadas.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-1">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2">
                    Archivos recientes
                  </p>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                    {guardadas
                      .sort((a, b) => b.creadoEn - a.creadoEn)
                      .map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center gap-2 group rounded-lg px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <button
                            onClick={() => cargarDesdeUrl(g.url, g.nombre)}
                            disabled={cargando}
                            className="flex-1 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate disabled:opacity-50"
                            title={g.url}
                          >
                            {g.nombre}
                          </button>
                          <a
                            href={g.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Abrir Sheet"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400 hover:text-blue-500" />
                          </a>
                          <button
                            onClick={() => eliminarGuardada(g.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Separador central */}
            <div className="flex md:flex-col items-center justify-center gap-2 py-2 md:py-6">
              <div className="flex-1 md:flex-none h-px md:h-16 md:w-px w-16 bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">o</span>
              <div className="flex-1 md:flex-none h-px md:h-16 md:w-px w-16 bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* ── Columna derecha: Google Drive ──── */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 87.3 78" className="h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Desde Google Drive
                </span>
              </div>
              <DriveFilePicker
                onBuffer={onBuffer}
                onError={onError}
                cargando={cargando}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-5 py-4 w-full">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Frase de cierre ───────────────────────────────────── */}
      <div className="px-6 py-8 text-center border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
        <blockquote className="max-w-xl mx-auto">
          <p className="text-slate-500 dark:text-slate-400 text-sm italic leading-relaxed">
            "Los datos ya existían. Lo que faltaba era estructura,
            criterio analítico y mirada estratégica."
          </p>
        </blockquote>
      </div>
    </div>
  );
}
