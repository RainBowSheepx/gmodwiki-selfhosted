import type { APIRoute } from "astro";
import { customPagesVersion } from "../lib/db.js";
import { getGluaDump } from "../lib/gluadump.js";
import { errorResponse, jsonResponse, withDb } from "../lib/custom_pages.js";

/**
 * Custom-wiki dump for the vscode-glua-enhanced editor plugin.
 *
 *   GET /gluadump.json          -> { version, wiki: { GLOBALS, CLASSES, LIBRARIES, HOOKS } }
 *   GET /gluadump.json?check=1  -> { version }   (cheap change probe for polling)
 */
export const GET: APIRoute = async ({ url }) =>
  withDb(async () => {
    if (url.searchParams.get("check")) {
      return jsonResponse({ version: await customPagesVersion() });
    }

    try {
      const dump = await getGluaDump(url.origin);
      return jsonResponse(dump);
    } catch (e: any) {
      console.error("gluadump build failed:", e?.message ?? e);
      return errorResponse("Failed to build dump", 500);
    }
  });
