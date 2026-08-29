// Publishes the Trolleybus System documentation to the local wiki.
import { corePages } from "./pages_core.mjs";
import { restPages } from "./pages_rest.mjs";
import { systemsPages } from "./pages_systems.mjs";
import { methodPages } from "./pages_methods.mjs";

const BASE = "http://127.0.0.1:4321";
// later files override earlier versions of the same address (POST 409 -> PUT)
const pages = [...corePages, ...restPages, ...systemsPages, ...methodPages];

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
  const body = { address: p.address, title: p.title, category: p.category, markup: p.markup };

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
