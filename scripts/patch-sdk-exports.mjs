// Patches @modelcontextprotocol/sdk package.json to export ./server/streamableHttp
// Required because the SDK's wildcard export (./* -> ./dist/cjs/*) breaks
// when requiring subpaths directly, causing a double-path resolution bug.

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sdkPkgPath = path.resolve(__dirname, "../node_modules/@modelcontextprotocol/sdk/package.json");
const pkg = JSON.parse(fs.readFileSync(sdkPkgPath, "utf-8"));

const exportKey = "./server/streamableHttp";

if (!pkg.exports[exportKey]) {
  pkg.exports[exportKey] = {
    types: "./dist/esm/server/streamableHttp.d.ts",
    import: "./dist/esm/server/streamableHttp.js",
    require: "./dist/cjs/server/streamableHttp.js",
  };
  fs.writeFileSync(sdkPkgPath, JSON.stringify(pkg, null, 4) + "\n");
  console.log(`Added '${exportKey}' to @modelcontextprotocol/sdk exports`);
} else {
  console.log(`'${exportKey}' already present in @modelcontextprotocol/sdk exports`);
}
