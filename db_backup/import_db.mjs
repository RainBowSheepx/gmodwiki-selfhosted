// Imports gmodwiki_data.json into the wiki database (upsert by address/name).
// Creates the schema if it does not exist yet, so it can run before the app.
// Run from the project root:  node db_backup/import_db.mjs
import pg from "pg";
import { readFileSync } from "fs";

const url = process.env.DATABASE_URL ?? "postgres://gmodwiki:gmodwiki@localhost:5432/gmodwiki";
const data = JSON.parse(readFileSync(new URL("gmodwiki_data.json", import.meta.url), "utf8"));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS custom_categories (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS custom_pages (
    id          SERIAL PRIMARY KEY,
    address     TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'Custom',
    tags        TEXT NOT NULL DEFAULT '',
    markup      TEXT NOT NULL,
    html        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS custom_pages_lower_address ON custom_pages (lower(address));
CREATE INDEX IF NOT EXISTS custom_pages_category ON custom_pages (category);
CREATE TABLE IF NOT EXISTS custom_page_revisions (
    id             SERIAL PRIMARY KEY,
    address        TEXT NOT NULL,
    title          TEXT NOT NULL,
    category       TEXT NOT NULL DEFAULT 'Custom',
    markup         TEXT NOT NULL,
    commit_message TEXT NOT NULL DEFAULT 'Minor Change',
    author         TEXT NOT NULL DEFAULT 'Anon',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS custom_page_revisions_lower_address ON custom_page_revisions (lower(address), id DESC);
`;

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query(SCHEMA);

for (const c of data.categories) {
  await client.query(
    `INSERT INTO custom_categories (name, description, created_at) VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`,
    [c.name, c.description, c.created_at],
  );
}

let n = 0;
for (const p of data.pages) {
  await client.query(
    `INSERT INTO custom_pages (address, title, category, tags, markup, html, description, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (address) DO UPDATE SET
       title = EXCLUDED.title, category = EXCLUDED.category, tags = EXCLUDED.tags,
       markup = EXCLUDED.markup, html = EXCLUDED.html, description = EXCLUDED.description,
       updated_at = EXCLUDED.updated_at`,
    [p.address, p.title, p.category, p.tags, p.markup, p.html, p.description, p.created_at, p.updated_at],
  );
  if (++n % 100 === 0) console.log(`  ${n}/${data.pages.length}`);
}

// Page history: revision ids are referenced by ~diff:<id> URLs, so they are
// preserved on import; the sequence is bumped past the highest imported id.
// Older exports have no `revisions` key — that's fine.
const revisions = data.revisions ?? [];
for (const r of revisions) {
  await client.query(
    `INSERT INTO custom_page_revisions (id, address, title, category, markup, commit_message, author, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.address, r.title, r.category, r.markup, r.commit_message, r.author, r.created_at],
  );
}
if (revisions.length > 0) {
  await client.query(
    `SELECT setval(pg_get_serial_sequence('custom_page_revisions', 'id'),
                   (SELECT coalesce(max(id), 1) FROM custom_page_revisions))`,
  );
}

await client.end();
console.log(`imported ${data.pages.length} pages, ${data.categories.length} categories, ${revisions.length} revisions`);
