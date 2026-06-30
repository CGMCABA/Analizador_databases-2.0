# Contexto del proyecto — Dashboard de Reportes (Inteligencia Urbana Operativa)

Este documento es una guía de contexto para cualquier asistente de IA (Copilot, Claude, etc.)
que vaya a trabajar en este repositorio. Cubre qué hace el sistema, cómo está armado, qué
convenciones hay que respetar, y qué partes son frágiles o no deben tocarse sin cuidado.

---

## 1. Qué es esto (contexto operativo / de negocio)

Es una aplicación web pensada para que un **operador municipal o de gestión urbana** (no
necesariamente técnico) cargue un Excel con datos operativos crudos — reclamos vecinales,
sucesos/incidentes, solicitudes de servicio — y obtenga automáticamente un **dashboard
ejecutivo** sin tener que armar tablas dinámicas ni pedirle nada a un analista de datos.

El público objetivo son áreas de gobierno local (el copy y la geocodificación están atados a
**Buenos Aires / CABA**). El dataset típico tiene columnas como: fecha, motivo/categoría,
área asignada, calles/intersección, estado (resuelto/no resuelto), hora de ingreso/derivación,
línea (de atención telefónica), y un campo de "Programado / No Programado".

El valor del producto es que **no exige un esquema fijo**: el sistema detecta automáticamente
qué tipo de columna es cada una (heurística por nombre de header + muestreo de valores), y a
partir de ahí decide qué paneles mostrar. Si el archivo no tiene columna de calles, no se
muestra el mapa; si no tiene columna de estado, no se muestra tasa de resolución; etc.

### Lo que el dashboard le entrega al usuario
- KPIs: total de casos, tasa de resolución, tasa de falsos positivos, tiempos de respuesta.
- Rankings: por motivo, por área, por calle/intersección, por línea.
- Mapa geográfico de intersecciones (geocodificado contra el servicio público de USIG/GCBA).
- "Índice de fragilidad urbana": un score compuesto por zona (volumen + recurrencia + tiempo
  de respuesta) para priorizar dónde intervenir.
- Detección de "falsos positivos" operativos (ej: reclamos que terminan en "no se visualiza",
  "sin novedad") vía reglas de texto en español.
- Detección de "eventos crónicos": mismo motivo + misma intersección repitiéndose en ≥2 meses
  distintos.
- Ventana predictiva a 14 días (regresión lineal simple sobre el histórico mensual).
- Comparación entre dos períodos (dos meses del mismo archivo, o dos archivos distintos).
- Modo presentación (slideshow a pantalla completa) y exportación a PDF.

### Cómo se carga la información (3 vías, sin login obligatorio salvo Drive)
1. **Archivo local**: drag-and-drop o selección de `.xlsx`/`.xls`.
2. **URL de Google Sheet**: soporta tanto el link normal de compartir como el de
   "Publicado en la web" (dos formatos de URL distintos, ver sección técnica).
3. **Google Drive**: integración OAuth de **solo lectura** (nunca escribe ni borra nada),
   requiere que el operador configure un Client ID de Google Cloud (es opcional — si no está
   configurado, esa opción simplemente no aparece disponible).

---

## 2. Arquitectura técnica

### Stack
- React 19 + TypeScript (strict) + Vite 7 + Tailwind v4.
- UI: shadcn/ui (solo los componentes que realmente se usan: `button`, `card`, `dialog`,
  `sheet`, `input`, `label`, `separator`, `skeleton`, `textarea`, `toggle`, `tooltip` — el resto
  del catálogo shadcn fue eliminado por no tener uso, ver sección 5).
- Gráficos: Recharts.
- Mapa: Leaflet + react-leaflet (un solo componente lo usa: `GraficoMapa.tsx`).
- Excel: SheetJS (`xlsx`), instalado desde un tarball de `cdn.sheetjs.com` (no está en el
  registro npm — riesgo de build si ese CDN cae, es una limitación conocida).
- PDF: `html2canvas` + `jspdf`.
- Routing: `wouter` (una sola ruta real, `/`).
- **Sin backend.** Todo corre en el navegador: parseo de Excel, agregaciones, geocodificación,
  generación de PDF. No hay base de datos ni servidor propio.

### Flujo de datos (de punta a punta)
```
Archivo/URL/Drive
   → ArrayBuffer
   → parsearExcel(buffer)          [src/lib/excelParser.ts]
   → DatosDashboard                 (objeto agregado único, guardado en useState de Dashboard.tsx)
   → [opcional] filtrarDatos(datos, mes)   [src/lib/filtrarDatos.ts]
   → ~25 componentes de gráfico/panel reciben slices de ese objeto como props
```

`parsearExcel` es la función más importante del sistema: lee el workbook, clasifica columnas
(`columnClassifier.ts`), valida y normaliza fechas/horas, arma el array `Solicitud[]`, y calcula
~30 estructuras derivadas (por motivo, por área, por mes, por calle, por hora, por día de
semana, fragilidad, falsos positivos, recurrencia, cruces automáticos, calidad del dataset).

### Módulos de `src/lib/` (lógica pura, sin React)
| Archivo | Responsabilidad |
|---|---|
| `excelParser.ts` | Motor principal: lee el Excel, detecta columnas, construye `DatosDashboard` |
| `columnClassifier.ts` | Heurística de clasificación de columnas (fecha/hora/categórica/status/dirección/etc.) |
| `agregaciones.ts` | **Funciones de agregación puras y compartidas** (groupby, rankings, fragilidad, TRI, cruces) — usadas tanto por `excelParser.ts` como por `filtrarDatos.ts` |
| `filtrarDatos.ts` | Recalcula `DatosDashboard` para un mes específico, reutilizando `agregaciones.ts` |
| `compararPeriodos.ts` | Calcula deltas entre dos `DatosDashboard` ya calculados (no duplica agregación, solo diff) |
| `semaforoRecomendaciones.ts` | Capa de "inteligencia de negocio": traduce métricas en semáforo (verde/amarillo/rojo) + recomendaciones en texto |
| `ventanaPredictiva.ts` | Regresión lineal simple para proyección a 14 días |
| `googleSheetsUrl.ts` | Construye la URL de exportación correcta según el formato del link de Google Sheets |
| `googleAuth.ts` / `googleDriveApi.ts` | OAuth (Google Identity Services) + wrapper de Drive API v3, solo lectura |
| `utils.ts` | Helper `cn()` de Tailwind (boilerplate shadcn) |

**Nota importante sobre `agregaciones.ts`**: este archivo se creó en una limpieza reciente
para eliminar ~300 líneas de lógica duplicada que existían entre `excelParser.ts` y
`filtrarDatos.ts`. **Cualquier cambio a una fórmula de negocio (cómo se calcula la tasa de
resolución, el índice de fragilidad, los falsos positivos, etc.) debe hacerse ahí, no en los
dos archivos por separado** — si se edita en un solo lugar, el otro queda desactualizado y
los números de la vista "todos los meses" empiezan a no coincidir con la vista filtrada por mes.

### Componentes de `src/pages/` y `src/components/`
- `Dashboard.tsx` (~1000 líneas): el orquestador central. Tiene todo el estado de la app
  (archivo cargado, filtro de mes, modo presentación, modo comparación, dark mode, etc.) y
  renderiza condicionalmente los ~25 paneles según qué columnas detectó el parser.
- `PaginaInicio.tsx`: pantalla de carga (drag-and-drop + URL + Drive picker).
- `DriveFilePicker.tsx`: navegador de carpetas de Google Drive.
- `GraficoMapa.tsx`: el único componente con Leaflet real; geocodifica intersecciones contra
  el servicio público `servicios.usig.buenosaires.gob.ar` (sin API key, con throttling manual
  de 300ms entre requests).
- El resto de `Grafico*.tsx`, `Panel*.tsx`, etc. son visualizaciones Recharts que reciben datos
  ya calculados — no tienen lógica de negocio propia, son "tontos".

### Estado
React local puro (`useState`/`useMemo`/`useCallback`). No hay Redux/Zustand/Context global ni
TanStack Query (se eliminó por no tener uso real). Todo el estado de la app vive en
`Dashboard.tsx` y se pasa hacia abajo por props.

---

## 3. Convenciones y reglas de negocio que hay que respetar

1. **Todo en español** (UI, nombres de variables de negocio, mensajes de error). No mezclar
   inglés en textos visibles al usuario.
2. **Sin backend.** No agregar llamadas a un servidor propio sin que sea una decisión
   consciente y discutida — es parte central de la propuesta de valor (deploy estático, sin
   costo de infraestructura).
3. **Detección de columnas heurística y por nombre en español.** Si se agregan nuevas
   palabras clave de detección, hay que probarlas contra datasets reales variados — un cambio
   mal calibrado puede ocultar secciones enteras del dashboard silenciosamente.
4. **`crucesCronicos` e `indiceFragilidad` solo existen a nivel "todos los meses".** Cuando hay
   un filtro de mes activo, `filtrarDatos.ts` los vacía a propósito (son análisis que requieren
   ≥2 meses de historia). No es un bug, es una regla de negocio explícita.
5. **`filtrarDatos.ts` preserva ciertos campos del dataset completo** al filtrar por mes
   (`calidadDataset`, flags de tipo de columna, lista completa de `meses`) para que el header y
   el panel de calidad sigan dando contexto global aunque se esté viendo un solo mes.
6. **Geocodificación atada a Buenos Aires (CABA)** de forma deliberada (`CABA_BOUNDS` en
   `GraficoMapa.tsx`, servicio USIG). Generalizar a otras ciudades requiere cambiar todo el
   backend de geocodificación, no solo relajar el bounds-check.
7. **Google Drive es de solo lectura por diseño explícito** — la UI lo comunica al usuario.
   No ampliar a permisos de escritura sin que sea una decisión deliberada y comunicada.
8. **Modo presentación y export a PDF dependen de convenciones CSS específicas** (`print:hidden`,
   atributo `data-presentation`) repartidas en varios componentes — si se renombran esas clases
   hay que actualizar todo el árbol que las usa.

---

## 4. Riesgos conocidos / cosas frágiles (a tener en cuenta al pedirle cambios a Copilot)

- **`excelParser.ts` sigue siendo grande y heurístico** (parsing de fechas en múltiples
  formatos, detección de hora de ingreso vs. derivación, modo "hoja única" vs. "una hoja por
  mes"). No tiene tests automatizados — cualquier cambio ahí se debe verificar manualmente con
  un archivo real antes de dar por buena la modificación.
- **`xlsx` (SheetJS)** se instala desde un tarball externo (`cdn.sheetjs.com`), no desde el
  registro npm — riesgo de build si ese link cae.
- **`GraficoMapa.tsx`**: geocodifica secuencialmente (una request HTTP por intersección, con
  delay manual) y no cachea resultados entre clicks de "Trazar calles" — puede tardar bastante
  con datasets grandes.
- **`TablaDetalle.tsx`**: filtra/ordena el array completo en cada tecla del buscador sin
  debounce — puede sentirse lento con datasets muy grandes.
- **No hay Error Boundary** — un error de render en cualquier gráfico deja la pantalla en
  blanco sin mensaje útil.
- **`Dashboard.tsx` es muy grande** (estado + orquestación + ~600 líneas de JSX en un solo
  componente). No hay tests de ningún tipo en el proyecto todavía.

---

## 5. Qué se limpió recientemente (por si Copilot encuentra referencias viejas en docs/memoria)

En una sesión de limpieza reciente se eliminaron, por no tener ningún uso real en el código:
`@tanstack/react-query`, `zod`, `framer-motion`, `date-fns`, `leaflet.heat`, `react-icons`,
`sonner`, `react-hook-form`, `@hookform/resolvers`, `cmdk`, `embla-carousel-react`,
`react-day-picker`, `vaul`, `input-otp`, `react-resizable-panels`, `next-themes`, y ~38
componentes de `components/ui/*` que nunca se importaban (accordion, alert, avatar, badge,
calendar, carousel, chart, checkbox, command, dropdown-menu, select, sidebar, table, tabs,
toast/toaster/sonner, etc.). Si en algún momento se necesita alguno de estos de nuevo, hay
que reinstalarlo y volver a generar el componente shadcn correspondiente — no están en el
repo actual.

También se arregló un bug donde las URLs de Google Sheets "Publicadas en la web"
(formato `/d/e/PUBLISH_ID/...`) fallaban porque el parser viejo confundía la letra `"e"` de
esa ruta con el ID real del archivo. El fix vive en `src/lib/googleSheetsUrl.ts`.

---

## 6. Deuda técnica conocida (detectada, documentada, no resuelta a propósito)

### Inconsistencia entre definiciones geográficas

El sistema tiene **tres criterios distintos** de qué cuenta como "una calle", usados por
distintos componentes, y nunca se unificaron:

- `porCalle` (`agregaciones.ts` → `calcularPorCalle`): cuenta menciones en **calle1 + calle2 +
  calle3** combinadas. Lo usa `GraficoCalles.tsx` y `ResumenGeografico.tsx`.
- `porInterseccion` (`calcularPorInterseccion`): combina **calle1 + calle2 únicamente**
  (ignora calle3). Lo usa el ranking de intersecciones en `Dashboard.tsx` y `GraficoMapa.tsx`
  (vía `porSegmento`, que sí usa las 3).
- `porCalle1Ranking` (`calcularPorCalle1Ranking`): usa **solo calle1**. Lo usa
  `GraficoCruceCalle.tsx`.

Esto significa que el mismo dataset puede mostrar un "top calle" distinto según qué
componente se mire, sin que el usuario tenga forma de saber por qué. Se descubrió durante la
fase 2.2 (desfragmentación geográfica) al construir `ResumenGeografico.tsx`: sumar los
top-N de `porCalle` y dividirlos por el total de registros para mostrar un "% combinado de
concentración" dio **116%** — porque `porCalle` no es una partición excluyente (un mismo
registro puede aportar a dos entradas si la misma calle aparece en más de una posición, o si
calle1 y calle2 son ambas "top"). Se corrigió mostrando el % individual de cada calle (nunca
sumado), pero la causa de fondo —que existan 3 criterios distintos de "calle" en el sistema—
**sigue sin resolverse**, queda para una fase dedicada que decida un único criterio (o
documente explícitamente cuándo usar cada uno) y toque `agregaciones.ts`.

---

## 6. Cómo correr el proyecto localmente

```
cd app
npm install
npm run dev        # http://localhost:5173
npm run build       # build de producción a dist/
npm run typecheck   # tsc --noEmit
```

No requiere variables de entorno para funcionar en modo básico (carga de archivo local o
URL de Google Sheets pública). Para habilitar Google Drive, se necesita `VITE_GOOGLE_CLIENT_ID`
en un `.env.local`.
