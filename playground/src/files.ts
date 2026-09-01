/**
 * Open a single `.htsl` file into the editor and save it back — designed to work
 * in EVERY browser, Brave included.
 *
 * Opening: use the File System Access picker when available (Chrome/Edge) so we
 * get a handle for seamless write-back; otherwise fall back to a classic
 * `<input type="file">` (Brave/Firefox/Safari). Saving: write back through the
 * handle when we have one, else download the file. No server, no token.
 *
 * The File System Access types are uneven across TS lib versions, so the API
 * boundary uses light `any` casts.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface OpenedFile {
  text: string;
  name: string;
  /** Present only when opened via the File System Access API (write-back capable). */
  handle: any | null;
}

/**
 * Ask the user for a `.htsl` file. Prefers the FS Access picker (write-back), and
 * falls back to a classic file input if it's absent OR blocked (e.g. Brave).
 * Resolves null if the user cancels.
 */
export async function openFilePicker(): Promise<OpenedFile | null> {
  const picker = (window as any).showOpenFilePicker;
  if (typeof picker === "function") {
    try {
      const [handle] = await picker({
        types: [{ description: "HTSL", accept: { "text/plain": [".htsl", ".txt"] } }],
      });
      const file = await handle.getFile();
      return { text: await file.text(), name: handle.name, handle };
    } catch (e: any) {
      if (e && e.name === "AbortError") return null; // user cancelled
      // otherwise the API is blocked (Brave) → fall through to the classic input
    }
  }
  return openViaInput();
}

function openViaInput(): Promise<OpenedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".htsl,.txt,text/plain";
    input.style.display = "none";
    input.addEventListener("change", async () => {
      const f = input.files && input.files[0];
      input.remove();
      resolve(f ? { text: await f.text(), name: f.name, handle: null } : null);
    });
    document.body.appendChild(input);
    input.click();
  });
}

/** Whether a file opened via `openFilePicker` can be written back in place. */
export function canWriteBack(handle: any): boolean {
  return !!handle && typeof handle.createWritable === "function";
}

export async function writeBack(handle: any, text: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

/** Save `text` as a download named `name` (the universal fallback, incl. Brave). */
export function downloadText(name: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name && name.trim() ? name : "document.htsl";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
