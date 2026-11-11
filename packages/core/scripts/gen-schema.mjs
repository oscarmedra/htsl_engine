// Regenerate the JSON object schema (E3) from the live registry.
// Run with: node packages/core/scripts/gen-schema.mjs  (after building core)
import { objectsSchema } from "../dist/index.js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "schema", "htsl-objects.schema.json");
const data = { generated: new Date().toISOString().slice(0, 10), count: objectsSchema().length, objects: objectsSchema() };
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`wrote ${out} (${data.count} entries)`);
