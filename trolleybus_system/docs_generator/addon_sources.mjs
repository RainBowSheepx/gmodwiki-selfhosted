// Locates the Trolleybus System addon sources for the docs generator.
// Resolution order:
//   1. TROLLEYBUS_SRC env var — explicit path to an addon checkout (must contain lua/)
//   2. trolleybus_system/Garry-s-Mod-Trolleybus-System-master next to this generator
//   3. otherwise the GitHub master archive is downloaded and unpacked into (2)
// The addon itself is © its author and stays out of git (see .gitignore).
import { existsSync, mkdirSync, writeFileSync, renameSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { gunzipSync } from "zlib";

const REPO_TARBALL = "https://github.com/ShadowBonnieRUS/Garry-s-Mod-Trolleybus-System/archive/refs/heads/master.tar.gz";
const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(HERE, "..", "Garry-s-Mod-Trolleybus-System-master");

export async function resolveAddonRoot() {
  const override = process.env.TROLLEYBUS_SRC;
  if (override) {
    if (!existsSync(join(override, "lua"))) {
      throw new Error(`TROLLEYBUS_SRC does not look like the addon root (no lua/ inside): ${override}`);
    }
    return override;
  }

  if (existsSync(join(DEFAULT_ROOT, "lua"))) return DEFAULT_ROOT;

  console.log(`addon sources not found locally — downloading ${REPO_TARBALL}`);
  const res = await fetch(REPO_TARBALL);
  if (!res.ok) throw new Error(`addon download failed: HTTP ${res.status}`);
  const tar = gunzipSync(Buffer.from(await res.arrayBuffer()));

  // extract into a temp dir first so an interrupted run never leaves a
  // half-unpacked tree that would pass the existsSync check above
  const tmp = DEFAULT_ROOT + ".tmp";
  rmSync(tmp, { recursive: true, force: true });
  untar(tar, tmp);
  if (!existsSync(join(tmp, "lua"))) throw new Error("unexpected archive layout: no lua/ directory inside");
  rmSync(DEFAULT_ROOT, { recursive: true, force: true });
  renameSync(tmp, DEFAULT_ROOT);
  console.log(`addon sources unpacked into ${DEFAULT_ROOT}`);
  return DEFAULT_ROOT;
}

/** Minimal ustar/pax extractor (regular files + dirs), stripping the archive's root directory. */
function untar(buf, dest) {
  let off = 0;
  let gnuLongName = null;
  let paxPath = null;

  while (off + 512 <= buf.length) {
    const block = buf.subarray(off, off + 512);
    if (block.every((b) => b === 0)) break; // end-of-archive marker

    const str = (start, len) => {
      const raw = block.subarray(start, start + len);
      const nul = raw.indexOf(0);
      return raw.subarray(0, nul === -1 ? len : nul).toString("utf8");
    };
    let name = str(0, 100);
    const size = parseInt(str(124, 12).trim() || "0", 8);
    const type = String.fromCharCode(block[156] || 0x30);
    const prefix = str(345, 155);
    const data = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;

    if (type === "L") { // GNU long name: applies to the next entry
      gnuLongName = data.toString("utf8").replace(/\0+$/, "");
      continue;
    }
    if (type === "x") { // pax extended header: may carry a long path
      const m = /(?:^|\n)\d+ path=([^\n]+)\n/.exec(data.toString("utf8"));
      if (m) paxPath = m[1];
      continue;
    }
    if (type === "g") continue; // pax global header

    if (gnuLongName) name = gnuLongName;
    else if (paxPath) name = paxPath;
    else if (prefix) name = prefix + "/" + name;
    gnuLongName = null;
    paxPath = null;

    const parts = name.split("/").filter((p) => p && p !== ".");
    if (parts.some((p) => p === "..")) continue; // path traversal guard
    parts.shift(); // drop "<repo>-master/"
    if (parts.length === 0) continue;
    const target = join(dest, ...parts);

    if (type === "5") {
      mkdirSync(target, { recursive: true });
    } else if (type === "0" || type === "\0") {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, data);
    } // links/devices etc. are skipped
  }
}
