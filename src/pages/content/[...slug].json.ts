import type { APIRoute } from "astro";
import { getCustomPage } from "../../lib/db.js";
import { customPageToContentJson, expandAutoMethods, jsonResponse } from "../../lib/custom_pages.js";
import { buildDiffPage, buildHistoryPage } from "../../lib/history_pages.js";

/**
 * Fallback content endpoint for custom pages.
 *
 * Official pages exist as static files under `/content/*.json` and are served
 * by the static layer before this route is ever reached — so this route only
 * fires for addresses that are NOT official, and looks them up in Postgres.
 * The response shape matches the static files, which keeps the client-side
 * navigation (script.js) and the `[...slug]` SSR route oblivious to where a
 * page came from.
 */
export const GET: APIRoute = async ({ params }) => {
  let address = params.slug ?? "";
  try {
    address = decodeURIComponent(address);
  } catch {
    // keep the raw value
  }

  try {
    // "<address>~history" and "<address>~diff:<revision>" are the page-history
    // views of custom pages (official-wiki URL scheme)
    const historyMatch = /^(.+)~history$/i.exec(address);
    if (historyMatch) {
      const built = await buildHistoryPage(historyMatch[1]);
      if (built) {
        return jsonResponse({
          title: built.title,
          description: built.title,
          tags: "",
          address,
          html: built.html,
          footer: "",
        });
      }
    }
    const diffMatch = /^(.+)~diff:(\d+)$/i.exec(address);
    if (diffMatch) {
      const built = await buildDiffPage(diffMatch[1], parseInt(diffMatch[2], 10));
      if (built) {
        return jsonResponse({
          title: built.title,
          description: built.title,
          tags: "",
          address,
          html: built.html,
          footer: "",
        });
      }
    }

    const page = await getCustomPage(address);
    if (page) {
      page.html = await expandAutoMethods(page, page.html);
      return jsonResponse(customPageToContentJson(page));
    }
  } catch (e: any) {
    console.warn("custom page lookup failed:", e?.message ?? e);
  }

  // Missing page: still return the content-JSON shape (with a renderable
  // `html`), so client-side navigation can display it instead of `undefined`.
  const createHref = `/custom/edit?address=${encodeURIComponent(address)}`;
  return jsonResponse(
    {
      title: "Page Not Found",
      description: "Page Not Found",
      tags: "",
      address,
      html:
        `<a name="notfound" class="anchor_offset"></a>` +
        `<h1>Not Found<a class="anchor" href="#notfound"><i class="mdi mdi-link-variant"></i></a></h1>` +
        `<p>This page is missing.</p>` +
        `<p>You can <a href="${createHref}">create it as a custom page</a>.</p>`,
      footer: "",
      missing: true,
    },
    404,
  );
};
