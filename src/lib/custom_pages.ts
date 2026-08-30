/**
 * Shared logic for user-created pages: address validation, rendering and the
 * content-JSON shape the frontend consumes (same shape as official pages).
 */

import { renderWikitext } from "./wikitext/render.js";
import { buildPageExists, getOfficialPageSet } from "./pages.js";
import { listCustomPagesWithMarkup } from "./db.js";
import { firstTag, parseArgLike, parseAttrs } from "./gluadump.js";
import type { CustomPage } from "./db.js";

/** Route prefixes that can never be page addresses. */
const RESERVED_PREFIXES = new Set([
  "api", "content", "custom", "websearch", "mcp", "gmod", "styles", "states",
  "cache", "garry", "pages", "search_index.json", "script.js", "darkmode.js",
]);

export function validateAddress(address: string): string | null {
  if (!address || address.trim().length === 0) return "Address is required";
  if (address.length > 200) return "Address is too long (max 200 characters)";
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.:/-]*$/.test(address)) {
    return "Address may only contain letters, digits, and _ . : / - (must start with a letter, digit or _)";
  }
  if (address.includes("..") || address.endsWith("/")) return "Invalid address";

  const firstSegment = address.split("/")[0].toLowerCase();
  if (RESERVED_PREFIXES.has(firstSegment)) {
    return `Address may not start with the reserved prefix '${firstSegment}'`;
  }
  return null;
}

export async function isOfficialPage(origin: string, address: string): Promise<boolean> {
  const official = await getOfficialPageSet(origin);
  return official.has(address.toLowerCase());
}

export interface RenderedCustomPage {
  html: string;
  tags: string;
  description: string;
  title?: string;
}

export async function renderCustomMarkup(origin: string, markup: string): Promise<RenderedCustomPage> {
  const pageExists = await buildPageExists(origin);
  return renderWikitext(markup, { pageExists });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC";
  } catch {
    return iso;
  }
}

// Invisible marker so the frontend can tell custom pages apart from official
// ones (script.js swaps the "Live" header button for an "Edit" button).
function customMarker(page: CustomPage): string {
  return `<div id="custom-page-marker" data-address="${escapeAttr(page.address)}" style="display:none"></div>`;
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const AUTOGEN_MARKER = `class="autogen-methods"`;
const AUTOGEN_RE = /<div class="autogen-methods"(?: data-category="([^"]*)")?><\/div>/g;

function unescapeAttr(text: string): string {
  return text.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/**
 * The category a page "owns": the deepest category whose path suffix matches
 * the page address (same convention the sidebar uses for page-backed
 * categories). E.g. a page `DCoolButton` owns `My Addon/GUI/DCoolButton`
 * even while the page itself is filed under `My Addon/GUI`.
 */
function ownedCategory(
  page: Pick<CustomPage, "address" | "category">,
  categories: Iterable<string>,
): string | null {
  const address = page.address.toLowerCase();
  let best: string | null = null;
  let bestDepth = -1;

  for (const category of categories) {
    const parts = category.split("/");
    for (let i = 0; i < parts.length; i++) {
      if (parts.slice(i).join("/").toLowerCase() === address) {
        if (parts.length > bestDepth) {
          best = category;
          bestDepth = parts.length;
        }
        break;
      }
    }
  }

  return best;
}

function shortMemberTitle(pageTitle: string, memberTitle: string): string {
  for (const sep of [":", "."]) {
    if (memberTitle.startsWith(pageTitle + sep)) return memberTitle.slice(pageTitle.length + sep.length);
  }
  return memberTitle;
}

function escapeText(text: string): string {
  return (text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * One entry of the auto-generated methods list, matching the official wiki's
 * class-page markup: `.member_line` with a `.syntax` signature and a
 * `.summary` description (see e.g. wiki.facepunch.com/gmod/DPanel).
 */
function memberLine(
  member: { address: string; title: string; markup: string; description: string },
  pageTitle: string,
): string {
  const fnMatch = member.markup.match(/<function\b([^>]*)>([\s\S]*?)<\/function>/i);
  let syntax: string;
  let deprecated = false;

  if (fnMatch) {
    const attrs = parseAttrs(fnMatch[1]);
    const inner = fnMatch[2];
    const name = attrs.name ?? shortMemberTitle(pageTitle, member.title);
    const parent = attrs.parent ?? "";
    const type = (attrs.type ?? "libraryfunc").toLowerCase();
    deprecated = /<deprecated\b/i.test(inner);

    const rets = parseArgLike(firstTag(inner, "rets")?.inner ?? "", "ret");
    const args = parseArgLike(firstTag(inner, "args")?.inner ?? "", "arg");

    syntax = "";
    if (rets.length) {
      syntax += rets.map((r) => `<a class="link-page exists" href="/${escapeText(r.type)}">${escapeText(r.type)}</a>`).join(", ") + "  ";
    }
    if (parent && parent !== "Global" && type !== "hook") {
      const separator = type === "classfunc" || type === "panelfunc" ? ":" : ".";
      syntax += escapeText(parent) + separator;
    }
    syntax += `<a class="subject" href="/${member.address}">${escapeText(name)}</a>`;
    if (args.length) {
      const argParts = args.map((a) => {
        if (a.type === "vararg") return "...";
        let part = `<a class="link-page exists" href="/${escapeText(a.type)}">${escapeText(a.type)}</a> ${escapeText(a.name)}`;
        if (a.default !== undefined) part += ` = ${escapeText(a.default)}`;
        return part;
      });
      syntax += `( ${argParts.join(",  ")} )`;
    } else {
      syntax += "()";
    }
  } else {
    // Non-function member (e.g. a guide page in the category)
    syntax = `<a class="subject" href="/${member.address}">${escapeText(shortMemberTitle(pageTitle, member.title))}</a>`;
  }

  const summary = escapeText((member.description ?? "").trim());
  return `<div class="member_line"><div class="syntax${deprecated ? " depr" : ""}">${syntax}</div><div class="summary">${summary}</div></div>`;
}

/**
 * Replaces the `<methods/>` placeholder with a generated Methods section for
 * every page living in this page's category and its subcategories — so class
 * pages don't maintain method lists by hand. Output mirrors the official
 * wiki's class pages (`.members`/`.member_line`/`.syntax`/`.summary`).
 *
 * Runs at SERVE time, so the list always reflects the current page set.
 */
export async function expandAutoMethods(page: Pick<CustomPage, "address" | "title" | "category">, html: string): Promise<string> {
  if (!html.includes(AUTOGEN_MARKER)) return html;

  try {
    const all = await listCustomPagesWithMarkup();
    const categories = new Set(all.map((p) => p.category));

    const buildList = (category: string): string => {
      const prefix = category + "/";
      const members = all.filter(
        (p) => p.address !== page.address && (p.category === category || p.category.startsWith(prefix)),
      );
      if (members.length === 0) return "";

      // Pages directly in the category first, then one group per immediate
      // subcategory (deeper levels are flattened into their group).
      const direct: typeof members = [];
      const groups = new Map<string, typeof members>();
      for (const member of members) {
        if (member.category === category) {
          direct.push(member);
        } else {
          const groupName = member.category.slice(prefix.length).split("/")[0];
          if (!groups.has(groupName)) groups.set(groupName, []);
          groups.get(groupName)!.push(member);
        }
      }

      const renderGroup = (pages: typeof members) =>
        `<div class="section">` +
        pages
          .slice()
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((p) => memberLine(p, page.title))
          .join("") +
        `</div>`;

      let listHtml = `<div class="type">\n<div class="members"><h1>Methods<a class="anchor" href="#methods"><i class="mdi mdi-link-variant"></i></a><a name="methods" class="anchor_offset"></a></h1>\n`;
      if (direct.length > 0) listHtml += renderGroup(direct);
      for (const [groupName, groupPages] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const slug = groupName.toLowerCase().replace(/[^a-z0-9]+/g, "");
        listHtml += `<h2>${escapeText(groupName)}<a class="anchor" href="#${slug}"><i class="mdi mdi-link-variant"></i></a><a name="${slug}" class="anchor_offset"></a></h2>\n`;
        listHtml += renderGroup(groupPages);
      }
      listHtml += `</div></div>`;
      return listHtml;
    };

    // Source category per placeholder: explicit category="..." attribute wins,
    // then the category this page owns (path suffix = page address, like the
    // sidebar), then the category the page is filed under.
    const defaultCategory = ownedCategory(page, categories) ?? page.category;

    AUTOGEN_RE.lastIndex = 0;
    return html.replace(AUTOGEN_RE, (_m, categoryAttr) =>
      buildList(categoryAttr ? unescapeAttr(categoryAttr) : defaultCategory),
    );
  } catch (e: any) {
    console.warn("autogen methods expansion failed:", e?.message ?? e);
    return html;
  }
}

/**
 * The same JSON shape `public/content/*.json` files use, so the client-side
 * navigation and the `[...slug]` route can consume custom pages transparently.
 */
export function customPageToContentJson(page: CustomPage): object {
  return {
    title: page.title,
    description: page.description,
    tags: page.tags,
    address: page.address,
    // Marker goes last: the site CSS gives `#pagecontent > :first-child` its
    // top margin, so the real content must stay the first child.
    html: page.html + customMarker(page),
    footer: `Custom page<br>Updated: ${formatDate(page.updated_at as unknown as string)}`,
    custom: true,
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

/** Wrap DB-backed handlers: turns connection failures into a clean 503. */
export async function withDb(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e: any) {
    if (e?.code === "ECONNREFUSED" || /connect/i.test(String(e?.message))) {
      console.error("database unavailable:", e?.message ?? e);
      return errorResponse(
        "Database unavailable. Custom pages require PostgreSQL (set DATABASE_URL).",
        503,
      );
    }
    throw e;
  }
}
