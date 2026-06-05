import { DatosDashboard } from "./excelParser";

export type UnidadDelta = "pct_relativo" | "pp" | "minutos";

export interface DeltaMetrica {
  labelA: string;
  labelB: string;
  valorA: number;
  valorB: number;
  valorAStr: string;
  valorBStr: string;
  deltaAbs: number;
  deltaPct: number | null;
  mejoraSubida: boolean;
  unidad: UnidadDelta;
}

export interface VariacionCategoria {
  nombre: string;
  cantA: number;
  cantB: number;
  deltaAbs: number;
  deltaPct: number | null;
  pctDeA: number;
  pctDeB: number;
}

export interface ComparacionResultado {
  labelA: string;
  labelB: string;
  tipoComparacion: "meses" | "archivos";

  totalSolicitudes: DeltaMetrica;
  tasaResolucion: DeltaMetrica | null;
  triPromedio: DeltaMetrica | null;
  tasaFalsosPositivos: DeltaMetrica | null;

  variacionMotivos: VariacionCategoria[];
  variacionAreas: VariacionCategoria[];
  motivosNuevos: string[];
  motivosDesaparecidos: string[];
}

function deltaPct(a: number, b: number): number | null {
  if (a === 0) return null;
  return Math.round(((b - a) / a) * 100);
}

function construirDelta(
  labelA: string,
  labelB: string,
  valorA: number,
  valorB: number,
  formato: (n: number) => string,
  mejoraSubida: boolean,
  unidad: UnidadDelta = "pct_relativo"
): DeltaMetrica {
  return {
    labelA,
    labelB,
    valorA,
    valorB,
    valorAStr: formato(valorA),
    valorBStr: formato(valorB),
    deltaAbs: valorB - valorA,
    deltaPct: deltaPct(valorA, valorB),
    mejoraSubida,
    unidad,
  };
}

function cruzarCategorias(
  listA: { nombre: string; cantidad: number }[],
  listB: { nombre: string; cantidad: number }[],
  totalA: number,
  totalB: number
): { variacion: VariacionCategoria[]; nuevos: string[]; desaparecidos: string[] } {
  const mapA = new Map(listA.map((x) => [x.nombre, x.cantidad]));
  const mapB = new Map(listB.map((x) => [x.nombre, x.cantidad]));

  const todasNombres = new Set([...mapA.keys(), ...mapB.keys()]);
  const variacion: VariacionCategoria[] = [];

  for (const nombre of todasNombres) {
    const cantA = mapA.get(nombre) ?? 0;
    const cantB = mapB.get(nombre) ?? 0;
    variacion.push({
      nombre,
      cantA,
      cantB,
      deltaAbs: cantB - cantA,
      deltaPct: deltaPct(cantA, cantB),
      pctDeA: totalA > 0 ? Math.round((cantA / totalA) * 100) : 0,
      pctDeB: totalB > 0 ? Math.round((cantB / totalB) * 100) : 0,
    });
  }

  variacion.sort((a, b) => {
    const maxA = Math.max(a.cantA, a.cantB);
    const maxB = Math.max(b.cantA, b.cantB);
    return maxB - maxA;
  });

  const nuevos = [...mapB.keys()].filter((n) => !mapA.has(n));
  const desaparecidos = [...mapA.keys()].filter((n) => !mapB.has(n));

  return { variacion, nuevos, desaparecidos };
}

export function compararPeriodos(
  datosA: DatosDashboard,
  datosB: DatosDashboard,
  labelA: string,
  labelB: string,
  tipoComparacion: "meses" | "archivos"
): ComparacionResultado {
  const totalA = datosA.totalSolicitudes;
  const totalB = datosB.totalSolicitudes;

  const totalSolicitudes = construirDelta(
    labelA, labelB, totalA, totalB,
    (n) => n.toLocaleString("es-AR"),
    false,
    "pct_relativo"
  );

  const tasaResolucion =
    datosA.tieneColumnaStatus && datosB.tieneColumnaStatus
      ? construirDelta(
          labelA, labelB,
          datosA.tasaResolucion, datosB.tasaResolucion,
          (n) => `${n}%`,
          true,
          "pp"
        )
      : null;

  const triPromedio =
    datosA.tieneHoraDerivacion && datosB.tieneHoraDerivacion
      ? construirDelta(
          labelA, labelB,
          datosA.tiempoRespuestaInternoPromedio, datosB.tiempoRespuestaInternoPromedio,
          (n) => n >= 120 ? `${(n / 60).toFixed(1)} h` : `${n} min`,
          false,
          "minutos"
        )
      : null;

  const tasaFalsosPositivos =
    datosA.tieneColumnaStatus && datosB.tieneColumnaStatus
      ? construirDelta(
          labelA, labelB,
          datosA.tasaFalsosPositivos, datosB.tasaFalsosPositivos,
          (n) => `${n}%`,
          false,
          "pp"
        )
      : null;

  const { variacion: variacionMotivos, nuevos: motivosNuevos, desaparecidos: motivosDesaparecidos } =
    cruzarCategorias(datosA.porMotivo, datosB.porMotivo, totalA, totalB);

  const { variacion: variacionAreas } = cruzarCategorias(
    datosA.porArea, datosB.porArea, totalA, totalB
  );

  return {
    labelA,
    labelB,
    tipoComparacion,
    totalSolicitudes,
    tasaResolucion,
    triPromedio,
    tasaFalsosPositivos,
    variacionMotivos,
    variacionAreas,
    motivosNuevos,
    motivosDesaparecidos,
  };
}
