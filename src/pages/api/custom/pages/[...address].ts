import type { APIRoute } from "astro";
import {
  addPageRevision,
  countPageRevisions,
  deleteCustomPage,
  getCustomPage,
  updateCustomPage,
} from "../../../../lib/db.js";
import {
  errorResponse,
  jsonResponse,
  renderCustomMarkup,
  withDb,
} from "../../../../lib/custom_pages.js";

// Astro leaves percent-encoding (e.g. %3A for ":") in rest params untouched
function decodeAddress(raw: string | undefined): string {
  const value = raw ?? "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export const GET: APIRoute = async ({ params }) =>
  withDb(async () => {
    const address = decodeAddress(params.address);
    const page = await getCustomPage(address);
    if (!page) return errorResponse(`No custom page at '${address}'`, 404);
    return jsonResponse({ page });
  });

export const PUT: APIRoute = async ({ params, request, url }) =>
  withDb(async () => {
    const address = decodeAddress(params.address);
    const existing = await getCustomPage(address);
    if (!existing) {
      // Only custom pages are editable: official pages get overwritten by the
      // scraper on every wiki update, so we never allow writing to them.
      return errorResponse(`No custom page at '${address}'. Only custom pages can be edited.`, 404);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const markup = String(body.markup ?? "");
    if (!markup.trim()) return errorResponse("Markup is required", 400);

    const category = String(body.category ?? existing.category).trim() || existing.category;
    const rendered = await renderCustomMarkup(url.origin, markup);
    const title = String(body.title ?? "").trim() || rendered.title || existing.title;
    const commitMessage = String(body.commitMessage ?? "").trim().slice(0, 200) || "Minor Change";
    const author = String(body.author ?? "").trim().replace(/\s+/g, " ").slice(0, 60) || "Anon";

    const contentChanged =
      existing.markup !== markup || existing.title !== title || existing.category !== category;

    // Nothing changed at all (same markup AND same rendered html): skip the
    // write entirely, so idempotent republishes (docs_generator) neither bump
    // updated_at nor spam the history.
    if (!contentChanged && existing.html === rendered.html) {
      return jsonResponse({ page: existing, unchanged: true });
    }

    const page = await updateCustomPage(address, {
      title,
      category,
      tags: rendered.tags,
      markup,
      html: rendered.html,
      description: rendered.description,
    });

    if (contentChanged) {
      // Pages that predate the history feature get a baseline revision of the
      // OLD content first, so the diff of this edit shows the real change
      // instead of the whole page as inserted.
      if ((await countPageRevisions(address)) === 0) {
        await addPageRevision({
          address: existing.address,
          title: existing.title,
          category: existing.category,
          markup: existing.markup,
          commitMessage: "Base Version",
          author: "Anon",
          createdAt: existing.updated_at,
        });
      }
      await addPageRevision({ address: existing.address, title, category, markup, commitMessage, author });
    }

    return jsonResponse({ page });
  });

export const DELETE: APIRoute = async ({ params }) =>
  withDb(async () => {
    const address = decodeAddress(params.address);
    const deleted = await deleteCustomPage(address);
    if (!deleted) return errorResponse(`No custom page at '${address}'`, 404);
    return jsonResponse({ deleted: true });
  });
