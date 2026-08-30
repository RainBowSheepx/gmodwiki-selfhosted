import type { APIRoute } from "astro";
import { buildCustomIndexPage } from "../../lib/custom_index_page.js";
import { jsonResponse } from "../../lib/custom_pages.js";

/**
 * The "Custom Pages" index in content-JSON shape, so script.js can open it
 * via the client-side content swap (no full page load, sidebar untouched).
 * This static path takes precedence over the /content/[...slug].json.ts
 * catch-all. After injecting `html`, the client calls InitCustomIndex().
 */
export const GET: APIRoute = async () => {
  const index = await buildCustomIndexPage();
  return jsonResponse({
    title: index.title,
    description: "User-created wiki pages",
    tags: "",
    address: "custom",
    html: index.html,
    footer: "",
  });
};
