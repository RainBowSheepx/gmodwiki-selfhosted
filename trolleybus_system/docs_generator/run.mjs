// Publishes the Trolleybus System documentation to the local wiki.
import { corePages } from "./pages_core.mjs";
import { restPages } from "./pages_rest.mjs";
import { systemsPages } from "./pages_systems.mjs";
import { methodPages } from "./pages_methods.mjs";
import { resolveSource } from "./sourcemap.mjs";

// Wiki to publish to; override with WIKI_BASE=https://my-wiki.example
const BASE = (process.env.WIKI_BASE ?? "http://127.0.0.1:4321").replace(/\/+$/, "");
// Later files override earlier versions of the same address. Deduplicate
// BEFORE publishing (last wins): publishing the intermediate version too
// would record phantom edits in the page history on every republish.
const allPages = [...corePages, ...restPages, ...systemsPages, ...methodPages];
const byAddress = new Map();
for (const p of allPages) byAddress.set(p.address, p);
const pages = [...byAddress.values()];

// Every function page whose definition is found in the addon sources gets a
// <file> tag (the "View Source" button, linking into the github= repo).
let sourced = 0;
const unsourced = [];
for (const p of pages) {
  if (!/<function\s/.test(p.markup) || p.markup.includes("<file ")) continue;
  if (/type="hook"/.test(p.markup)) continue;
  const src = resolveSource(p);
  if (src) {
    p.markup = p.markup.replace("</realm>\n", `</realm>\n\t<file line="${src.start}-L${src.end}">${src.file}</file>\n`);
    sourced++;
  } else {
    unsourced.push(p.address);
  }
}
console.log(`view-source: ${sourced} pages linked${unsourced.length ? `, UNRESOLVED: ${unsourced.join(", ")}` : ""}`);

async function api(path, method, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

// Ensure the top-level category exists with a description
await api("/api/custom/categories", "POST", {
  name: "Trolleybus System",
  description: "Documentation for the Garry's Mod Trolleybus System addon",
});

let created = 0, updated = 0, failed = 0;

for (const p of pages) {
  // Author for the page history; unchanged republishes record no revisions
  const body = { address: p.address, title: p.title, category: p.category, markup: p.markup, author: "docs_generator" };

  let r = await api("/api/custom/pages", "POST", body);
  if (r.status === 409) {
    r = await api("/api/custom/pages/" + encodeURIComponent(p.address), "PUT", body);
    if (r.status === 200) { updated++; continue; }
  } else if (r.status === 201) {
    created++;
    continue;
  }

  failed++;
  console.error(`FAILED ${p.address}: ${r.status} ${r.data?.error ?? ""}`);
}

console.log(`done: ${created} created, ${updated} updated, ${failed} failed, ${pages.length} total`);
