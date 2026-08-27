// Exports the wiki database (custom pages + categories) to gmodwiki_data.json.
// Run from the project root:  node db_backup/export_db.mjs
import pg from "pg";
import { writeFileSync } from "fs";

const url = process.env.DATABASE_URL ?? "postgres://gmodwiki:gmodwiki@localhost:5432/gmodwiki";
const client = new pg.Client({ connectionString: url });
await client.connect();

const pages = (await client.query("SELECT address, title, category, tags, markup, html, description, created_at, updated_at FROM custom_pages ORDER BY address")).rows;
const categories = (await client.query("SELECT name, description, created_at FROM custom_categories ORDER BY name")).rows;

await client.end();

const out = new URL("gmodwiki_data.json", import.meta.url);
writeFileSync(out, JSON.stringify({ exported_at: new Date().toISOString(), categories, pages }, null, 1));
console.log(`exported ${pages.length} pages, ${categories.length} categories -> db_backup/gmodwiki_data.json`);
