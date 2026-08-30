// Extracts SYSTEM:/ENT: method signatures (name, args, realm) from the addon
// sources into signatures.json for the docs generator.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { resolveAddonRoot } from "./addon_sources.mjs";

const ROOT = join(await resolveAddonRoot(), "lua");

const FILE_REALM = { "init.lua": "Server", "cl_init.lua": "Client", "shared.lua": "Shared" };

function extract(dir, pattern) {
  // methodName -> { args, realms: Set }
  const methods = new Map();

  for (const [file, realm] of Object.entries(FILE_REALM)) {
    const path = join(dir, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");

    for (const m of text.matchAll(pattern)) {
      const name = m[1];
      const args = m[2].trim();
      const cur = methods.get(name) ?? { args, realms: new Set() };
      if (args.length > (cur.args ?? "").length) cur.args = args; // prefer the fuller signature
      cur.realms.add(realm);
      methods.set(name, cur);
    }
  }

  const out = {};
  for (const [name, v] of [...methods.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    let realm;
    if (v.realms.has("Shared") || (v.realms.has("Server") && v.realms.has("Client"))) realm = "Shared";
    else realm = v.realms.has("Server") ? "Server" : "Client";
    out[name] = { args: v.args, realm };
  }
  return out;
}

const SYS_RE = /^function SYSTEM:(\w+)\(([^)]*)\)/gm;
const ENT_RE = /^function ENT:(\w+)\(([^)]*)\)/gm;

const result = { systems: {}, entities: {} };

const sysDir = join(ROOT, "trolleybus_system/systems");
for (const d of readdirSync(sysDir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  result.systems[d.name] = extract(join(sysDir, d.name), SYS_RE);
}

for (const ent of ["trolleybus_stop", "trolleybus_trafficlight", "trolleybus_traffic_car", "trolleybus_polecatcher", "trolleybus_wheel"]) {
  result.entities[ent] = extract(join(ROOT, "entities", ent), ENT_RE);
}

writeFileSync(new URL("signatures.json", import.meta.url), JSON.stringify(result, null, 1));

let sysCount = 0;
for (const s of Object.values(result.systems)) sysCount += Object.keys(s).length;
let entCount = 0;
for (const e of Object.values(result.entities)) entCount += Object.keys(e).length;
console.log(`systems: ${Object.keys(result.systems).length} dirs, ${sysCount} methods; entities: ${entCount} methods`);
for (const [ent, ms] of Object.entries(result.entities)) console.log(` ${ent}: ${Object.keys(ms).join(", ")}`);
