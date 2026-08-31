import {
  getCustomPage,
  getPageRevision,
  getPreviousRevision,
  listPageRevisions,
} from "./db.js";

/**
 * Page-history ("<address>~history") and revision-diff ("<address>~diff:ID")
 * pages for custom pages, replicating the official wiki's markup: the
 * `table.changelist` history list and the `div.page.diff > div.textdiff`
 * difference view (both styled by the scraped gmod.css; the few selectors
 * that assume the official DOM nesting are re-declared inline).
 *
 * Served in content-JSON shape via /content/[...slug].json.ts, so both open
 * through the client-side content swap like every other page.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------------- emoji avatars ---------------- */

// The official wiki shows user avatars; we have no accounts, so each author
// gets a stable emoji derived from their name.
const AVATAR_EMOJIS = [
  "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧",
  "🦆", "🦅", "🦉", "🐺", "🐗", "🐴", "🦄", "🐝", "🦋", "🐌", "🐞", "🐜",
  "🐢", "🐍", "🦎", "🦀", "🦑", "🐙", "🐠", "🐟", "🐡", "🐬", "🦈", "🐳",
  "🐊", "🦓", "🦍", "🐘", "🦒", "🐪", "🦔", "🐿", "🦜", "🦩", "🐲", "🤖",
];

export function authorEmoji(author: string): string {
  let h = 0;
  for (let i = 0; i < author.length; i++) h = (h * 31 + author.charCodeAt(i)) | 0;
  return AVATAR_EMOJIS[Math.abs(h) % AVATAR_EMOJIS.length];
}

/* ---------------- history page ---------------- */

const HISTORY_STYLES = `<style>
.markdown table.changelist td.avatar .emoji-avatar {
    display: block;
    width: 30px;
    height: 30px;
    font-size: 21px;
    line-height: 30px;
    text-align: center;
}
</style>`;

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function timestampTitle(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Official history groups entries under headers like "5 Days Ago"
function ageGroup(iso: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 31) return `${days} Days Ago`;
  const months = Math.floor(days / 30);
  if (days < 365) return months === 1 ? "1 Month Ago" : `${months} Months Ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 Year Ago" : `${years} Years Ago`;
}

export async function buildHistoryPage(address: string): Promise<{ html: string; title: string } | null> {
  const page = await getCustomPage(address);
  const revisions = await listPageRevisions(address);
  if (!page && revisions.length === 0) return null;

  // proper-cased address (the URL may arrive lowercased)
  const displayAddress = page?.address ?? revisions[0].address;
  const now = new Date();

  let rows = "";
  let lastGroup = "";
  for (const rev of revisions) {
    const group = ageGroup(rev.created_at, now);
    if (group !== lastGroup) {
      rows += `
            <tr class="grouphead">
                <td colspan="5">${esc(group)}</td>
            </tr>`;
      lastGroup = group;
    }
    rows += `
                <tr class="entry">
                    <td class="avatar">
                        <span class="avatar emoji-avatar" title="${esc(rev.author)}">${authorEmoji(rev.author)}</span>
                    </td>
                    <td class="controls">
                        <a title="View Difference" class="button primary" href="/${esc(displayAddress)}~diff:${rev.id}">
                            <i class="mdi mdi-vector-difference"></i>
                        </a>
                    </td>
                    <td class="main">

                        <div class="address">
                            <a title="${timestampTitle(rev.created_at)}" href="/${esc(displayAddress)}">${esc(displayAddress)}</a> -

                            ${esc(rev.commit_message)}

                        </div>

                        <div class="user">
                            by
                                <a>${esc(rev.author)}</a>
                        </div>

                    </td>

                </tr>`;
  }

  const body =
    revisions.length === 0
      ? `<p><i>No recorded changes for this page yet — history starts with the next edit.</i></p>`
      : `<table class="changelist">
${rows}

    </table>`;

  const html = `${HISTORY_STYLES}
<div class="markdown">

    ${body}

</div>`;

  return { html, title: `${displayAddress} History` };
}

/* ---------------- diff page ---------------- */

// gmod.css scopes the diff styles as `.content > .diff ...`, which assumes the
// official DOM; the swap target here is #pagecontent, so the same rules are
// re-scoped inline.
const DIFF_STYLES = `<style>
#pagecontent .page.diff .textdiff {
    color: #777;
    white-space: pre-wrap;
    font-family: monospace;
    padding: 16px 0;
    tab-size: 3;
    font-size: 13px;
}
#pagecontent .page.diff .textdiff .char.deleted, #pagecontent .page.diff .textdiff .line.deleted {
    background-color: rgba(253, 172, 166, 0.6);
    color: #b91004;
}
#pagecontent .page.diff .textdiff .modified.deleted {
    background-color: rgba(253, 172, 166, 0.2);
    color: #b91004;
}
#pagecontent .page.diff .textdiff .char.inserted, #pagecontent .page.diff .textdiff .line.inserted {
    background-color: rgba(153, 241, 52, 0.6);
    color: #508612;
}
#pagecontent .page.diff .textdiff .modified.inserted {
    background-color: rgba(153, 241, 52, 0.2);
    color: #508612;
}
</style>`;

// "⤶\n" — the official diff marks every changed line's end with a return arrow
const EOL = "&#x2936;\n";

/** Longest-common-subsequence table over two line arrays (with prefix/suffix trim). */
function diffLines(oldLines: string[], newLines: string[]): { type: "equal" | "del" | "ins"; line: string }[] {
  // trim the common prefix/suffix first — keeps the LCS table small
  let start = 0;
  while (start < oldLines.length && start < newLines.length && oldLines[start] === newLines[start]) start++;
  let endOld = oldLines.length;
  let endNew = newLines.length;
  while (endOld > start && endNew > start && oldLines[endOld - 1] === newLines[endNew - 1]) {
    endOld--;
    endNew--;
  }

  const a = oldLines.slice(start, endOld);
  const b = newLines.slice(start, endNew);
  const ops: { type: "equal" | "del" | "ins"; line: string }[] = [];

  for (let i = 0; i < start; i++) ops.push({ type: "equal", line: oldLines[i] });

  if (a.length * b.length > 4_000_000) {
    // pathological size: fall back to a plain replace block
    for (const line of a) ops.push({ type: "del", line });
    for (const line of b) ops.push({ type: "ins", line });
  } else {
    const n = a.length;
    const m = b.length;
    const lcs = new Uint32Array((n + 1) * (m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i * (m + 1) + j] =
          a[i] === b[j]
            ? lcs[(i + 1) * (m + 1) + j + 1] + 1
            : Math.max(lcs[(i + 1) * (m + 1) + j], lcs[i * (m + 1) + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) {
        ops.push({ type: "equal", line: a[i] });
        i++;
        j++;
      } else if (lcs[(i + 1) * (m + 1) + j] >= lcs[i * (m + 1) + j + 1]) {
        ops.push({ type: "del", line: a[i++] });
      } else {
        ops.push({ type: "ins", line: b[j++] });
      }
    }
    while (i < n) ops.push({ type: "del", line: a[i++] });
    while (j < m) ops.push({ type: "ins", line: b[j++] });
  }

  for (let i = endOld; i < oldLines.length; i++) ops.push({ type: "equal", line: oldLines[i] });
  return ops;
}

/** A modified line pair: common prefix/suffix plain, changed middle in a `char` span. */
function renderModifiedLine(line: string, other: string, kind: "deleted" | "inserted"): string {
  let p = 0;
  while (p < line.length && p < other.length && line[p] === other[p]) p++;
  let s = 0;
  while (s < line.length - p && s < other.length - p && line[line.length - 1 - s] === other[other.length - 1 - s]) s++;
  const prefix = line.slice(0, p);
  const mid = line.slice(p, line.length - s);
  const suffix = line.slice(line.length - s);

  // like the official markup, the end-of-line arrow joins the char span when
  // the change reaches the end of the line
  const inner =
    suffix === ""
      ? `${esc(prefix)}<span class="${kind} char">${esc(mid)}${EOL}</span>`
      : `${esc(prefix)}<span class="${kind} char">${esc(mid)}</span>${esc(suffix)}${EOL}`;
  return `<span class="${kind} modified line">${inner}</span>`;
}

function renderTextDiff(oldText: string, newText: string): string {
  const ops = diffLines(oldText.split(/\r?\n/), newText.split(/\r?\n/));
  let out = "";
  let k = 0;
  while (k < ops.length) {
    const op = ops[k];
    if (op.type === "equal") {
      out += esc(op.line) + "\n";
      k++;
      continue;
    }
    // collect the full deleted+inserted runs of this change block
    const dels: string[] = [];
    const inss: string[] = [];
    while (k < ops.length && ops[k].type === "del") dels.push(ops[k++].line);
    while (k < ops.length && ops[k].type === "ins") inss.push(ops[k++].line);

    const paired = Math.min(dels.length, inss.length);
    for (let i = 0; i < paired; i++) {
      out += renderModifiedLine(dels[i], inss[i], "deleted");
      out += renderModifiedLine(inss[i], dels[i], "inserted");
    }
    if (dels.length > paired) {
      out += `<span class="deleted line">${dels.slice(paired).map((l) => esc(l) + EOL).join("")}</span>`;
    }
    if (inss.length > paired) {
      out += `<span class="inserted line">${inss.slice(paired).map((l) => esc(l) + EOL).join("")}</span>`;
    }
  }
  return out;
}

export async function buildDiffPage(
  address: string,
  revisionId: number,
): Promise<{ html: string; title: string } | null> {
  const rev = await getPageRevision(revisionId);
  if (!rev || rev.address.toLowerCase() !== address.toLowerCase()) return null;

  const prev = await getPreviousRevision(rev.address, rev.id);
  const textdiff = renderTextDiff(prev?.markup ?? "", rev.markup);

  const html = `${DIFF_STYLES}
<div class="page diff">

    <h1>Revision Difference</h1>
    <h2>${esc(rev.address)}#${rev.id}</h2>

    <div class="textdiff">${textdiff}</div>

</div>`;

  return { html, title: `${rev.address} Diff` };
}
