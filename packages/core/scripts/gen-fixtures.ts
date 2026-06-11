import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compile } from "../src/index.js";

const dir = "tests/fixtures";
const write = process.argv.includes("--write");

for (const f of readdirSync(dir).filter((x) => x.endsWith(".htsl"))) {
  const src = readFileSync(join(dir, f), "utf8");
  const html = compile(src, { prettyPrint: true });
  const out = join(dir, f.replace(/\.htsl$/, ".html"));
  if (write) {
    writeFileSync(out, html + "\n");
    console.log("wrote " + out);
  } else {
    console.log("===== " + f + " =====");
    console.log(html);
    console.log("----- end -----\n");
  }
}
