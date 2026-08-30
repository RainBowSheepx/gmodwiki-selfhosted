import type { APIRoute } from "astro";
import { errorResponse, expandAutoMethods, jsonResponse, renderCustomMarkup } from "../../../lib/custom_pages.js";

/** Render markup without saving — powers the editor's live preview. */
export const POST: APIRoute = async ({ request, url }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const markup = String(body.markup ?? "");
  const rendered = await renderCustomMarkup(url.origin, markup);

  // Expand <methods/> in the preview too, when the editor tells us where the
  // page lives (unsaved pages just show the list of current category members)
  const category = String(body.category ?? "").trim();
  if (category) {
    try {
      rendered.html = await expandAutoMethods(
        {
          address: String(body.address ?? ""),
          title: String(body.title ?? "").trim() || rendered.title || String(body.address ?? ""),
          category,
        },
        rendered.html,
      );
    } catch {
      // preview stays unexpanded without a database
    }
  }

  return jsonResponse(rendered);
};
