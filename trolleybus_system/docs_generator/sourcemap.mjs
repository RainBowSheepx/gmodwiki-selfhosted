// Maps documented functions to their definition site in the addon sources
// (repo-relative file path + start/end lines) for the wiki's <file> tag,
// which renders as the "View Source" button.
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { resolveAddonRoot } from "./addon_sources.mjs";

const ROOT = await resolveAddonRoot();

// display name used as the function parent in the docs -> systems/ dir
const SYSTEM_DIRS = {
  AccumulatorBattery: "accumulatorbattery",
  "Agit-132": "agit_132",
  Buzzer: "buzzer",
  Engine: "engine",
  Handbrake: "handbrake",
  Heater: "heater",
  Horn: "horn",
  HydraulicBooster: "hydraulic_booster",
  InteriorHeater: "interior_heater",
  "IR-2002": "ir_2002",
  MotorVentilator: "motor_ventilator",
  MultiScreen: "multiscreen",
  Nameplates: "nameplates",
  Pneumatic: "pneumatic",
  Reductor: "reductor",
  RKSU: "rksu",
  StaticVoltageConverter: "staticvoltageconverter",
  TISU: "tisu",
  TRSU: "trsu",
};

/* ---------------- source sanitizer ---------------- */

// Blanks out comments and string literals (preserving line structure) so the
// definition regexes and the block-depth walker never trip on their contents.
function sanitize(text) {
  const out = [];
  let i = 0;
  const n = text.length;
  let state = "code"; // code | line-comment | block-comment | string | longstring
  let quote = "";
  let level = 0; // = count of long brackets

  const longOpen = (at) => {
    // [[ or [=*[ starting at `at`; returns the level or -1
    if (text[at] !== "[") return -1;
    let j = at + 1;
    while (text[j] === "=") j++;
    return text[j] === "[" ? j - at - 1 : -1;
  };

  while (i < n) {
    const c = text[i];
    if (c === "\n") {
      if (state === "line-comment") state = "code";
      out.push("\n");
      i++;
      continue;
    }

    switch (state) {
      case "code":
        if (c === "-" && text[i + 1] === "-") {
          const lvl = longOpen(i + 2);
          if (lvl >= 0) {
            state = "block-comment";
            level = lvl;
            i += 4 + lvl;
          } else {
            state = "line-comment";
            i += 2;
          }
          out.push(" ");
          break;
        }
        if (c === '"' || c === "'") {
          state = "string";
          quote = c;
          out.push(" ");
          i++;
          break;
        }
        {
          const lvl = longOpen(i);
          if (lvl >= 0) {
            state = "longstring";
            level = lvl;
            out.push(" ");
            i += 2 + lvl;
            break;
          }
        }
        out.push(c);
        i++;
        break;

      case "line-comment":
        i++;
        break;

      case "block-comment":
      case "longstring":
        if (c === "]") {
          let j = i + 1;
          while (text[j] === "=") j++;
          if (text[j] === "]" && j - i - 1 === level) {
            state = "code";
            i = j + 1;
            break;
          }
        }
        i++;
        break;

      case "string":
        if (c === "\\") i += 2;
        else if (c === quote) {
          state = "code";
          i++;
        } else i++;
        break;
    }
  }
  return out.join("").split("\n");
}

/* ---------------- block-depth walker ---------------- */

// `for`/`while` are neutral: their mandatory `do` carries the +1.
const KEYWORD_RE = /\b(function|elseif|repeat|until|end|do|if)\b/g;
const DELTA = { function: 1, do: 1, if: 1, repeat: 1, end: -1, until: -1, elseif: 0 };

/** End line (1-based) of the function whose `function` keyword sits at lines[startIdx] (0-based), col `col`. */
function findEnd(lines, startIdx, col) {
  let depth = 0;
  for (let li = startIdx; li < lines.length; li++) {
    const line = li === startIdx ? lines[li].slice(col) : lines[li];
    KEYWORD_RE.lastIndex = 0;
    let m;
    while ((m = KEYWORD_RE.exec(line))) {
      depth += DELTA[m[1]];
      if (depth === 0) return li + 1;
    }
  }
  return startIdx + 1; // unbalanced source; fall back to a one-line range
}

/* ---------------- indexer ---------------- */

// key -> [{file, start, end, base}] where key is either the full dotted name
// ("Trolleybus_System.GetSetting"), "sys|<dir>|<method>" or "ent|<class>|<method>"
const index = new Map();

const FILE_PRIORITY = { "shared.lua": 0, "init.lua": 1, "cl_init.lua": 2 };

function record(key, file, start, end, base) {
  let list = index.get(key);
  if (!list) index.set(key, (list = []));
  list.push({ file, start, end, base });
}

const DEF_RE = /(?:^|[\s(])function\s+([A-Za-z_][\w.]*)([.:])([A-Za-z_]\w*)\s*\(/g;
const ASSIGN_RE = /(?:^|\s)([A-Za-z_][\w.]*)\.([A-Za-z_]\w*)\s*=\s*(function)\s*\(/g;
const ALIAS_RE = /^\s*local\s+([A-Za-z_]\w*)\s*=\s*(Trolleybus_System(?:\.[A-Za-z_]\w*)*)\s*$/;

function indexFile(abs, rel) {
  const lines = sanitize(readFileSync(abs, "utf8"));
  const base = rel.split("/").pop();

  // local aliases of Trolleybus_System tables (e.g. `local System = Trolleybus_System.NetworkSystem`)
  const aliases = new Map();
  for (const line of lines) {
    const m = ALIAS_RE.exec(line);
    if (m) aliases.set(m[1], m[2]);
  }
  const expand = (head) => {
    const dot = head.indexOf(".");
    const first = dot === -1 ? head : head.slice(0, dot);
    const rest = dot === -1 ? "" : head.slice(dot);
    return (aliases.get(first) ?? first) + rest;
  };

  const sysDir = /^lua\/trolleybus_system\/systems\/([^/]+)\//.exec(rel)?.[1];
  const entCls = /^lua\/entities\/([^/]+)\//.exec(rel)?.[1] ?? /^lua\/entities\/([^/.]+)\.lua$/.exec(rel)?.[1];

  const addDef = (head, sep, name, li, col) => {
    const end = findEnd(lines, li, col);
    const start = li + 1;
    if (sep === ":") {
      if (head === "SYSTEM" && sysDir) record(`sys|${sysDir}|${name}`, rel, start, end, base);
      else if (head === "ENT" && entCls) record(`ent|${entCls}|${name}`, rel, start, end, base);
      else record(`${expand(head)}:${name}`, rel, start, end, base);
    } else {
      const full = expand(head);
      if (full.startsWith("Trolleybus_System")) record(`${full}.${name}`, rel, start, end, base);
    }
  };

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let m;
    DEF_RE.lastIndex = 0;
    while ((m = DEF_RE.exec(line))) addDef(m[1], m[2], m[3], li, line.indexOf("function", m.index));
    ASSIGN_RE.lastIndex = 0;
    while ((m = ASSIGN_RE.exec(line))) addDef(m[1], ".", m[2], li, line.lastIndexOf("function", ASSIGN_RE.lastIndex));
  }
}

function walk(dir, rel) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) walk(join(dir, d.name), r);
    else if (d.name.endsWith(".lua")) indexFile(join(dir, d.name), r);
  }
}
walk(join(ROOT, "lua"), "lua");

/* ---------------- resolution ---------------- */

function best(key) {
  const list = index.get(key);
  if (!list) return null;
  return [...list].sort(
    (a, b) => (FILE_PRIORITY[a.base] ?? 3) - (FILE_PRIORITY[b.base] ?? 3) || a.file.localeCompare(b.file) || a.start - b.start
  )[0];
}

// The Trolleybus doc class is the shared bus entity: prefer the base class,
// then the base trailer, then any concrete bus that defines the method.
function trolleybusMethod(name) {
  const direct = best(`ent|trolleybus_ent_base|${name}`) ?? best(`ent|trolleybus_ent_base_trailer|${name}`);
  if (direct) return direct;
  const candidates = [...index.keys()]
    .filter((k) => k.startsWith("ent|trolleybus_ent_") && k.endsWith(`|${name}`))
    .sort();
  return candidates.length ? best(candidates[0]) : null;
}

const FUNC_ATTRS_RE = /<function\s+([^>]*)>/;

/**
 * Source location for a generated function page, or null.
 * @param page {{address: string, markup: string}}
 * @returns {{file: string, start: number, end: number} | null}
 */
export function resolveSource(page) {
  const attrsStr = FUNC_ATTRS_RE.exec(page.markup)?.[1];
  if (!attrsStr) return null;
  const attr = (n) => new RegExp(`${n}="([^"]*)"`).exec(attrsStr)?.[1];

  const name = attr("name");
  const parent = attr("parent");
  const type = attr("type") ?? "libraryfunc";
  if (!name || !parent || type === "hook") return null;

  let hit = null;
  if (parent === "Trolleybus") hit = trolleybusMethod(name);
  else if (SYSTEM_DIRS[parent]) hit = best(`sys|${SYSTEM_DIRS[parent]}|${name}`);
  else if (/^[a-z]/.test(parent)) hit = best(`ent|${parent}|${name}`);
  else hit = best(`${parent}.${name}`) ?? best(`${parent}:${name}`);

  return hit ? { file: hit.file, start: hit.start, end: hit.end } : null;
}
