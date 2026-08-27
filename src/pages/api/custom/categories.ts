import type { APIRoute } from "astro";
import {
  createCustomCategory,
  deleteCategoryTree,
  listCustomCategories,
  listCustomPages,
} from "../../../lib/db.js";
import { errorResponse, jsonResponse, withDb } from "../../../lib/custom_pages.js";

/**
 * Categories are lightweight groupings for custom pages. Explicitly created
 * ones live in `custom_categories`; any category referenced by a page also
 * counts, so the list is the union of both.
 */
export const GET: APIRoute = async () =>
  withDb(async () => {
    const [explicit, pages] = await Promise.all([listCustomCategories(), listCustomPages()]);

    const byName = new Map<string, { name: string; description: string; pageCount: number }>();
    for (const cat of explicit) {
      byName.set(cat.name, { name: cat.name, description: cat.description, pageCount: 0 });
    }
    for (const page of pages) {
      const existing = byName.get(page.category);
      if (existing) existing.pageCount++;
      else byName.set(page.category, { name: page.category, description: "", pageCount: 1 });
    }

    const categories = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
    return jsonResponse({ categories });
  });

export const POST: APIRoute = async ({ request }) =>
  withDb(async () => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const name = String(body.name ?? "").trim();
    if (!name) return errorResponse("Category name is required", 400);
    if (name.length > 100) return errorResponse("Category name is too long (max 100 characters)", 400);

    const category = await createCustomCategory(name, String(body.description ?? "").trim());
    return jsonResponse({ category }, 201);
  });

/**
 * Deletes a category and its subcategories. If the tree still contains pages,
 * responds 409 with the count unless `?pages=1` confirms deleting them too.
 */
export const DELETE: APIRoute = async ({ url }) =>
  withDb(async () => {
    const name = url.searchParams.get("name") ?? "";
    if (!name) return errorResponse("Pass ?name=<category>", 400);
    const deletePages = url.searchParams.get("pages") === "1";

    const result = await deleteCategoryTree(name, deletePages);

    if (result.pagesInTree > 0 && !deletePages) {
      return jsonResponse(
        {
          error: `Category '${name}' still contains ${result.pagesInTree} page(s) (including subcategories). Pass ?pages=1 to delete them too.`,
          pagesInTree: result.pagesInTree,
        },
        409,
      );
    }

    if (result.deletedCategories === 0 && result.deletedPages === 0) {
      return errorResponse(`No category named '${name}'`, 404);
    }

    return jsonResponse({ deleted: true, deletedCategories: result.deletedCategories, deletedPages: result.deletedPages });
  });
