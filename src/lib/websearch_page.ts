import { searchWiki } from "./search.js";
import { highlightTerms } from "../../semantic/core/highlight.js";

/**
 * Builds the full-text search results body (styles + markup, no layout).
 *
 * Shared by the /websearch page (direct loads) and /content/websearch.json,
 * which lets script.js open search results through the client-side content
 * swap — no full reload, sidebar untouched.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const SEARCH_STYLES = `<style>
.search-source {
    font-size: 0.7em;
    opacity: 0.6;
    margin-left: 0.5em;
    text-transform: uppercase;
}
.websearch-results .highlight { font-weight: 700; }
</style>`;

export async function buildWebSearchPage(origin: string, query: string): Promise<{ html: string; title: string }> {
  let results: any[] = [];
  if (query && query.length > 0) {
    try {
      results = await searchWiki(query, 50, origin);
    } catch (e: any) {
      console.warn("websearch failed:", e?.message ?? e);
    }
  }

  const resultsHtml = results
    .map((result) => {
      const snippet = highlightTerms(result.snippet, query)
        .map((run: any) => (run.match ? `<span class="highlight">${esc(run.text)}</span>` : `<span>${esc(run.text)}</span>`))
        .join("");
      return `<div class="section">
      <h3>
        <a href="${esc(result.url)}">${esc(result.title)}</a>
        <span class="search-source" data-source="${esc(result.source)}">${esc(result.source)}</span>
      </h3>
      <div>${snippet}</div>
    </div>`;
    })
    .join("\n");

  const html = `${SEARCH_STYLES}
<div class="websearch-results">
  <h2>Searching for: "${esc(query)}"</h2>
  ${results.length === 0 ? "<p>No results found.</p>" : ""}
${resultsHtml}
</div>`;

  return { html, title: "Search Results" };
}
