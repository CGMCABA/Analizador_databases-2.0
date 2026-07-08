import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Loader2, AlertTriangle, Info } from "lucide-react";

interface Interseccion {
  nombre: string;
  cantidad: number;
}

interface PuntoGeo {
  nombre: string;
  cantidad: number;
  coord: [number, number] | null;
  criticidad: "alta" | "media" | "baja";
}

interface GraficoMapaProps {
  intersecciones: Interseccion[];
  totalSolicitudes: number;
}

const CENTRO_BA: [number, number] = [-34.6037, -58.3816];
const DELAY_MS = 250;

const CABA_BOUNDS = {
  latMin: -34.705,
  latMax: -34.527,
  lonMin: -58.532,
  lonMax: -58.334,
};

// Criticidad por color y radio — tertiles sobre el conjunto visible.
// Tertiles garantizan que siempre haya una distribución de colores significativa,
// independientemente de la dispersión del dataset (outliers no aplanan todo a "baja").
const CRITICA_ESTILO: Record<"alta" | "media" | "baja", { color: string; radio: number; label: string }> = {
  alta:  { color: "#dc2626", radio: 11, label: "Alta criticidad"  },
  media: { color: "#f97316", radio:  8, label: "Criticidad media" },
  baja:  { color: "#f59e0b", radio:  5, label: "Baja criticidad"  },
};

function asignarCriticidad(lista: Interseccion[]): ("alta" | "media" | "baja")[] {
  const n = lista.length;
  if (n === 0) return [];
  const corte1 = Math.ceil(n / 3);
  const corte2 = Math.ceil((n * 2) / 3);
  return lista.map((_, i) => {
    if (i < corte1) return "alta";
    if (i < corte2) return "media";
    return "baja";
  });
}

function dentroDeCaba(lat: number, lon: number): boolean {
  return (
    lat >= CABA_BOUNDS.latMin &&
    lat <= CABA_BOUNDS.latMax &&
    lon >= CABA_BOUNDS.lonMin &&
    lon <= CABA_BOUNDS.lonMax
  );
}

async function geocodificarInterseccion(nombre: string): Promise<[number, number] | null> {
  const q = encodeURIComponent(`${nombre.trim()}, caba`);
  const url = `https://servicios.usig.buenosaires.gob.ar/normalizar/?direccion=${q}&geocodificar=true&maxOptions=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const dirs: { coordenadas?: { x: number | string; y: number | string } }[] =
    json.direccionesNormalizadas ?? [];
  if (dirs.length === 0) return null;
  const coord = dirs[0].coordenadas;
  if (!coord) return null;
  const lat = parseFloat(String(coord.y));
  const lon = parseFloat(String(coord.x));
  if (isNaN(lat) || isNaN(lon)) return null;
  if (!dentroDeCaba(lat, lon)) return null;
  return [lat, lon];
}

function AjustarVista({ puntos, geocKey }: { puntos: [number, number][]; geocKey: number }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 0) return;
    map.fitBounds(puntos as LatLngBoundsExpression, { padding: [40, 40], maxZoom: 15 });
  }, [geocKey, map]);
  return null;
}

export function GraficoMapa({ intersecciones, totalSolicitudes }: GraficoMapaProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);

  const [maxPuntos, setMaxPuntos] = useState(15);
  const [puntos, setPuntos] = useState<PuntoGeo[]>([]);
  const [geocKey, setGeoKey] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState({ idx: 0, total: 0, nombre: "" });
  const [errorRed, setErrorRed] = useState<string | null>(null);
  const abortRef = useRef(false);

  const tienePuntos = puntos.some((p) => p.coord !== null);
  const sinDatos = intersecciones.length === 0;

  const geocodificar = async () => {
    const lista = intersecciones.slice(0, maxPuntos);
    if (lista.length === 0) return;

    const criticidades = asignarCriticidad(lista);

    setCargando(true);
    setErrorRed(null);
    setPuntos([]);
    abortRef.current = false;

    try {
      const resultado: PuntoGeo[] = [];

      for (let i = 0; i < lista.length; i++) {
        if (abortRef.current) break;
        const item = lista[i];
        setProgreso({ idx: i + 1, total: lista.length, nombre: item.nombre });

        let coord: [number, number] | null = null;
        try {
          coord = await geocodificarInterseccion(item.nombre);
        } catch {
          // red failure — coord stays null
        }

        resultado.push({ nombre: item.nombre, cantidad: item.cantidad, coord, criticidad: criticidades[i] });

        if (i < lista.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
      }

      setPuntos(resultado);
      setGeoKey((k) => k + 1);
    } catch (e) {
      setErrorRed(e instanceof Error ? e.message : "Error de conexión con USIG.");
    } finally {
      setCargando(false);
    }
  };

  const puntosConCoord = puntos.filter((p) => p.coord !== null);
  const coordsValidas = puntosConCoord.map((p) => p.coord as [number, number]);

  const pctGeocodificado = puntos.length > 0
    ? Math.round((puntosConCoord.length / puntos.length) * 100)
    : 0;

  const progresoPorc = progreso.total > 0
    ? Math.round((progreso.idx / progreso.total) * 100)
    : 5;

  return (
    <div
      className={`bg-slate-50 dark:bg-[#0d0f14] rounded-lg border border-slate-200 dark:border-[#1f2535] p-5 transition-opacity duration-500 ${
        montado ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            Mapa de puntos críticos
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Cada punto = una intersección · tamaño y color según concentración de incidentes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-2.5 py-1.5">
            Ciudad Autónoma de Buenos Aires
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#252d3d] border border-slate-200 dark:border-[#2e3852] rounded-lg px-2.5 py-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            USIG · GCBA
          </div>
        </div>
      </div>

      {/* ── Controles ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={maxPuntos}
          onChange={(e) => setMaxPuntos(Number(e.target.value))}
          disabled={cargando}
          className="text-sm border border-slate-200 dark:border-[#2e3852] rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-[#252d3d] focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
        >
          <option value={10}>Top 10 intersecciones</option>
          <option value={15}>Top 15 intersecciones</option>
          <option value={20}>Top 20 intersecciones</option>
        </select>

        <button
          onClick={geocodificar}
          disabled={cargando || sinDatos}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {cargando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Ubicando {progreso.idx}/{progreso.total}…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              {tienePuntos ? "Actualizar mapa" : "Ver en mapa"}
            </>
          )}
        </button>
      </div>

      {/* ── Barra de progreso ────────────────────────────────────────────── */}
      {cargando && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="truncate max-w-[70%] font-medium">{progreso.nombre}</span>
            <span className="shrink-0 text-slate-400">{progreso.idx}/{progreso.total}</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-[#252d3d] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progresoPorc, 3)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Mapa ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#2e3852]"
        style={{ height: 480 }}
      >
        <MapContainer
          center={CENTRO_BA}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <AjustarVista puntos={coordsValidas} geocKey={geocKey} />

          {puntosConCoord.map((punto, idx) => {
            const e = CRITICA_ESTILO[punto.criticidad];
            const pct = totalSolicitudes > 0
              ? Math.round((punto.cantidad / totalSolicitudes) * 100)
              : 0;
            return (
              <CircleMarker
                key={`${geocKey}-${idx}`}
                center={punto.coord!}
                radius={e.radio}
                pathOptions={{
                  fillColor: e.color,
                  color: "#fff",
                  weight: 1.5,
                  fillOpacity: 0.85,
                }}
              >
                <Tooltip sticky>
                  <div style={{ fontFamily: "system-ui,sans-serif", fontSize: 12, minWidth: 180 }}>
                    <p style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 4 }}>
                      {punto.nombre}
                    </p>
                    <p style={{ color: "#475569", marginBottom: 2 }}>
                      <b style={{ color: "#1d4ed8" }}>{punto.cantidad.toLocaleString("es-AR")}</b> incidentes
                      {" · "}{pct}% del total
                    </p>
                    <p style={{ color: e.color, fontWeight: 600, fontSize: 11 }}>
                      {e.label}
                    </p>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* ── Errores y estados ────────────────────────────────────────────── */}
      {errorRed && (
        <div className="flex items-center gap-2 mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">{errorRed}</p>
        </div>
      )}

      {sinDatos && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
            Este mapa requiere datos de intersección (CALLE 1 + CALLE 2). No se detectaron en el archivo.
          </p>
        </div>
      )}

      {!cargando && !tienePuntos && !errorRed && !sinDatos && (
        <div className="mt-3 p-3 bg-slate-50 dark:bg-[#252d3d] border border-slate-100 dark:border-[#2e3852] rounded-lg">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Hacé clic en{" "}
            <span className="font-medium text-slate-600 dark:text-slate-300">"Ver en mapa"</span>
            {" "}para ubicar las intersecciones más afectadas.
          </p>
        </div>
      )}

      {/* ── Leyenda post-geocodificación ─────────────────────────────────── */}
      {tienePuntos && !cargando && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {puntosConCoord.length} de {puntos.length} intersecciones ubicadas · {pctGeocodificado}% geocodificado
          </span>
          <div className="flex items-center gap-3">
            {(["alta", "media", "baja"] as const).map((c) => (
              <span key={c} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span
                  className="inline-block rounded-full border border-white"
                  style={{
                    width:  CRITICA_ESTILO[c].radio * 2,
                    height: CRITICA_ESTILO[c].radio * 2,
                    backgroundColor: CRITICA_ESTILO[c].color,
                  }}
                />
                {CRITICA_ESTILO[c].label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
