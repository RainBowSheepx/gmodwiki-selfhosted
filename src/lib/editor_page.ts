import { getCustomPage, listCustomCategories } from "./db.js";
import { isOfficialPage } from "./custom_pages.js";

/**
 * Builds the custom-page editor body (styles + markup, no layout).
 *
 * Shared by the /custom/edit page (direct loads) and the
 * /content/custom/edit.json endpoint, which lets script.js swap the editor
 * into #pagecontent like any other page — without a full reload, so the
 * sidebar keeps its live state. The editor's behaviour (preview, save,
 * delete) lives in script.js (InitCustomEditor), because scripts injected
 * via innerHTML never execute.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => esc(s).replace(/"/g, "&quot;");

const DEFAULT_MARKUP = `<function name="MyFunction" parent="Global" type="libraryfunc">
	<description>
What this function does.

<note>Extra information for readers.</note>
	</description>
	<realm>Shared</realm>
	<args>
		<arg name="input" type="string">Describe the argument.</arg>
	</args>
	<rets>
		<ret name="" type="boolean">Describe the return value.</ret>
	</rets>
</function>

<example>
	<description>Basic usage.</description>
	<code>
local ok = MyFunction("hello")
print(ok)
	</code>
	<output>true</output>
</example>
`;

const EDITOR_STYLES = `<style>
.editor-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25em;
    align-items: start;
}
@media (max-width: 1100px) {
    .editor-grid { grid-template-columns: 1fr; }
}
/* Grid items default to min-width:auto — wide preview content (e.g. long
   code lines) would otherwise stretch its column and crush the editor */
.editor-grid > .editor-pane {
    min-width: 0;
}
.editor-pane label {
    display: block;
    font-weight: 600;
    margin: 0.8em 0 0.25em;
}
.editor-pane .hint {
    font-weight: 400;
    opacity: 0.65;
    font-size: 0.85em;
}
.editor-pane input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.45em 0.6em;
}
.editor-pane input[readonly] {
    opacity: 0.65;
}
.editor-pane textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 420px;
    padding: 0.6em;
    font-family: monospace;
    font-size: 0.9em;
    line-height: 1.4;
    resize: vertical;
}
.editor-actions {
    display: flex;
    gap: 0.75em;
    align-items: center;
    margin-top: 0.9em;
    flex-wrap: wrap;
}
.editor-actions button {
    padding: 0.5em 1.1em;
    cursor: pointer;
}
.editor-actions button.danger {
    color: #c0392b;
}
#editor-status {
    margin-top: 0.6em;
    min-height: 1.2em;
}
.preview-box {
    border: 1px solid rgba(127, 127, 127, 0.35);
    border-radius: 6px;
    padding: 0.9em;
    min-height: 420px;
    max-width: 100%;
    overflow-x: auto;
}
/* Wide blocks scroll inside the preview instead of blowing up the layout */
.preview-box .code,
.preview-box table,
.preview-box .function_line,
.preview-box .syntax {
    overflow-x: auto;
    max-width: 100%;
}
</style>`;

export async function buildEditorPage(
  origin: string,
  requestedAddress: string,
): Promise<{ html: string; title: string; isEdit: boolean }> {
  let existing: any = null;
  let categories: string[] = [];
  let official = false;

  try {
    if (requestedAddress) {
      existing = await getCustomPage(requestedAddress);
      if (!existing) official = await isOfficialPage(origin, requestedAddress);
    }
    categories = (await listCustomCategories()).map((c) => c.name);
  } catch (e: any) {
    console.warn("editor: database unavailable:", e?.message ?? e);
  }

  const isEdit = existing !== null;
  const title = isEdit ? `Editing: ${existing.title}` : "Create a Custom Page";

  const officialWarning = official
    ? `<div class="warning"><div class="inner">
            <b>${esc(requestedAddress)}</b> is an official wiki page. Official pages are read-only —
            they are refreshed from wiki.facepunch.com on every content update, so local edits
            would be lost and are not allowed. You can create a custom page at a different address instead.
        </div></div>`
    : "";

  const html = `${EDITOR_STYLES}
<div class="markdown">
    <h1>${esc(title)}<a class="anchor" href="#editor"><i class="mdi mdi-link-variant"></i></a><a name="editor" class="anchor_offset"></a></h1>

    ${officialWarning}

    <p>
        Custom pages support <a target="_blank" href="https://wiki.facepunch.com/wiki/">Facepunch wiki markup</a>
        (<code>&lt;function&gt;</code>, <code>&lt;example&gt;</code>, <code>&lt;note&gt;</code>, <code>&lt;page&gt;</code>, ...)
        and regular markdown. The preview below updates as you type.
        On <code>&lt;function&gt;</code> you can set <code>github="https://github.com/Owner/Repo"</code>
        to point the "Search Github" button at your repository.
        <code>&lt;methods/&gt;</code> auto-lists the pages of the category this page owns
        (its address matches the category path tail); pin another source with
        <code>&lt;methods category="Some/Category"/&gt;</code>.
    </p>

    <div class="editor-grid">
        <div class="editor-pane">
            <label>Address <span class="hint">(URL path of the page, e.g. <code>MyAddon/MyFunction</code>)</span></label>
            <input type="text" id="page-address" value="${escAttr(existing?.address ?? requestedAddress)}"${isEdit ? " readonly" : ""} />

            <label>Title <span class="hint">(optional — defaults to the address)</span></label>
            <input type="text" id="page-title" value="${escAttr(existing?.title ?? "")}" />

            <label>Category <span class="hint">(use <code>/</code> for subcategories, e.g. <code>MyAddon/Hooks</code>)</span></label>
            <input type="text" id="page-category" list="category-options" value="${escAttr(existing?.category ?? "Custom")}" />
            <datalist id="category-options">
                ${categories.map((name) => `<option value="${escAttr(name)}"></option>`).join("\n                ")}
            </datalist>

            <label>Commit Message <span class="hint">(what changed — shown in the page history)</span></label>
            <input type="text" id="page-commit" maxlength="200" value="${isEdit ? "Minor Change" : "Created Page"}" />

            <label>Author <span class="hint">(shown in the page history; remembered in this browser)</span></label>
            <input type="text" id="page-author" maxlength="60" value="Anon" />

            <label>Markup</label>
            <textarea id="page-markup" spellcheck="false">${esc(existing?.markup ?? DEFAULT_MARKUP)}</textarea>

            <div class="editor-actions">
                <button id="save-button" type="button">${isEdit ? "Save changes" : "Create page"}</button>
                ${isEdit ? `<button id="delete-button" type="button" class="danger">Delete page</button>` : ""}
                ${isEdit ? `<a href="/${escAttr(existing.address)}">View page</a>` : ""}
                <a href="/custom">All custom pages</a>
            </div>
            <div id="editor-status"></div>
        </div>

        <div class="editor-pane">
            <label>Preview</label>
            <div id="preview" class="markdown preview-box"><i>Loading preview...</i></div>
        </div>
    </div>
</div>`;

  return { html, title, isEdit };
}
