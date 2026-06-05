import { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderOpen,
  FileSpreadsheet,
  ChevronRight,
  Home,
  RefreshCw,
  LogOut,
  Loader2,
  AlertCircle,
  CloudOff,
  ExternalLink,
} from "lucide-react";
import {
  iniciarAuthGoogle,
  estaAutenticado,
  desconectarGoogle,
  obtenerTokenGoogle,
  msHastaExpiracion,
} from "@/lib/googleAuth";
import {
  listarArchivos,
  descargarArchivo,
  formatearTamaño,
  formatearFechaModif,
  type DriveFile,
} from "@/lib/googleDriveApi";

interface Breadcrumb {
  id: string;
  name: string;
}

interface DriveFilePickerProps {
  onBuffer: (buffer: ArrayBuffer, nombre: string) => void;
  onError: (msg: string) => void;
  cargando: boolean;
}

const TIENE_CLIENT_ID = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

function SetupInstructions() {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 text-sm space-y-3">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
        <CloudOff className="h-4 w-4 shrink-0" />
        Google Drive requiere configuración inicial
      </div>
      <p className="text-amber-600 dark:text-amber-500 leading-relaxed">
        Para habilitar la integración con Drive, necesitás crear un proyecto en Google Cloud y obtener un Client ID. Son 3 pasos simples:
      </p>
      <ol className="list-decimal list-inside space-y-1.5 text-amber-700 dark:text-amber-400">
        <li>
          Ir a{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-1 hover:text-amber-900 dark:hover:text-amber-300"
          >
            Google Cloud Console → Credentials
            <ExternalLink className="h-3 w-3" />
          </a>
        </li>
        <li>Crear credencial → OAuth 2.0 Client ID → tipo <strong>Aplicación web</strong></li>
        <li>
          Agregar el dominio de esta app en <strong>Orígenes JavaScript autorizados</strong>
        </li>
      </ol>
      <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg px-4 py-2.5 font-mono text-xs text-amber-800 dark:text-amber-300">
        Luego, configurar el secreto <strong>VITE_GOOGLE_CLIENT_ID</strong> con el Client ID obtenido.
      </div>
      <p className="text-amber-500 dark:text-amber-600 text-xs">
        La integración solo solicita permiso de <strong>lectura</strong> sobre tus archivos. Nunca modifica ni elimina nada.
      </p>
    </div>
  );
}

export function DriveFilePicker({ onBuffer, onError, cargando }: DriveFilePickerProps) {
  const [autenticado, setAutenticado] = useState(false);
  const [cargandoAuth, setCargandoAuth] = useState(false);
  const [cargandoArchivos, setCargandoArchivos] = useState(false);
  const [cargandoDescarga, setCargandoDescarga] = useState<string | null>(null);
  const [archivos, setArchivos] = useState<DriveFile[]>([]);
  const [carpetas, setCarpetas] = useState<DriveFile[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: "root", name: "Mi Drive" }]);
  const [errorLocal, setErrorLocal] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const expiracionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carpetaActual = breadcrumbs[breadcrumbs.length - 1];

  const forzarDesconexion = useCallback((motivo?: string) => {
    desconectarGoogle();
    setAutenticado(false);
    setArchivos([]);
    setCarpetas([]);
    setBreadcrumbs([{ id: "root", name: "Mi Drive" }]);
    if (motivo) setErrorLocal(motivo);
    if (expiracionTimerRef.current) clearTimeout(expiracionTimerRef.current);
  }, []);

  const programarExpiracion = useCallback(() => {
    if (expiracionTimerRef.current) clearTimeout(expiracionTimerRef.current);
    const ms = msHastaExpiracion();
    if (ms <= 0) return;
    expiracionTimerRef.current = setTimeout(() => {
      forzarDesconexion("La sesión de Google expiró. Conectate nuevamente para continuar.");
    }, ms);
  }, [forzarDesconexion]);

  const esErrorDeAuth = (e: unknown): boolean => {
    const msg = e instanceof Error ? e.message.toLowerCase() : "";
    return msg.includes("401") || msg.includes("invalid") || msg.includes("unauthorized") || msg.includes("unauthenticated");
  };

  const cargarContenido = useCallback(async (folderId: string) => {
    const token = obtenerTokenGoogle();
    if (!token) {
      forzarDesconexion("La sesión de Google expiró. Conectate nuevamente para continuar.");
      return;
    }
    setCargandoArchivos(true);
    setErrorLocal("");
    setBusqueda("");
    try {
      const { archivos: a, carpetas: c } = await listarArchivos(token, folderId);
      setArchivos(a);
      setCarpetas(c);
    } catch (e) {
      if (esErrorDeAuth(e)) {
        forzarDesconexion("La sesión de Google expiró. Conectate nuevamente para continuar.");
      } else {
        const msg = e instanceof Error ? e.message : "Error al listar archivos de Drive";
        setErrorLocal(msg);
      }
    } finally {
      setCargandoArchivos(false);
    }
  }, [forzarDesconexion]);

  useEffect(() => {
    if (estaAutenticado()) {
      setAutenticado(true);
      programarExpiracion();
      cargarContenido("root");
    }
    return () => {
      if (expiracionTimerRef.current) clearTimeout(expiracionTimerRef.current);
    };
  }, [cargarContenido, programarExpiracion]);

  const handleConectar = async () => {
    setCargandoAuth(true);
    setErrorLocal("");
    try {
      await iniciarAuthGoogle();
      setAutenticado(true);
      programarExpiracion();
      await cargarContenido("root");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo conectar con Google";
      setErrorLocal(msg);
    } finally {
      setCargandoAuth(false);
    }
  };

  const handleDesconectar = () => {
    forzarDesconexion();
    setErrorLocal("");
  };

  const handleCarpeta = async (carpeta: DriveFile) => {
    setBreadcrumbs((prev) => [...prev, { id: carpeta.id, name: carpeta.name }]);
    await cargarContenido(carpeta.id);
  };

  const handleBreadcrumb = async (index: number) => {
    const destino = breadcrumbs[index];
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    await cargarContenido(destino.id);
  };

  const handleSeleccionarArchivo = async (archivo: DriveFile) => {
    const token = obtenerTokenGoogle();
    if (!token) {
      forzarDesconexion("La sesión de Google expiró. Conectate nuevamente para continuar.");
      return;
    }
    setCargandoDescarga(archivo.id);
    setErrorLocal("");
    try {
      const buffer = await descargarArchivo(token, archivo.id);
      onBuffer(buffer, archivo.name);
    } catch (e) {
      if (esErrorDeAuth(e)) {
        forzarDesconexion("La sesión de Google expiró. Conectate nuevamente para continuar.");
      } else {
        const msg = e instanceof Error ? e.message : "Error al descargar el archivo";
        onError(msg);
      }
    } finally {
      setCargandoDescarga(null);
    }
  };

  if (!TIENE_CLIENT_ID) {
    return <SetupInstructions />;
  }

  if (!autenticado) {
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        {errorLocal && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-amber-700 dark:text-amber-400 text-sm w-full">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {errorLocal}
          </div>
        )}
        <button
          onClick={handleConectar}
          disabled={cargandoAuth || cargando}
          className="flex items-center gap-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-5 py-3 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {cargandoAuth ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {cargandoAuth
            ? "Conectando..."
            : errorLocal
            ? "Reconectar con Google Drive"
            : "Conectar con Google Drive"}
        </button>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">
          Solo se solicitará acceso de lectura. La app no puede modificar ni eliminar tus archivos.
        </p>
      </div>
    );
  }

  const estaDescargando = cargando || cargandoDescarga !== null;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1 text-sm flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  {i === 0 && <Home className="h-3.5 w-3.5" />}
                  {crumb.name}
                </span>
              ) : (
                <button
                  onClick={() => handleBreadcrumb(i)}
                  className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  {i === 0 && <Home className="h-3.5 w-3.5" />}
                  {crumb.name}
                </button>
              )}
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => cargarContenido(carpetaActual.id)}
            disabled={cargandoArchivos}
            title="Actualizar"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cargandoArchivos ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleDesconectar}
            title="Desconectar Google Drive"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {errorLocal && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 text-red-700 dark:text-red-400 text-xs">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {errorLocal}
        </div>
      )}

      {!cargandoArchivos && carpetas.length + archivos.length > 8 && (
        <div className="relative">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 pl-8 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          />
          <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
      )}

      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800/50">
        {cargandoArchivos ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Cargando archivos...</span>
          </div>
        ) : carpetas.length === 0 && archivos.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
            Esta carpeta no tiene archivos Excel ni subcarpetas.
          </div>
        ) : (() => {
          const q = busqueda.toLowerCase();
          const carpetasFiltradas = q ? carpetas.filter(f => f.name.toLowerCase().includes(q)) : carpetas;
          const archivosFiltrados = q ? archivos.filter(f => f.name.toLowerCase().includes(q)) : archivos;
          const sinResultados = carpetasFiltradas.length === 0 && archivosFiltrados.length === 0;
          return (
            <div className="max-h-64 overflow-y-auto">
              {sinResultados ? (
                <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  No se encontraron resultados para "{busqueda}".
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {carpetasFiltradas.map((carpeta) => (
                    <li key={carpeta.id}>
                      <button
                        onClick={() => handleCarpeta(carpeta)}
                        disabled={estaDescargando}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1 truncate">
                          {carpeta.name}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      </button>
                    </li>
                  ))}
                  {archivosFiltrados.map((archivo) => {
                    const descargando = cargandoDescarga === archivo.id;
                    return (
                      <li key={archivo.id}>
                        <button
                          onClick={() => handleSeleccionarArchivo(archivo)}
                          disabled={estaDescargando}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed group"
                        >
                          {descargando ? (
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-500 shrink-0" />
                          )}
                          <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                            {archivo.name}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            {archivo.modifiedTime && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                                {formatearFechaModif(archivo.modifiedTime)}
                              </span>
                            )}
                            {archivo.size && (
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                {formatearTamaño(archivo.size)}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
