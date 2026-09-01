/**
 * Local-folder editing via the File System Access API — open a clone of your
 * `.htsl` repo, read/edit/create files directly on disk, then commit with git.
 * No server, no token, works with private repos. Chromium only (feature-detected;
 * the caller falls back to import/download elsewhere).
 *
 * The types for this API are still uneven across TS lib versions, so this module
 * uses light `any` casts at the boundary rather than shipping a full d.ts.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type DirHandle = any; // FileSystemDirectoryHandle
type FileHandle = any; // FileSystemFileHandle

export interface HtslEntry {
  path: string; // relative to the opened folder, e.g. "cours/matrices.htsl"
  handle: FileHandle;
}

/** True when the browser supports opening a folder (Chromium). */
export function fsSupported(): boolean {
  return typeof (window as any).showDirectoryPicker === "function";
}

/** Prompt the user to choose a folder. Returns null if they cancel. */
export async function pickFolder(): Promise<DirHandle | null> {
  try {
    return await (window as any).showDirectoryPicker({ mode: "readwrite" });
  } catch {
    return null; // user dismissed the picker
  }
}

/** Ensure read/write permission on a handle (re-prompts if needed). */
export async function ensurePermission(handle: any, mode: "read" | "readwrite" = "readwrite"): Promise<boolean> {
  try {
    const opts = { mode };
    if ((await handle.queryPermission(opts)) === "granted") return true;
    return (await handle.requestPermission(opts)) === "granted";
  } catch {
    return false;
  }
}

const SKIP_DIRS = new Set([".git", "node_modules", "dist", ".cache"]);

/** Recursively collect every `.htsl` file, sorted by relative path. */
export async function listHtsl(dir: DirHandle, prefix = ""): Promise<HtslEntry[]> {
  const out: HtslEntry[] = [];
  for await (const entry of (dir as any).values()) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === "file" && entry.name.toLowerCase().endsWith(".htsl")) {
      out.push({ path: rel, handle: entry });
    } else if (entry.kind === "directory" && !entry.name.startsWith(".") && !SKIP_DIRS.has(entry.name)) {
      out.push(...(await listHtsl(entry, rel)));
    }
  }
  out.sort((a, b) => a.path.localeCompare(b.path, "fr"));
  return out;
}

export async function readFile(handle: FileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeFile(handle: FileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

/** Create (or open) a `.htsl` file under `dir`, supporting `sub/dir/name.htsl`. */
export async function createFile(dir: DirHandle, relPath: string): Promise<FileHandle> {
  const clean = relPath.trim().replace(/^\/+/, "");
  const name = clean.toLowerCase().endsWith(".htsl") ? clean : `${clean}.htsl`;
  const parts = name.split("/").filter(Boolean);
  let d = dir;
  for (let i = 0; i < parts.length - 1; i++) d = await d.getDirectoryHandle(parts[i]!, { create: true });
  return d.getFileHandle(parts[parts.length - 1]!, { create: true });
}

/* --- Persist the chosen folder so we can offer to reopen it after a reload --- */

const DB_NAME = "htsl-fs";
const STORE = "handles";
const KEY = "lastDir";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function rememberFolder(handle: DirHandle): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(handle, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* storage unavailable — reopen-on-reload just won't be offered */
  }
}

export async function lastFolder(): Promise<DirHandle | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
