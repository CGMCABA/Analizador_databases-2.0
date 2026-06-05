export type TipoColumna =
  | 'id'
  | 'fecha'
  | 'hora'
  | 'programacion'
  | 'categorica'
  | 'status'
  | 'numerica'
  | 'direccion'
  | 'texto_libre'
  | 'ignorar';

export interface ColumnaDetectada {
  indice: number;
  nombre: string;
  tipo: TipoColumna;
  muestras: string[];
  cantidadUnicos: number;
}

function tiene(texto: string, terminos: string[]): boolean {
  return terminos.some((t) => texto.includes(t));
}

export function clasificarColumnas(
  headers: string[],
  filasData: unknown[][],
  maxFilas = 60
): ColumnaDetectada[] {
  const muestra = filasData.slice(0, maxFilas);

  return headers.map((headerRaw, idx) => {
    const nombre = headerRaw.trim();
    const h = nombre.toLowerCase().trim();

    const todosValores = muestra
      .map((r) => String(((r as unknown[])[idx]) ?? "").trim())
      .filter((v) => v !== "");
    const total = todosValores.length;
    const unicos = new Set(todosValores);
    const cantidadUnicos = unicos.size;
    const muestras = Array.from(unicos).slice(0, 5);

    const make = (tipo: TipoColumna): ColumnaDetectada => ({
      indice: idx,
      nombre,
      tipo,
      muestras,
      cantidadUnicos,
    });

    if (h === "id") return make("id");

    if (tiene(h, ["tiempo de respuesta"])) return make("numerica");

    if (tiene(h, ["geolocali", "latitude", "longitude", "collong"])) return make("ignorar");

    if (tiene(h, ["hora", "time"]) && !tiene(h, ["fecha"])) return make("hora");

    if (tiene(h, ["fecha"]) && !tiene(h, ["hora", "resoluc"])) return make("fecha");

    if (tiene(h, ["resuelto", "resolución", "resolucion"])) return make("status");

    if (
      tiene(h, [
        "descripcion",
        "descripción",
        "detalle",
        "observacion",
        "observaciones",
        "comentario",
        "comentarios",
      ])
    ) {
      return make("texto_libre");
    }

    if (tiene(h, ["calle", "dirección", "direccion", "ubicacion"])) return make("direccion");

    // ── Detect programacion column BEFORE categorica ──────────────────────────
    // Detection by column name (most reliable, no value scan needed)
    if (tiene(h, ["programaci", "tipo evento"])) return make("programacion");

    // Detection by name + value combination (requires ≤5 unique values)
    if (total >= 3 && cantidadUnicos >= 1 && cantidadUnicos <= 5) {
      const valoresLower = Array.from(unicos).map((v) => v.toLowerCase().trim());

      // "Programado" side: only exact forms or "programado*" prefix — NOT "program*" to avoid "Programa A"
      const tieneProgram = valoresLower.some(
        (v) =>
          v === "programado" || v === "programados" ||
          v === "p" || v.startsWith("programado")
      );
      // "No Programado" side
      const tieneNoProgram = valoresLower.some(
        (v) =>
          v === "no programado" || v === "no programados" ||
          v === "np" || v === "n/p" || v.startsWith("no program")
      );
      const tieneP = valoresLower.some((v) => v === "p");
      const tieneNP = valoresLower.some((v) => v === "np");

      // "modalidad" header + programado values → programacion
      if (tiene(h, ["modalidad"]) && tieneProgram) return make("programacion");

      // Exact "tipo" header + values match one of the patterns → programacion
      if (h === "tipo" && (tieneProgram || tieneNoProgram)) return make("programacion");

      // Values alone: BOTH sides must be present (avoids single-sided false positives)
      if (tieneProgram && tieneNoProgram) return make("programacion");

      // Strict binary "P" vs "NP" (max 3 unique values to allow blank/null)
      if (tieneP && tieneNP && cantidadUnicos <= 3) return make("programacion");
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (
      tiene(h, [
        "motivo",
        "tipo",
        "categoria",
        "categoría",
        "subclasif",
        "area",
        "área",
        "sector",
        "linea",
        "línea",
        "estado",
        "clasificacion",
        "reconsulta",
        "comunicado",
      ])
    ) {
      return make("categorica");
    }

    if (total === 0) return make("ignorar");

    const siNoCount = todosValores.filter((v) => {
      const vu = v.toUpperCase().trim();
      return vu === "SI" || vu === "NO" || vu === "SÍ";
    }).length;
    if (total >= 3 && siNoCount / total > 0.65) return make("status");

    const excelDateCount = todosValores.filter((v) => {
      const n = Number(v);
      return !isNaN(n) && n > 40000 && n < 55000;
    }).length;
    if (total >= 3 && excelDateCount / total > 0.75) return make("fecha");

    const fraccionCount = todosValores.filter((v) => {
      const n = Number(v);
      return !isNaN(n) && n >= 0 && n <= 1;
    }).length;
    if (total >= 3 && fraccionCount / total > 0.75) return make("hora");

    const numericCount = todosValores.filter(
      (v) => !isNaN(Number(v)) && v !== ""
    ).length;
    if (total >= 3 && numericCount / total > 0.85) return make("numerica");

    const uniqueRatio = cantidadUnicos / Math.max(total, 1);
    if (cantidadUnicos >= 2 && cantidadUnicos <= 50 && uniqueRatio < 0.45) {
      return make("categorica");
    }

    return make("texto_libre");
  });
}

export function etiquetaTipo(tipo: TipoColumna): string {
  switch (tipo) {
    case "id": return "Identificador";
    case "fecha": return "Fecha";
    case "hora": return "Hora";
    case "programacion": return "Tipo Evento";
    case "categorica": return "Categoría";
    case "status": return "Estado";
    case "numerica": return "Numérica";
    case "direccion": return "Dirección";
    case "texto_libre": return "Texto";
    case "ignorar": return "Ignorado";
  }
}
