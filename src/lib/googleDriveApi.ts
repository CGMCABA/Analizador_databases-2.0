const BASE = "https://www.googleapis.com/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
}

const EXCEL_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
]);

const EXCEL_EXTS = new Set([".xlsx", ".xls", ".xlsm", ".xlsb"]);

const FOLDER_MIME = "application/vnd.google-apps.folder";

function esArchivoExcel(f: DriveFile): boolean {
  if (EXCEL_MIMES.has(f.mimeType)) return true;
  const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
  return EXCEL_EXTS.has(ext);
}

async function driveGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg =
      (err as { error?: { message?: string } })?.error?.message ??
      `Google Drive API error ${resp.status}`;
    throw new Error(`${resp.status}: ${msg}`);
  }
  return resp.json() as Promise<T>;
}

export async function listarArchivos(
  token: string,
  folderId: string = "root"
): Promise<{ archivos: DriveFile[]; carpetas: DriveFile[] }> {
  const q = `'${folderId}' in parents and trashed = false`;
  const fields = "nextPageToken,files(id,name,mimeType,size,modifiedTime,parents)";
  const allItems: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      q,
      fields,
      pageSize: "1000",
      orderBy: "folder,name",
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await driveGet<{ files: DriveFile[]; nextPageToken?: string }>(
      "/files",
      token,
      params
    );
    allItems.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  const carpetas = allItems.filter((f) => f.mimeType === FOLDER_MIME);
  const archivos = allItems.filter((f) => f.mimeType !== FOLDER_MIME && esArchivoExcel(f));
  return { archivos, carpetas };
}

export async function descargarArchivo(token: string, fileId: string): Promise<ArrayBuffer> {
  const url = `${BASE}/files/${fileId}?alt=media`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg =
      (err as { error?: { message?: string } })?.error?.message ??
      `Error al descargar archivo: ${resp.status}`;
    throw new Error(`${resp.status}: ${msg}`);
  }
  return resp.arrayBuffer();
}

export async function obtenerInfoArchivo(token: string, fileId: string): Promise<DriveFile> {
  return driveGet<DriveFile>(`/files/${fileId}`, token, {
    fields: "id,name,mimeType,size,modifiedTime",
  });
}

export function formatearTamaño(bytes?: string): string {
  if (!bytes) return "";
  const n = parseInt(bytes, 10);
  if (isNaN(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatearFechaModif(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}
