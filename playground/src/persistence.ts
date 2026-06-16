/**
 * Client-only persistence & sharing (no server).
 *
 *  - **Auto-save**: the current document is kept in `localStorage`, so a refresh
 *    never loses work.
 *  - **Share link**: the whole document is encoded in the URL. It is **gzip
 *    compressed** (`#z=`) so much larger documents fit; a legacy uncompressed
 *    form (`#s=`) is still decoded for old links.
 */

const STORAGE_KEY = "htsl:doc";

export function saveLocal(src: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, src);
  } catch {
    /* quota exceeded / private mode → ignore */
  }
}

export function loadLocal(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* UI preferences (panel visibility)                                          */
/* -------------------------------------------------------------------------- */

/** Persist a boolean UI flag (e.g. a panel toggle) so it survives a refresh. */
export function saveFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(`htsl:ui:${key}`, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Read a persisted UI flag, or `null` if it was never set (→ use the default). */
export function loadFlag(key: string): boolean | null {
  try {
    const v = localStorage.getItem(`htsl:ui:${key}`);
    return v === null ? null : v === "1";
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* URL hash (compressed) encoding                                             */
/* -------------------------------------------------------------------------- */

const hasCompression =
  typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function gzip(str: string): Promise<Uint8Array> {
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  void writer.write(new TextEncoder().encode(str) as BufferSource);
  void writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  void writer.write(bytes as BufferSource);
  void writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new TextDecoder().decode(buf);
}

/** Build a shareable URL for `src` (gzip `#z=`, or legacy `#s=` if unsupported). */
export async function buildShareUrl(src: string): Promise<string> {
  const base = location.origin + location.pathname;
  if (hasCompression) {
    return `${base}#z=${b64urlEncode(await gzip(src))}`;
  }
  return `${base}#s=${btoa(encodeURIComponent(src))}`;
}

/** Decode the legacy uncompressed `#s=` hash synchronously (else null). */
export function decodeLegacyHash(hash: string): string | null {
  const m = /^#s=(.*)$/.exec(hash);
  if (!m) return null;
  try {
    return decodeURIComponent(atob(m[1]!));
  } catch {
    return null;
  }
}

/** True if the URL carries a compressed `#z=` document (decoded async). */
export function hasCompressedHash(hash: string): boolean {
  return /^#z=/.test(hash);
}

/** Decode the compressed `#z=` hash (async; null if absent/invalid). */
export async function decodeCompressedHash(hash: string): Promise<string | null> {
  const m = /^#z=(.*)$/.exec(hash);
  if (!m || !hasCompression) return null;
  try {
    return await gunzip(b64urlDecode(m[1]!));
  } catch {
    return null;
  }
}
