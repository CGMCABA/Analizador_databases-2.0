import { useState, useRef } from "react";
import {
  FileSpreadsheet,
  AlertCircle,
  Link2,
  Trash2,
  ExternalLink,
  Loader2,
  UploadCloud,
} from "lucide-react";
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

function tiempoRelativo(ts: number): string {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60_000);
  const hs   = Math.floor(diff / 3_600_000);
  const dias = Math.floor(diff / 86_400_000);
  if (min < 2)    return "hace un momento";
  if (min < 60)   return `hace ${min}m`;
  if (hs  < 24)   return `hace ${hs}h`;
  if (dias < 7)   return dias === 1 ? "ayer" : `hace ${dias} días`;
  return new Date(ts).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

const EXTENSIONES_VALIDAS = /\.(xlsx|xls)$/i;

const MODULOS = [
  "Motor analítico",
  "Semáforo operacional",
  "Análisis geográfico",
  "Comparación de períodos",
  "Ventana predictiva",
  "Modo ejecutivo",
] as const;

export function PaginaInicio({ onUrl, onBuffer, onError, cargando, error }: PaginaInicioProps) {
  const [urlInput,    setUrlInput]    = useState("");
  const [nombreInput, setNombreInput] = useState("");
  const [guardadas,   setGuardadas]   = useState<UrlGuardada[]>(cargarUrlsGuardadas);
  const [arrastrando, setArrastrando] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement | null>(null);

  const procesarArchivoLocal = (file: File) => {
    if (!EXTENSIONES_VALIDAS.test(file.name)) {
      onError("Formato no soportado. Subí un archivo .xlsx o .xls.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) onBuffer(reader.result, file.name);
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

  const cargarDesdeUrl = (url: string, nombre: string) => {
    if (!esUrlGoogleSheetValida(url)) {
      onError("URL no válida. Pegá la URL completa de un Google Sheet.");
      return;
    }
    onUrl(url, nombre);
  };

  const handleCargar = () => {
    if (!urlInput.trim()) return;
    const nombre = nombreInput.trim() || `Archivo ${guardadas.length + 1}`;
    const yaExiste = guardadas.some((g) => g.url === urlInput.trim());
    if (!yaExiste) {
      const nuevas = [
        ...guardadas,
        { id: crypto.randomUUID(), nombre, url: urlInput.trim(), creadoEn: Date.now() },
      ];
      setGuardadas(nuevas);
      guardarUrls(nuevas);
    }
    cargarDesdeUrl(urlInput.trim(), nombre);
  };

  const eliminarGuardada = (id: string) => {
    const nuevas = guardadas.filter((g) => g.id !== id);
    setGuardadas(nuevas);
    guardarUrls(nuevas);
  };

  const guardadasOrdenadas = [...guardadas].sort((a, b) => b.creadoEn - a.creadoEn);

  return (
    <>
      <style>{`
        @keyframes cgm-scan {
          0%   { transform: translateY(0);     opacity: 0; }
          4%   { opacity: 0.55; }
          96%  { opacity: 0.55; }
          100% { transform: translateY(100%);  opacity: 0; }
        }
        @keyframes cgm-breath {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
        @keyframes cgm-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .cgm-scan-line {
          position: absolute;
          left: 0; right: 0; top: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(200,168,75,.22) 25%,
            rgba(200,168,75,.35) 50%,
            rgba(200,168,75,.22) 75%,
            transparent 100%
          );
          animation: cgm-scan 16s linear infinite;
          pointer-events: none;
          z-index: 10;
        }
        .cgm-dot-breath {
          animation: cgm-breath 3s ease-in-out infinite;
        }
        .cgm-dot-breath:nth-child(2)  { animation-delay: .5s; }
        .cgm-dot-breath:nth-child(3)  { animation-delay: 1s; }
        .cgm-dot-breath:nth-child(4)  { animation-delay: 1.5s; }
        .cgm-dot-breath:nth-child(5)  { animation-delay: 2s; }
        .cgm-dot-breath:nth-child(6)  { animation-delay: 2.5s; }
        .cgm-main-enter {
          animation: cgm-fade-up .35s ease both;
        }
        .cgm-sidebar-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right,  rgba(31,37,53,.28) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(31,37,53,.28) 1px, transparent 1px);
          background-size: 44px 44px;
          pointer-events: none;
        }
        .cgm-upload-zone:hover .cgm-upload-icon-box {
          border-color: rgba(200,168,75,.4);
        }
        .cgm-recent-item:hover .cgm-recent-name { color: #94a3b8; }
        .cgm-recent-item:hover .cgm-recent-action { color: #475569; }
      `}</style>

      {/* Root: full-bleed, flex, dark */}
      <div
        className="-mx-6 -mt-8 -mb-8 flex overflow-hidden relative bg-[#0a0c10]"
        style={{ minHeight: "calc(100vh - 5rem)" }}
      >
        <div className="cgm-scan-line" aria-hidden="true" />

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          className="relative flex-shrink-0 flex flex-col bg-[#0d0f14] border-r border-[#1f2535] overflow-hidden"
          style={{ width: "238px" }}
          aria-label="Información del sistema CGM"
        >
          <div className="cgm-sidebar-grid" aria-hidden="true" />

          <div className="relative flex flex-col flex-1 p-6">
            {/* Status */}
            <div className="flex items-center gap-2 mb-7">
              <span
                className="cgm-dot-breath inline-block w-[7px] h-[7px] rounded-full bg-emerald-400 flex-shrink-0"
                aria-hidden="true"
              />
              <span
                className="font-mono text-[10px] tracking-[.2em] text-emerald-400 uppercase"
              >
                Sistema activo
              </span>
            </div>

            {/* CGM Wordmark */}
            <div className="mb-7">
              <div
                className="text-[#c8a84b] font-black leading-none tracking-tight"
                style={{ fontSize: "40px" }}
              >
                CGM
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5">
                Centro de Gestión<br />
                y Monitoreo de la<br />
                Movilidad
              </p>
              <p className="font-mono text-[10px] text-[#334155] mt-1 tracking-[.04em]">
                Módulo Analítico · v2.0
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#1a1f2e] mb-5" />

            {/* Modules */}
            <div className="flex-1">
              <p className="font-mono text-[9px] tracking-[.22em] text-[#334155] uppercase mb-3">
                Módulos disponibles
              </p>
              <ul className="space-y-2.5">
                {MODULOS.map((mod, i) => (
                  <li key={mod} className="flex items-center gap-2.5">
                    <span
                      className="cgm-dot-breath inline-block w-[5px] h-[5px] rounded-full bg-emerald-500 flex-shrink-0 opacity-70"
                      style={{ animationDelay: `${i * 0.55}s` }}
                      aria-hidden="true"
                    />
                    <span className="text-[11px] text-slate-500">{mod}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Institutional footer */}
            <div className="mt-6 pt-5 border-t border-[#1a1f2e]">
              <p
                className="font-mono text-[9px] text-[#2e3852] leading-[1.9] tracking-[.03em]"
              >
                GCABA · Secretaría de Transporte<br />
                Subsecretaría de Tránsito y Transporte
              </p>
            </div>
          </div>
        </aside>

        {/* ── Main area ───────────────────────────────────────────────────── */}
        <main className="cgm-main-enter flex-1 flex flex-col py-9 px-10 overflow-y-auto min-w-0">

          {/* Section path */}
          <p className="font-mono text-[10px] tracking-[.24em] text-[#475569] uppercase mb-1.5">
            / cargar dataset
          </p>
          <h1 className="text-[19px] font-bold text-slate-200 tracking-tight mb-1">
            Seleccioná el archivo a analizar
          </h1>
          <p className="font-mono text-[11px] text-[#475569] tracking-[.03em] mb-7">
            Excel operativo · .xlsx · .xls
          </p>

          {/* ── Upload zone ─────────────────────────────────────────────── */}
          <div
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={handleDrop}
            onClick={() => !cargando && inputArchivoRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputArchivoRef.current?.click(); }}
            aria-label="Zona de carga de archivo Excel. Arrastrá un archivo o presioná Enter para elegirlo."
            className={[
              "cgm-upload-zone group",
              "rounded-xl border-[1.5px] border-dashed",
              "flex flex-col items-center text-center",
              "cursor-pointer transition-all duration-200 mb-5",
              "py-10 px-8",
              cargando
                ? "opacity-50 cursor-not-allowed pointer-events-none bg-[#0d0f14] border-[#1f2535]"
                : arrastrando
                ? "border-[rgba(200,168,75,.55)] bg-[rgba(200,168,75,.04)]"
                : "bg-[#0d0f14] border-[#2e3852] hover:border-[rgba(200,168,75,.35)] hover:bg-[rgba(200,168,75,.02)]",
            ].join(" ")}
          >
            <input
              ref={inputArchivoRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleSeleccionarArchivo}
              disabled={cargando}
              className="hidden"
              aria-hidden="true"
            />

            <div
              className="cgm-upload-icon-box w-11 h-11 flex items-center justify-center rounded-lg border border-[#2e3852] bg-[#131720] mb-4 transition-colors duration-200"
              aria-hidden="true"
            >
              {cargando
                ? <Loader2 className="h-5 w-5 text-[#475569] animate-spin" />
                : <FileSpreadsheet className="h-5 w-5 text-[#475569]" />
              }
            </div>

            <p className="text-[14px] font-semibold text-slate-300 mb-1.5">
              {cargando ? "Procesando…" : "Arrastrá tu Excel acá"}
            </p>
            <p className="font-mono text-[11px] text-[#475569] tracking-[.04em] mb-5">
              {cargando ? "Esto puede tardar unos segundos" : ".xlsx · .xls"}
            </p>

            {!cargando && (
              <div
                className="flex items-center gap-2 text-[12px] font-semibold text-slate-400 bg-[#1a1f2e] hover:bg-[#252d3d] border border-[#2e3852] hover:border-[#475569] hover:text-slate-200 px-4 py-2 rounded-lg transition-all duration-150"
                aria-hidden="true"
              >
                <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
                Elegir archivo
              </div>
            )}
          </div>

          {/* ── URL separator ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#1a1f2e]" />
            <span className="font-mono text-[9px] tracking-[.22em] text-[#334155] uppercase whitespace-nowrap">
              Desde URL · Google Sheets
            </span>
            <div className="flex-1 h-px bg-[#1a1f2e]" />
          </div>

          {/* ── URL section ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2.5 mb-6">
            <input
              type="text"
              value={nombreInput}
              onChange={(e) => setNombreInput(e.target.value)}
              placeholder="Nombre del dataset (ej: Sucesos Enero 2026)"
              className="w-full bg-[#0d0f14] border border-[#1f2535] rounded-lg px-3 py-2 text-[13px] text-slate-300 placeholder:text-[#334155] focus:outline-none focus:border-[rgba(200,168,75,.45)] focus:ring-0 transition-colors"
            />
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link2
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#334155] pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCargar()}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  className="w-full bg-[#0d0f14] border border-[#1f2535] rounded-lg pl-8 pr-3 py-2 font-mono text-[11px] text-slate-400 placeholder:text-[#334155] focus:outline-none focus:border-[rgba(200,168,75,.45)] transition-colors tracking-[.01em]"
                />
              </div>
              <button
                onClick={handleCargar}
                disabled={cargando || !urlInput.trim()}
                className="flex-shrink-0 text-[12px] font-semibold px-4 py-2 rounded-lg border transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(200,168,75,.13)",
                  borderColor: "rgba(200,168,75,.32)",
                  color: "#c8a84b",
                }}
              >
                {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar"}
              </button>
            </div>
          </div>

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-900/50 text-red-400 rounded-xl px-4 py-3 mb-5 text-[12px]">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          {/* ── Recent sessions ───────────────────────────────────────────── */}
          {guardadasOrdenadas.length > 0 && (
            <div>
              <p className="font-mono text-[9px] tracking-[.22em] text-[#334155] uppercase mb-3">
                Sesiones recientes
              </p>
              <ul className="divide-y divide-[#1a1f2e]">
                {guardadasOrdenadas.map((g) => (
                  <li
                    key={g.id}
                    className="cgm-recent-item group flex items-center gap-3 py-2.5 transition-colors cursor-pointer"
                    onClick={() => !cargando && cargarDesdeUrl(g.url, g.nombre)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && !cargando)
                        cargarDesdeUrl(g.url, g.nombre);
                    }}
                    aria-label={`Cargar sesión: ${g.nombre}`}
                  >
                    <Link2
                      className="cgm-recent-name h-3.5 w-3.5 flex-shrink-0 text-[#2e3852] transition-colors"
                      aria-hidden="true"
                    />
                    <span
                      className="cgm-recent-name flex-1 min-w-0 font-mono text-[12px] text-[#475569] truncate transition-colors tracking-[.01em]"
                    >
                      {g.nombre}
                    </span>
                    <span
                      className="cgm-recent-action font-mono text-[10px] text-[#2e3852] flex-shrink-0 transition-colors"
                    >
                      {tiempoRelativo(g.creadoEn)}
                    </span>
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Abrir en Google Sheets"
                      aria-label={`Abrir ${g.nombre} en Google Sheets`}
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-[#334155] hover:text-[#475569]" aria-hidden="true" />
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); eliminarGuardada(g.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title={`Eliminar ${g.nombre} del historial`}
                      aria-label={`Eliminar ${g.nombre} del historial`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[#334155] hover:text-red-500 transition-colors" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
