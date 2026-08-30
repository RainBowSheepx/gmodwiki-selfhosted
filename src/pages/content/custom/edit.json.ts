import type { APIRoute } from "astro";
import { buildEditorPage } from "../../../lib/editor_page.js";
import { jsonResponse } from "../../../lib/custom_pages.js";

/**
 * The custom-page editor in content-JSON shape, so script.js can open it via
 * the regular client-side content swap (no full page load, sidebar untouched).
 * This static path takes precedence over the /content/[...slug].json.ts
 * catch-all. After injecting `html`, the client calls InitCustomEditor().
 */
export const GET: APIRoute = async ({ url }) => {
  const address = url.searchParams.get("address") ?? "";
  const editor = await buildEditorPage(url.origin, address);
  return jsonResponse({
    title: editor.title,
    description: "Custom page editor",
    tags: "",
    address: "custom/edit" + (address ? "?address=" + encodeURIComponent(address) : ""),
    html: editor.html,
    footer: "",
  });
};
