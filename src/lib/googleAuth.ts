const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

interface TokenInfo {
  accessToken: string;
  expiresAt: number;
}

let tokenInfo: TokenInfo | null = null;
let gisLoaded = false;
let gisLoading = false;
let gisCallbacks: Array<() => void> = [];
let gisErrorCallbacks: Array<(e: Error) => void> = [];

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

/**
 * Auth approach: Google Identity Services (GIS) token client flow.
 * GIS handles PKCE-equivalent security internally (code verifier is managed
 * by the browser/Google SDK), which is the recommended approach for
 * browser-only apps since the explicit authorization-code + PKCE flow
 * requires a backend to securely exchange the code (Google mandates
 * client_secret for web-app OAuth clients). GIS eliminates that requirement.
 */
function cargarGIS(): Promise<void> {
  if (gisLoaded) return Promise.resolve();
  if (gisLoading) {
    return new Promise((resolve, reject) => {
      gisCallbacks.push(() => resolve());
      gisErrorCallbacks.push((e) => reject(e));
    });
  }
  gisLoading = true;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      gisLoading = false;
      resolve();
      gisCallbacks.forEach((cb) => cb());
      gisCallbacks = [];
      gisErrorCallbacks = [];
    };
    script.onerror = () => {
      gisLoading = false;
      const err = new Error("No se pudo cargar Google Identity Services. Verificá tu conexión e intentá de nuevo.");
      reject(err);
      gisErrorCallbacks.forEach((cb) => cb(err));
      gisCallbacks = [];
      gisErrorCallbacks = [];
    };
    document.head.appendChild(script);
  });
}

export function estaAutenticado(): boolean {
  if (!tokenInfo) return false;
  return Date.now() < tokenInfo.expiresAt - 30_000;
}

export function obtenerTokenGoogle(): string | null {
  if (!estaAutenticado()) return null;
  return tokenInfo!.accessToken;
}

export function msHastaExpiracion(): number {
  if (!tokenInfo) return 0;
  return Math.max(0, tokenInfo.expiresAt - 30_000 - Date.now());
}

export function desconectarGoogle(): void {
  tokenInfo = null;
}

export function iniciarAuthGoogle(): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    return Promise.reject(new Error("VITE_GOOGLE_CLIENT_ID no está configurado"));
  }

  return cargarGIS().then(() => {
    return new Promise<string>((resolve, reject) => {
      if (!window.google) {
        reject(new Error("Google Identity Services no disponible"));
        return;
      }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp) => {
          if (resp.error || !resp.access_token) {
            reject(new Error(resp.error ?? "Error al obtener token de Google"));
            return;
          }
          const expiresIn = resp.expires_in ?? 3600;
          tokenInfo = {
            accessToken: resp.access_token,
            expiresAt: Date.now() + expiresIn * 1000,
          };
          resolve(resp.access_token);
        },
      });
      client.requestAccessToken();
    });
  });
}
