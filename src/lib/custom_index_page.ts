import { listCustomPages, listCustomCategories } from "./db.js";

/**
 * Builds the "Custom Pages" index body (styles + markup, no layout).
 *
 * Shared by the /custom page (direct loads) and /content/custom.json, which
 * lets script.js open the index through the client-side content swap — no
 * full reload, sidebar untouched. Behaviour (delete buttons, category form)
 * is wired by script.js (InitCustomIndex).
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => esc(s).replace(/"/g, "&quot;");

const INDEX_STYLES = `<style>
.custom-btn {
    display: inline-block;
    padding: 0.45em 0.9em;
    border: 1px solid rgba(127, 127, 127, 0.4);
    border-radius: 6px;
    text-decoration: none;
}
.custom-meta {
    opacity: 0.6;
    font-size: 0.85em;
    margin: 0 0.35em;
}
.custom-parent {
    opacity: 0.5;
    font-weight: 400;
}
.custom-delete {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.45;
    padding: 0 0.3em;
    font-size: 0.9em;
    vertical-align: middle;
}
.custom-delete:hover {
    opacity: 1;
    color: #c0392b;
}
.custom-form {
    display: flex;
    gap: 0.5em;
    flex-wrap: wrap;
    align-items: center;
}
.custom-form input {
    padding: 0.4em 0.6em;
}
.custom-form button {
    padding: 0.4em 0.9em;
    cursor: pointer;
}
</style>`;

export async function buildCustomIndexPage(): Promise<{ html: string; title: string }> {
  let pages: any[] = [];
  let categories: { name: string; description: string }[] = [];
  let dbError = false;

  try {
    const [pageRows, catRows] = await Promise.all([listCustomPages(), listCustomCategories()]);
    pages = pageRows;
    categories = catRows;
  } catch (e: any) {
    console.warn("custom index: database unavailable:", e?.message ?? e);
    dbError = true;
  }

  // Group pages by category; explicitly created (possibly empty) categories included
  const grouped = new Map<string, { description: string; pages: any[] }>();
  for (const cat of categories) grouped.set(cat.name, { description: cat.description, pages: [] });
  for (const page of pages) {
    if (!grouped.has(page.category)) grouped.set(page.category, { description: "", pages: [] });
    grouped.get(page.category)!.pages.push(page);
  }
  const groups = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const categorySlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  // "MyAddon/Hooks" is a subcategory of "MyAddon": indent by depth, show the leaf name
  const categoryDepth = (name: string) => name.split("/").length - 1;
  const categoryLeaf = (name: string) => name.split("/").pop() ?? name;

  const groupsHtml = groups
    .map(([name, group]) => {
      const leaf = categoryLeaf(name);
      const parentPrefix =
        categoryDepth(name) > 0
          ? `<span class="custom-parent">${esc(name.slice(0, name.length - leaf.length))}</span>`
          : "";
      const pagesHtml = group.pages
        .map(
          (page: any) => `<li>
                <a href="/${escAttr(page.address)}">${esc(page.title)}</a>
                <span class="custom-meta">(${esc(page.address)})</span>
                — <a href="/custom/edit?address=${encodeURIComponent(page.address)}">edit</a>
                <button class="custom-delete page-delete" data-address="${escAttr(page.address)}" title="Delete this page"><i class="mdi mdi-delete"></i></button>
            </li>`,
        )
        .join("\n");
      return `<div class="section custom-category" style="margin-left: ${categoryDepth(name) * 1.5}em">
            <h2>
                ${parentPrefix}${esc(leaf)}
                <a class="anchor" href="#${categorySlug(name)}"><i class="mdi mdi-link-variant"></i></a>
                <a name="${categorySlug(name)}" class="anchor_offset"></a>
                <button class="custom-delete cat-delete" data-name="${escAttr(name)}" title="Delete this category (and subcategories)"><i class="mdi mdi-delete"></i></button>
            </h2>
            ${group.description ? `<p>${esc(group.description)}</p>` : ""}
            ${group.pages.length === 0 ? "<p><i>No pages in this category yet.</i></p>" : ""}
            <ul>
${pagesHtml}
            </ul>
        </div>`;
    })
    .join("\n");

  const html = `${INDEX_STYLES}
<div class="markdown">
    <h1>Custom Pages<a class="anchor" href="#custompages"><i class="mdi mdi-link-variant"></i></a><a name="custompages" class="anchor_offset"></a></h1>
    <p>
        Pages created by users of this wiki instance. They live in the local database,
        so they survive official content updates — and unlike official pages, anyone can edit them.
    </p>

    ${
      dbError
        ? `<div class="warning"><div class="inner">
        The database is unavailable. Custom pages require PostgreSQL — run via
        <code>docker compose up</code> or set <code>DATABASE_URL</code>.
    </div></div>`
        : ""
    }

    <p>
        <a class="custom-btn" href="/custom/edit"><i class="mdi mdi-pencil"></i> Create a new page</a>
    </p>

    ${!dbError && groups.length === 0 ? "<p><i>No custom pages yet. Create the first one!</i></p>" : ""}

    ${groupsHtml}

    <h2>Categories<a class="anchor" href="#categories"><i class="mdi mdi-link-variant"></i></a><a name="categories" class="anchor_offset"></a></h2>
    <p>
        Categories group custom pages here and in the sidebar. Create one below, or just type a
        new category name when creating a page. Use <code>/</code> for subcategories
        (e.g. <code>MyAddon/Hooks</code> is a subcategory of <code>MyAddon</code>).
    </p>
    <form id="new-category-form" class="custom-form">
        <input type="text" id="category-name" placeholder="Category name" maxlength="100" required />
        <input type="text" id="category-description" placeholder="Description (optional)" />
        <button type="submit">Create category</button>
        <span id="category-status"></span>
    </form>
</div>`;

  return { html, title: "Custom Pages" };
}
