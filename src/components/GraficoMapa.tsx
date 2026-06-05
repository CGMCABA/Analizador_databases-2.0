import { useState, useEffect, useRef, Fragment } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Loader2, AlertTriangle, Info } from "lucide-react";

interface Segmento {
  calle1: string;
  calle2: string;
  calle3: string;
  cantidad: number;
  calleTotal: number;
  motivos: { nombre: string; cantidad: number }[];
}

interface CruceGeocodificado {
  segmento: Segmento;
  coord: [number, number] | null;
}

interface CalleTrazada {
  nombre: string;
  calleTotal: number;
  rankIdx: number;
  cruces: CruceGeocodificado[];
}

interface GraficoMapaProps {
  segmentos: Segmento[];
  totalSolicitudes: number;
}

const CENTRO_BA: [number, number] = [-34.6037, -58.3816];
const DELAY_MS = 300;

const CABA_BOUNDS = {
  latMin: -34.705,
  latMax: -34.527,
  lonMin: -58.532,
  lonMax: -58.334,
};

const PALETA: string[] = ["#dc2626", "#f97316", "#eab308", "#38bdf8", "#8b5cf6", "#10b981", "#f43f5e", "#06b6d4", "#84cc16", "#fb923c"];

function colorPorRank(rankIdx: number): string {
  return PALETA[Math.min(rankIdx, PALETA.length - 1)];
}

function dentroDeCaba(lat: number, lon: number): boolean {
  return (
    lat >= CABA_BOUNDS.latMin &&
    lat <= CABA_BOUNDS.latMax &&
    lon >= CABA_BOUNDS.lonMin &&
    lon <= CABA_BOUNDS.lonMax
  );
}

async function obtenerCoordenadaUSIG(
  calle1: string,
  calle2: string
): Promise<[number, number] | null> {
  const q = encodeURIComponent(`${calle1.trim()} y ${calle2.trim()}, caba`);
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

function ordenarPuntosGeograficamente(puntos: [number, number][]): [number, number][] {
  if (puntos.length < 2) return puntos;
  const lats = puntos.map((p) => p[0]);
  const lons = puntos.map((p) => p[1]);
  const rangoLat = Math.max(...lats) - Math.min(...lats);
  const rangoLon = Math.max(...lons) - Math.min(...lons);
  if (rangoLon > rangoLat) {
    return [...puntos].sort((a, b) => a[1] - b[1]);
  }
  return [...puntos].sort((a, b) => a[0] - b[0]);
}

function getCircleStyle(cantidad: number, max: number, color: string) {
  const ratio = max > 0 ? cantidad / max : 0;
  const radius = Math.round(4 + ratio * 5);
  return { radius, fillColor: color, color, weight: 0, fillOpacity: 1 };
}

function AjustarVista({ puntos, geocKey }: { puntos: [number, number][]; geocKey: number }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 0) return;
    map.fitBounds(puntos as LatLngBoundsExpression, { padding: [40, 40], maxZoom: 15 });
  }, [geocKey, map]);
  return null;
}

export function GraficoMapa({ segmentos, totalSolicitudes }: GraficoMapaProps) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);

  const [maxCalles, setMaxCalles] = useState(5);
  const [callesTrazadas, setCallesTrazadas] = useState<CalleTrazada[]>([]);
  const [geocKey, setGeoKey] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState({
    calleIdx: 0,
    totalCalles: 0,
    nombreCalle: "",
    cruceIdx: 0,
    totalCruces: 0,
    nombreCruce: "",
  });
  const [errorRed, setErrorRed] = useState<string | null>(null);
  const abortRef = useRef(false);

  const tieneTrazado = callesTrazadas.length > 0;

  const geocodificar = async () => {
    const segsValidos = segmentos.filter((s) => s.calle1 && s.calle2);
    if (segsValidos.length === 0) return;

    const mapaCalles = new Map<string, { calleTotal: number; segs: Segmento[] }>();
    for (const s of segsValidos) {
      const key = s.calle1;
      if (!mapaCalles.has(key)) {
        mapaCalles.set(key, { calleTotal: 0, segs: [] });
      }
      const entry = mapaCalles.get(key)!;
      entry.calleTotal += s.cantidad;
      entry.segs.push(s);
    }

    const topCalles = Array.from(mapaCalles.entries())
      .sort((a, b) => b[1].calleTotal - a[1].calleTotal)
      .slice(0, maxCalles);

    setCargando(true);
    setErrorRed(null);
    setCallesTrazadas([]);
    abortRef.current = false;

    try {
      const resultado: CalleTrazada[] = [];

      for (let ci = 0; ci < topCalles.length; ci++) {
        if (abortRef.current) break;
        const [nombreCalle, { calleTotal, segs }] = topCalles[ci];
        const cruces: CruceGeocodificado[] = [];

        for (let si = 0; si < segs.length; si++) {
          if (abortRef.current) break;
          const seg = segs[si];
          setProgreso({
            calleIdx: ci + 1,
            totalCalles: topCalles.length,
            nombreCalle,
            cruceIdx: si + 1,
            totalCruces: segs.length,
            nombreCruce: seg.calle2,
          });
          try {
            const coord = await obtenerCoordenadaUSIG(seg.calle1, seg.calle2);
            cruces.push({ segmento: seg, coord });
          } catch {
            cruces.push({ segmento: seg, coord: null });
          }
          if (si < segs.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
        }

        resultado.push({ nombre: nombreCalle, calleTotal, rankIdx: ci, cruces });
        if (ci < topCalles.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
      }

      setCallesTrazadas(resultado);
      setGeoKey((k) => k + 1);
    } catch (e) {
      setErrorRed(e instanceof Error ? e.message : "Error de conexión con USIG.");
    } finally {
      setCargando(false);
    }
  };

  const todosLosPuntosConCoord: [number, number][] = callesTrazadas.flatMap((ct) =>
    ct.cruces.filter((c) => c.coord !== null).map((c) => c.coord as [number, number])
  );

  const necesitaSegmentos = segmentos.filter((s) => s.calle1 && s.calle2).length === 0;

  const progresoPorc = progreso.totalCalles > 0
    ? Math.round(((progreso.calleIdx - 1) / progreso.totalCalles) * 100 +
        (progreso.totalCruces > 0 ? (progreso.cruceIdx / progreso.totalCruces) * (100 / progreso.totalCalles) : 0))
    : 5;

  const totalCruces = callesTrazadas.reduce((acc, ct) => acc + ct.cruces.length, 0);
  const totalCrucesConCoord = callesTrazadas.reduce(
    (acc, ct) => acc + ct.cruces.filter((c) => c.coord !== null).length,
    0
  );

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 transition-opacity duration-500 ${
        montado ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            Mapa de calles más afectadas
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Trazado por CALLE 1 · cada cruce con CALLE 2 es un punto · color por frecuencia
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-2.5 py-1.5">
            Ciudad Autónoma de Buenos Aires
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            USIG · GCBA
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={maxCalles}
          onChange={(e) => setMaxCalles(Number(e.target.value))}
          disabled={cargando}
          className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
        >
          <option value={3}>Top 3 calles</option>
          <option value={5}>Top 5 calles</option>
          <option value={10}>Top 10 calles</option>
        </select>

        <button
          onClick={geocodificar}
          disabled={cargando || necesitaSegmentos}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {cargando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Trazando {progreso.calleIdx}/{progreso.totalCalles}…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              {tieneTrazado ? "Actualizar trazado" : "Trazar calles"}
            </>
          )}
        </button>
      </div>

      {cargando && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="truncate max-w-[70%] font-medium">
              {progreso.nombreCalle}
              {progreso.totalCalles > 0 && (
                <span className="font-normal text-slate-400">
                  {" "}· calle {progreso.calleIdx}/{progreso.totalCalles}
                </span>
              )}
              {progreso.nombreCruce && (
                <span className="font-normal text-slate-400"> · {progreso.nombreCruce}</span>
              )}
            </span>
            <span className="shrink-0 text-slate-400">
              {progreso.totalCruces > 0
                ? `cruce ${progreso.cruceIdx}/${progreso.totalCruces}`
                : ""}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progresoPorc, 3)}%` }}
            />
          </div>
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600"
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
          <AjustarVista puntos={todosLosPuntosConCoord} geocKey={geocKey} />

          {callesTrazadas.map((calle) => {
            const color = colorPorRank(calle.rankIdx);
            const crucesConCoord = calle.cruces.filter((c) => c.coord !== null);
            const puntosOrdenados = ordenarPuntosGeograficamente(
              crucesConCoord.map((c) => c.coord as [number, number])
            );
            const maxCantidadCalle =
              crucesConCoord.length > 0
                ? Math.max(...crucesConCoord.map((c) => c.segmento.cantidad))
                : 1;
            const pctCalle =
              totalSolicitudes > 0
                ? Math.round((calle.calleTotal / totalSolicitudes) * 100)
                : 0;
            const weight = calle.rankIdx === 0 ? 6 : calle.rankIdx === 1 ? 5 : 4;

            return (
              <Fragment key={`calle-${geocKey}-${calle.nombre}`}>
                {puntosOrdenados.length >= 2 && (
                  <Polyline
                    positions={puntosOrdenados}
                    pathOptions={{ color, weight, opacity: 0.85 }}
                  >
                    <Tooltip sticky>
                      <div style={{ fontFamily: "system-ui,sans-serif", fontSize: 12, minWidth: 170 }}>
                        <p style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 3 }}>
                          {calle.nombre}
                        </p>
                        <p style={{ color: "#475569" }}>
                          <b style={{ color: "#1d4ed8" }}>{calle.calleTotal}</b> solicitudes totales
                          {" · "}{pctCalle}% del total
                        </p>
                        <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                          {crucesConCoord.length} cruces geocodificados
                        </p>
                      </div>
                    </Tooltip>
                  </Polyline>
                )}

                {crucesConCoord.map(({ segmento, coord }, idx) => {
                  const style = getCircleStyle(segmento.cantidad, maxCantidadCalle, color);
                  const pctCruce =
                    totalSolicitudes > 0
                      ? Math.round((segmento.cantidad / totalSolicitudes) * 100)
                      : 0;
                  const topMotivo = segmento.motivos[0]?.nombre ?? "";
                  return (
                    <CircleMarker
                      key={`${geocKey}-${calle.nombre}-cruce-${idx}`}
                      center={coord!}
                      radius={style.radius}
                      pathOptions={{
                        fillColor: style.fillColor,
                        color: style.color,
                        weight: style.weight,
                        fillOpacity: style.fillOpacity,
                      }}
                    >
                      <Tooltip sticky>
                        <div style={{ fontFamily: "system-ui,sans-serif", fontSize: 12, minWidth: 170 }}>
                          <p style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 3 }}>
                            {segmento.calle1} × {segmento.calle2}
                          </p>
                          <p style={{ color: "#475569", marginBottom: 2 }}>
                            <b style={{ color: "#1d4ed8" }}>{segmento.cantidad}</b> solicitudes
                            {" · "}{pctCruce}% del total
                          </p>
                          {topMotivo && (
                            <p style={{ color: "#64748b", fontSize: 11 }}>
                              Motivo: <b>{topMotivo}</b>
                            </p>
                          )}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
              </Fragment>
            );
          })}
        </MapContainer>
      </div>

      {errorRed && (
        <div className="flex items-center gap-2 mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">{errorRed}</p>
        </div>
      )}

      {necesitaSegmentos && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
            Este mapa requiere datos de CALLE 2 en el Excel. No se detectaron cruces con los datos actuales.
          </p>
        </div>
      )}

      {!cargando && !tieneTrazado && !errorRed && !necesitaSegmentos && (
        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-lg">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Hacé clic en{" "}
            <span className="font-medium text-slate-600 dark:text-slate-300">"Trazar calles"</span>{" "}
            para ver el recorrido de las calles más afectadas.
          </p>
        </div>
      )}

      {tieneTrazado && !cargando && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {callesTrazadas.length} calles trazadas · {totalCrucesConCoord} de {totalCruces} cruces geocodificados
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {callesTrazadas.map((ct) => (
              <span
                key={ct.nombre}
                className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
              >
                <span
                  className="inline-block w-5 h-2 rounded-full"
                  style={{ backgroundColor: colorPorRank(ct.rankIdx) }}
                />
                {ct.nombre}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
