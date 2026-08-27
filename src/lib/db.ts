import pg from "pg";

/**
 * PostgreSQL access for user-created ("custom") pages and categories.
 *
 * Official (scraped) wiki content stays on disk as static JSON and is rebuilt
 * on every update from wiki.facepunch.com; only custom content lives in the
 * database, so wiki updates can never conflict with user edits.
 *
 * The schema is applied automatically on first use, so a fresh Postgres
 * instance (e.g. the one from docker-compose) needs no manual migration step.
 */

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
`;

export interface CustomCategory {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface CustomPage {
  id: number;
  address: string;
  title: string;
  category: string;
  tags: string;
  markup: string;
  html: string;
  description: string;
  created_at: string;
  updated_at: string;
}

let poolPromise: Promise<pg.Pool> | null = null;

function connectionString(): string {
  return (
    process.env.DATABASE_URL ??
    "postgres://gmodwiki:gmodwiki@localhost:5432/gmodwiki"
  );
}

async function createPool(): Promise<pg.Pool> {
  const pool = new pg.Pool({
    connectionString: connectionString(),
    max: 10,
    connectionTimeoutMillis: 5000,
  });

  pool.on("error", (err) => {
    console.error("postgres pool error:", err.message);
  });

  await pool.query(SCHEMA);
  return pool;
}

export function getPool(): Promise<pg.Pool> {
  if (!poolPromise) {
    poolPromise = createPool().catch((err) => {
      // Allow retrying on the next request instead of caching the failure forever
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

/** True when the database can be reached; the site works without it, minus custom pages. */
export async function dbAvailable(): Promise<boolean> {
  try {
    await getPool();
    return true;
  } catch {
    return false;
  }
}

export async function listCustomPages(): Promise<Omit<CustomPage, "markup" | "html">[]> {
  const pool = await getPool();
  const res = await pool.query(
    `SELECT id, address, title, category, tags, description, created_at, updated_at
     FROM custom_pages ORDER BY category, title`,
  );
  return res.rows;
}

export async function getCustomPage(address: string): Promise<CustomPage | null> {
  const pool = await getPool();
  const res = await pool.query(
    `SELECT * FROM custom_pages WHERE lower(address) = lower($1) LIMIT 1`,
    [address],
  );
  return res.rows[0] ?? null;
}

export async function createCustomPage(page: {
  address: string;
  title: string;
  category: string;
  tags: string;
  markup: string;
  html: string;
  description: string;
}): Promise<CustomPage> {
  const pool = await getPool();
  const res = await pool.query(
    `INSERT INTO custom_pages (address, title, category, tags, markup, html, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [page.address, page.title, page.category, page.tags, page.markup, page.html, page.description],
  );
  return res.rows[0];
}

export async function updateCustomPage(
  address: string,
  page: { title: string; category: string; tags: string; markup: string; html: string; description: string },
): Promise<CustomPage | null> {
  const pool = await getPool();
  const res = await pool.query(
    `UPDATE custom_pages
     SET title = $2, category = $3, tags = $4, markup = $5, html = $6, description = $7, updated_at = now()
     WHERE lower(address) = lower($1)
     RETURNING *`,
    [address, page.title, page.category, page.tags, page.markup, page.html, page.description],
  );
  return res.rows[0] ?? null;
}

export async function deleteCustomPage(address: string): Promise<boolean> {
  const pool = await getPool();
  const res = await pool.query(`DELETE FROM custom_pages WHERE lower(address) = lower($1)`, [address]);
  return (res.rowCount ?? 0) > 0;
}

export async function searchCustomPages(query: string, limit = 10): Promise<Omit<CustomPage, "markup" | "html">[]> {
  const pool = await getPool();
  const res = await pool.query(
    `SELECT id, address, title, category, tags, description, created_at, updated_at
     FROM custom_pages
     WHERE title ILIKE '%' || $1 || '%'
        OR address ILIKE '%' || $1 || '%'
        OR category ILIKE '%' || $1 || '%'
        OR description ILIKE '%' || $1 || '%'
        OR markup ILIKE '%' || $1 || '%'
     ORDER BY (title ILIKE '%' || $1 || '%') DESC, title
     LIMIT $2`,
    [query, limit],
  );
  return res.rows;
}

/** Categories (explicit and implied by pages) whose name matches the query. */
export async function searchCustomCategories(
  query: string,
  limit = 5,
): Promise<{ name: string; description: string; pageCount: number }[]> {
  const pool = await getPool();
  const res = await pool.query(
    `SELECT name, max(description) AS description, sum(page_count)::int AS page_count FROM (
       SELECT c.name, c.description, 0 AS page_count FROM custom_categories c
       UNION ALL
       SELECT p.category AS name, '' AS description, count(*) AS page_count
       FROM custom_pages p GROUP BY p.category
     ) all_cats
     WHERE name ILIKE '%' || $1 || '%'
     GROUP BY name
     ORDER BY name
     LIMIT $2`,
    [query, limit],
  );
  return res.rows.map((r) => ({ name: r.name, description: r.description ?? "", pageCount: r.page_count ?? 0 }));
}

export async function listCustomCategories(): Promise<CustomCategory[]> {
  const pool = await getPool();
  const res = await pool.query(`SELECT * FROM custom_categories ORDER BY name`);
  return res.rows;
}

export async function createCustomCategory(name: string, description: string): Promise<CustomCategory> {
  const pool = await getPool();
  const res = await pool.query(
    `INSERT INTO custom_categories (name, description)
     VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
     RETURNING *`,
    [name, description],
  );
  return res.rows[0];
}

/**
 * Delete a category together with its subcategories ("Name/..."). Pages in the
 * tree are only removed when `deletePages` is set; otherwise a non-empty tree
 * is left untouched so the API can ask the user to confirm.
 */
export async function deleteCategoryTree(
  name: string,
  deletePages: boolean,
): Promise<{ pagesInTree: number; deletedCategories: number; deletedPages: number }> {
  const pool = await getPool();
  const subtreePattern = name.replace(/([%_\\])/g, "\\$1") + "/%";

  const countRes = await pool.query(
    `SELECT count(*)::int AS n FROM custom_pages WHERE category = $1 OR category LIKE $2 ESCAPE '\\'`,
    [name, subtreePattern],
  );
  const pagesInTree: number = countRes.rows[0]?.n ?? 0;

  if (pagesInTree > 0 && !deletePages) {
    return { pagesInTree, deletedCategories: 0, deletedPages: 0 };
  }

  let deletedPages = 0;
  if (pagesInTree > 0) {
    const pageRes = await pool.query(
      `DELETE FROM custom_pages WHERE category = $1 OR category LIKE $2 ESCAPE '\\'`,
      [name, subtreePattern],
    );
    deletedPages = pageRes.rowCount ?? 0;
  }

  const catRes = await pool.query(
    `DELETE FROM custom_categories WHERE name = $1 OR name LIKE $2 ESCAPE '\\'`,
    [name, subtreePattern],
  );

  return { pagesInTree, deletedCategories: catRes.rowCount ?? 0, deletedPages };
}
