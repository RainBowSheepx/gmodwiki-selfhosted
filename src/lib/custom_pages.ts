/**
 * Shared logic for user-created pages: address validation, rendering and the
 * content-JSON shape the frontend consumes (same shape as official pages).
 */

import { renderWikitext } from "./wikitext/render.js";
import { buildPageExists, getOfficialPageSet } from "./pages.js";
import { listCustomPages } from "./db.js";
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

const AUTOGEN_PLACEHOLDER = `<div class="autogen-methods"></div>`;

function shortMemberTitle(pageTitle: string, memberTitle: string): string {
  for (const sep of [":", "."]) {
    if (memberTitle.startsWith(pageTitle + sep)) return memberTitle.slice(pageTitle.length + sep.length);
  }
  return memberTitle;
}

function trimDescription(text: string, max = 160): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.lastIndexOf(" ", max - 3);
  return clean.slice(0, cut > 40 ? cut : max - 3) + "...";
}

/**
 * Replaces the `<methods/>` placeholder with a generated list of every page
 * living in this page's category and its subcategories — so class pages don't
 * have to maintain their method lists by hand (official-wiki style).
 *
 * Runs at SERVE time, so the list always reflects the current page set.
 */
export async function expandAutoMethods(page: Pick<CustomPage, "address" | "title" | "category">, html: string): Promise<string> {
  if (!html.includes(AUTOGEN_PLACEHOLDER)) return html;

  let listHtml = "";
  try {
    const all = await listCustomPages();
    const prefix = page.category + "/";
    const members = all.filter(
      (p) => p.address !== page.address && (p.category === page.category || p.category.startsWith(prefix)),
    );

    // Group: pages directly in the category first, then one group per
    // immediate subcategory (deeper levels are flattened into their group).
    const direct: typeof members = [];
    const groups = new Map<string, typeof members>();
    for (const member of members) {
      if (member.category === page.category) {
        direct.push(member);
      } else {
        const groupName = member.category.slice(prefix.length).split("/")[0];
        if (!groups.has(groupName)) groups.set(groupName, []);
        groups.get(groupName)!.push(member);
      }
    }

    const renderGroup = (pages: typeof members) => {
      const items = pages
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((p) => {
          const desc = trimDescription(p.description);
          return `<li><a class="link-page exists" href="/${p.address}">${shortMemberTitle(page.title, p.title)}</a>${desc ? " — " + desc.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ""}</li>`;
        })
        .join("\n");
      return `<ul>\n${items}\n</ul>\n`;
    };

    if (members.length > 0) {
      listHtml += `<h1>Methods<a class="anchor" href="#methods"><i class="mdi mdi-link-variant"></i></a><a name="methods" class="anchor_offset"></a></h1>\n`;
      if (direct.length > 0) listHtml += renderGroup(direct);
      for (const [groupName, groupPages] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const slug = groupName.toLowerCase().replace(/[^a-z0-9]+/g, "");
        listHtml += `<h2>${groupName}<a class="anchor" href="#${slug}"><i class="mdi mdi-link-variant"></i></a><a name="${slug}" class="anchor_offset"></a></h2>\n`;
        listHtml += renderGroup(groupPages);
      }
    }
  } catch (e: any) {
    console.warn("autogen methods expansion failed:", e?.message ?? e);
    return html;
  }

  return html.split(AUTOGEN_PLACEHOLDER).join(listHtml);
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
