/**
 * Exports custom pages in the wiki.json format that the vscode-glua-enhanced
 * editor plugin consumes (GLOBALS/CLASSES/LIBRARIES/HOOKS buckets), so the
 * plugin can offer autocomplete/hover/signatures for everything documented on
 * this wiki (e.g. the Trolleybus System addon).
 *
 * Served by /gluadump.json; rebuilt only when the custom-pages set changes.
 */

import { customPagesVersion, listCustomPagesWithMarkup } from "./db.js";

interface DumpArg {
  NAME: string;
  TYPE: string;
  DESCRIPTION?: string;
  DEFAULT?: string;
}

interface DumpEntry {
  SEARCH: string;
  LINK: string;
  DESCRIPTION?: string;
  FUNCTION?: boolean;
  EVENT?: boolean;
  METHOD?: boolean;
  CLIENT?: boolean;
  SERVER?: boolean;
  MENU?: boolean;
  ARGUMENTS?: DumpArg[];
  RETURNS?: { TYPE: string; NAME?: string; DESCRIPTION?: string }[];
  NOTES?: string[];
  WARNINGS?: string[];
  BUGS?: { ISSUE?: string; DESCRIPTION?: string }[];
  DEPRECATED?: boolean;
  INTERNAL?: boolean;
  MEMBERS?: Record<string, any>;
}

export interface GluaDump {
  version: string;
  wiki: {
    GLOBALS: Record<string, DumpEntry>;
    CLASSES: Record<string, DumpEntry>;
    LIBRARIES: Record<string, DumpEntry>;
    HOOKS: Record<string, DumpEntry>;
    PANELS: Record<string, DumpEntry & { PARENT?: string }>;
  };
}

/* ------------- minimal wikitext parsing (same grammar as the renderer) ------------- */

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_][\w-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrString))) attrs[m[1].toLowerCase()] = m[2];
  return attrs;
}

function firstTag(text: string, tag: string): { attrs: Record<string, string>; inner: string } | null {
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "i");
  const m = text.match(re);
  return m ? { attrs: parseAttrs(m[1]), inner: m[2] } : null;
}

function parseArgLike(inner: string, tag: string): { name: string; type: string; default?: string; desc: string }[] {
  const out: { name: string; type: string; default?: string; desc: string }[] = [];
  const re = new RegExp(`<${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${tag}>)`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    const attrs = parseAttrs(m[1]);
    out.push({ name: attrs.name ?? "", type: attrs.type ?? "any", default: attrs.default, desc: (m[2] ?? "").trim() });
  }
  return out;
}

/** Wiki inline markup -> markdown the plugin can render in hovers. */
function toMarkdown(text: string, origin: string): string {
  return text
    .replace(/<page\b([^>]*)>([\s\S]*?)<\/page>/gi, (_m, attrString, inner) => {
      const attrs = parseAttrs(attrString);
      const address = inner.trim();
      return `[${attrs.text ?? address}](${origin}/${address})`;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface ParsedDescription {
  description: string;
  notes: string[];
  warnings: string[];
  bugs: { ISSUE?: string; DESCRIPTION?: string }[];
  deprecated: boolean;
  internal: boolean;
}

function parseDescription(inner: string, origin: string): ParsedDescription {
  const notes: string[] = [];
  const warnings: string[] = [];
  const bugs: { ISSUE?: string; DESCRIPTION?: string }[] = [];
  let deprecated = false;
  let internal = false;

  let text = inner;
  text = text.replace(/<note\b[^>]*>([\s\S]*?)<\/note>/gi, (_m, t) => {
    notes.push(toMarkdown(t.trim(), origin));
    return "";
  });
  text = text.replace(/<warning\b[^>]*>([\s\S]*?)<\/warning>/gi, (_m, t) => {
    warnings.push(toMarkdown(t.trim(), origin));
    return "";
  });
  text = text.replace(/<bug\b([^>]*)>([\s\S]*?)<\/bug>/gi, (_m, attrString, t) => {
    const attrs = parseAttrs(attrString);
    bugs.push({ ISSUE: attrs.issue, DESCRIPTION: toMarkdown(t.trim(), origin) });
    return "";
  });
  text = text.replace(/<deprecated\b[^>]*>([\s\S]*?)<\/deprecated>|<deprecated\b[^>]*\/>/gi, (_m, t) => {
    deprecated = true;
    return t ? t : "";
  });
  text = text.replace(/<internal\b[^>]*>([\s\S]*?)<\/internal>|<internal\b[^>]*\/>/gi, (_m, t) => {
    internal = true;
    return t ? t : "";
  });

  return { description: toMarkdown(text, origin), notes, warnings, bugs, deprecated, internal };
}

function parseRealms(realmText: string): { CLIENT?: boolean; SERVER?: boolean; MENU?: boolean } {
  const t = realmText.toLowerCase();
  const out: { CLIENT?: boolean; SERVER?: boolean; MENU?: boolean } = {};
  if (t.includes("shared") || t.includes("client")) out.CLIENT = true;
  if (t.includes("shared") || t.includes("server")) out.SERVER = true;
  if (t.includes("menu")) out.MENU = true;
  return out;
}

/* ---------------------------- dump building ---------------------------- */

const HOOK_FAMILY = "TROLLEYBUS";

// Bump whenever the dump STRUCTURE changes (new fields, different shapes):
// it is part of the version string, so plugins refetch even though the pages
// themselves did not change.
const DUMP_FORMAT = 2;

export async function dumpVersion(): Promise<string> {
  return `${DUMP_FORMAT}:${await customPagesVersion()}`;
}

function buildEntry(
  page: { address: string; markup: string },
  fn: { attrs: Record<string, string>; inner: string },
  origin: string,
): { entry: DumpEntry; name: string; parent: string; type: string } {
  const attrs = fn.attrs;
  const name = attrs.name ?? page.address;
  const parent = attrs.parent ?? "";
  const type = (attrs.type ?? "libraryfunc").toLowerCase();

  const descTag = firstTag(fn.inner, "description");
  const parsed = parseDescription(descTag?.inner ?? "", origin);
  const realms = parseRealms(firstTag(fn.inner, "realm")?.inner ?? "Shared");

  const argsInner = firstTag(fn.inner, "args")?.inner ?? "";
  const retsInner = firstTag(fn.inner, "rets")?.inner ?? "";

  const separator = type === "classfunc" || type === "hook" || type === "panelfunc" ? ":" : ".";
  const search = type === "hook" || !parent || parent === "Global" ? name : `${parent}${separator}${name}`;

  const entry: DumpEntry = {
    SEARCH: search,
    LINK: `${origin}/${page.address}`,
    ...realms,
  };
  if (type === "hook") entry.EVENT = true;
  else entry.FUNCTION = true;

  if (parsed.description) entry.DESCRIPTION = parsed.description;
  if (parsed.notes.length) entry.NOTES = parsed.notes;
  if (parsed.warnings.length) entry.WARNINGS = parsed.warnings;
  if (parsed.bugs.length) entry.BUGS = parsed.bugs;
  if (parsed.deprecated) entry.DEPRECATED = true;
  if (parsed.internal) entry.INTERNAL = true;

  const args = parseArgLike(argsInner, "arg");
  if (args.length) {
    entry.ARGUMENTS = args.map((a) => {
      const arg: DumpArg = { NAME: a.name || "arg", TYPE: a.type };
      if (a.desc) arg.DESCRIPTION = toMarkdown(a.desc, origin);
      if (a.default !== undefined) arg.DEFAULT = a.default;
      return arg;
    });
  }

  const rets = parseArgLike(retsInner, "ret");
  if (rets.length) {
    entry.RETURNS = rets.map((r) => ({
      TYPE: r.type,
      ...(r.name ? { NAME: r.name } : {}),
      ...(r.desc ? { DESCRIPTION: toMarkdown(r.desc, origin) } : {}),
    }));
  }

  return { entry, name, parent, type };
}

/** Container for a library path like "Trolleybus_System.ContactNetwork". */
function libraryContainer(root: Record<string, DumpEntry>, path: string, origin: string): DumpEntry {
  const parts = path.split(".");
  let members = root;
  let node: DumpEntry | undefined;
  let walked = "";

  for (const part of parts) {
    walked = walked ? `${walked}.${part}` : part;
    if (!members[part]) {
      members[part] = { SEARCH: walked, LINK: `${origin}/${walked}`, MEMBERS: {} };
    }
    node = members[part];
    if (!node.MEMBERS) node.MEMBERS = {};
    members = node.MEMBERS;
  }

  return node!;
}

export async function buildGluaDump(origin: string): Promise<GluaDump> {
  const pages = await listCustomPagesWithMarkup();
  const version = await dumpVersion();

  const wiki: GluaDump["wiki"] = { GLOBALS: {}, CLASSES: {}, LIBRARIES: {}, HOOKS: {}, PANELS: {} };
  const classPages = new Map<string, { address: string; description: string }>();

  // First pass: remember non-function pages so classes/libraries can get
  // descriptions and links from their own pages (e.g. /Trolleybus, /Systems/TISU,
  // /Trolleybus_System.ContactNetwork). Indexed by full address and leaf name.
  // Pages with a <panel> block additionally declare a GUI element.
  for (const page of pages) {
    if (!/<function\b/i.test(page.markup)) {
      const info = { address: page.address, description: page.description };
      classPages.set(page.address.toLowerCase(), info);
      const leaf = page.address.split("/").pop() ?? page.address;
      if (!classPages.has(leaf.toLowerCase())) classPages.set(leaf.toLowerCase(), info);
    }

    const panelMatch = page.markup.match(/<panel\b([^>]*)>([\s\S]*?)<\/panel>/i);
    if (panelMatch) {
      const attrs = parseAttrs(panelMatch[1]);
      const inner = panelMatch[2];
      const name = (attrs.name ?? page.address.split("/").pop() ?? page.address).trim();
      const parent = firstTag(inner, "parent")?.inner.trim();
      const descTag = firstTag(inner, "description");
      const realms = parseRealms(firstTag(inner, "realm")?.inner ?? "Client");

      wiki.PANELS[name] = {
        SEARCH: name,
        LINK: `${origin}/${page.address}`,
        ...realms,
        ...(parent ? { PARENT: parent } : {}),
        DESCRIPTION: descTag ? toMarkdown(descTag.inner.trim(), origin) : page.description,
        MEMBERS: {},
      };
    }
  }

  for (const page of pages) {
    const m = page.markup.match(/<function\b([^>]*)>([\s\S]*?)<\/function>/i);
    if (!m) continue;

    const { entry, name, parent, type } = buildEntry(
      page,
      { attrs: parseAttrs(m[1]), inner: m[2] },
      origin,
    );

    if (type === "hook") {
      if (!wiki.HOOKS[HOOK_FAMILY]) {
        wiki.HOOKS[HOOK_FAMILY] = {
          SEARCH: HOOK_FAMILY,
          LINK: `${origin}/Trolleybus_System_Hooks`,
          DESCRIPTION: "Custom wiki hooks",
          // These are hook.Add-able events (unlike ENT:/WEAPON: overrides), so
          // the editor plugin includes them in hook.Add completions.
          HOOK_ADD: true,
          // The addon fires them through wrappers that prepend the prefix
          // (and, for change events, append the suffix); the plugin uses this
          // to complete the un-prefixed event names inside those calls.
          EVENT_PREFIX: "TrolleybusSystem_",
          CHANGE_SUFFIX: "Changed",
          RUN_EVENT_FUNCS: ["Trolleybus_System.RunEvent"],
          RUN_CHANGE_EVENT_FUNCS: ["Trolleybus_System.RunChangeEvent"],
          MEMBERS: {},
        } as any;
      }
      wiki.HOOKS[HOOK_FAMILY].MEMBERS![name] = entry;
    } else if (type === "panelfunc") {
      if (!parent) continue;
      // Panel methods live in the PANELS bucket so vgui.Create and panel
      // method resolution in the editor plugin can see them
      if (!wiki.PANELS[parent]) {
        const info = classPages.get(parent.toLowerCase());
        wiki.PANELS[parent] = {
          SEARCH: parent,
          LINK: `${origin}/${info?.address ?? parent}`,
          CLIENT: true,
          ...(info?.description ? { DESCRIPTION: info.description } : {}),
          MEMBERS: {},
        };
      }
      wiki.PANELS[parent].MEMBERS![name] = entry;
    } else if (type === "classfunc") {
      if (!parent) continue;
      if (!wiki.CLASSES[parent]) {
        const info = classPages.get(parent.toLowerCase());
        wiki.CLASSES[parent] = {
          SEARCH: parent,
          LINK: `${origin}/${info?.address ?? parent}`,
          ...(info?.description ? { DESCRIPTION: info.description } : {}),
          MEMBERS: {},
        };
      }
      wiki.CLASSES[parent].MEMBERS![name] = entry;
    } else if (!parent || parent === "Global") {
      wiki.GLOBALS[name] = entry;
    } else {
      const container = libraryContainer(wiki.LIBRARIES, parent, origin);
      const info = classPages.get(parent.toLowerCase());
      if (info?.description && !container.DESCRIPTION) container.DESCRIPTION = info.description;
      container.MEMBERS![name] = entry;
    }
  }

  return { version, wiki };
}

/* ------------------------------- caching ------------------------------- */

let cached: GluaDump | null = null;

export async function getGluaDump(origin: string): Promise<GluaDump> {
  const version = await dumpVersion();
  if (!cached || cached.version !== version) {
    cached = await buildGluaDump(origin);
  }
  return cached;
}
