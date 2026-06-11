/**
 * Demo script: reads demo.htsl, compiles it and prints the resulting HTML.
 * Run with: npm run demo
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compile } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "..", "demo.htsl"), "utf8");

console.log("=== Source HTSL ===\n");
console.log(source);
console.log("=== HTML généré ===\n");
console.log(compile(source, { prettyPrint: true }));
