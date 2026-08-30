import type { APIRoute } from "astro";
import { buildWebSearchPage } from "../../lib/websearch_page.js";
import { jsonResponse } from "../../lib/custom_pages.js";

/**
 * Full-text search results in content-JSON shape, so script.js can open them
 * via the client-side content swap (no full page load, sidebar untouched).
 */
export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get("query") ?? "";
  const page = await buildWebSearchPage(url.origin, query);
  return jsonResponse({
    title: page.title,
    description: "Garry's Mod Wiki",
    tags: "",
    address: "websearch?query=" + encodeURIComponent(query),
    html: page.html,
    footer: "",
  });
};
