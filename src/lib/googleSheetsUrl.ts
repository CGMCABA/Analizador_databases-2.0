/**
 * Construye la URL de exportación a XLSX para una URL de Google Sheet.
 *
 * Soporta dos formatos:
 * - Link normal de compartir: .../spreadsheets/d/{ID}/edit?usp=sharing
 * - Link "Publicado en la web": .../spreadsheets/d/e/{PUBLISH_ID}/pubhtml
 *
 * El segundo formato usa un ID distinto (de publicación, no del archivo), por lo
 * que el endpoint /export no funciona ahí — hay que usar /pub?output=xlsx en su lugar.
 */
export function construirUrlExportXlsx(url: string): string | null {
  const gidMatch = url.match(/gid=(\d+)/);
  const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : "";

  const publicadoMatch = url.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (publicadoMatch) {
    return `https://docs.google.com/spreadsheets/d/e/${publicadoMatch[1]}/pub?output=xlsx${gidParam}`;
  }

  const normalMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (normalMatch) {
    return `https://docs.google.com/spreadsheets/d/${normalMatch[1]}/export?format=xlsx${gidParam}`;
  }

  return null;
}

export function esUrlGoogleSheetValida(url: string): boolean {
  return construirUrlExportXlsx(url) !== null;
}
