import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compile } from "../src/index.js";
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "demo-geometry.htsl"), "utf8");
console.log(compile(src, { prettyPrint: true }));
