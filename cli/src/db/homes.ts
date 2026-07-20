/**
 * homes CRUD operations (multi-home-directory support).
 *
 * A "home" is a root directory (e.g. /home/alice) that sessions can be
 * discovered from. The 'default' row is a reserved sentinel seeded by the
 * V12 migration, pointing at os.homedir() on this machine.
 *
 * Note on referential integrity: sessions.home_id is NOT foreign-key
 * enforced (same tolerance pattern as the existing device_id column) — if a
 * home is removed, sessions with that home_id simply keep pointing at a
 * deleted id. This mirrors the existing schema's approach rather than
 * introducing new cascade-delete semantics.
 *
 * All write operations are synchronous (better-sqlite3 is sync-only).
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getDb } from './client.js';

export interface Home {
  id: string;
  label: string;
  path: string;
  enabled: boolean;
  createdAt: string;
}

interface HomeRow {
  id: string;
  label: string;
  path: string;
  enabled: number;
  created_at: string;
}

function rowToHome(row: HomeRow): Home {
  return {
    id: row.id,
    label: row.label,
    path: row.path,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

/**
 * List all homes, ordered by creation time (oldest first, i.e. 'default' first).
 */
export function listHomes(): Home[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM homes ORDER BY created_at ASC').all() as HomeRow[];
  return rows.map(rowToHome);
}

/**
 * Get a single home by id, or null if it doesn't exist.
 */
export function getHome(id: string): Home | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM homes WHERE id = ?').get(id) as HomeRow | undefined;
  return row ? rowToHome(row) : null;
}

/**
 * Normalize a path the same way for id generation, uniqueness checks, and storage:
 * resolve to absolute, then strip a trailing slash (path.resolve already does this
 * for most cases, but this guards non-root paths passed with a trailing slash).
 */
function normalizePath(rawPath: string): string {
  const resolved = path.resolve(rawPath);
  if (resolved.length > 1 && resolved.endsWith(path.sep)) {
    return resolved.slice(0, -1);
  }
  return resolved;
}

/**
 * Register a new home root directory.
 *
 * Validates (in order, throwing a descriptive Error and NOT inserting on failure):
 *   1. The path must exist on disk and be a directory.
 *   2. No existing home may already point at this exact path.
 *
 * Nested home roots (e.g. a NAS-sync folder mirroring another machine's home
 * directory, placed inside this machine's own home) are explicitly ALLOWED.
 * Each provider's discover() appends a fixed, tool-specific relative subpath
 * to its own home root (e.g. '{homeRoot}/.claude/projects') rather than
 * walking the home root itself, so two distinct, non-identical home roots —
 * nested or not — cannot resolve to the same absolute file path. The only
 * way to produce a real collision would be registering a home root that
 * lands exactly inside another home's own tool subdirectory (e.g.
 * '/home/alice/.claude/projects/foo' as a second home under
 * '/home/alice') — a deliberately contrived setup, not something normal
 * NAS/cloud-sync mirroring triggers. The exact-duplicate-path check above,
 * backed by the homes.path UNIQUE index, is the only guard actually needed.
 */
export function addHome(rawPath: string, label?: string): Home {
  const normalizedPath = normalizePath(rawPath);

  let stat: fs.Stats;
  try {
    stat = fs.statSync(normalizedPath);
  } catch {
    throw new Error(`Path does not exist: ${normalizedPath}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${normalizedPath}`);
  }

  const existingHomes = listHomes();

  const exactMatch = existingHomes.find((h) => h.path === normalizedPath);
  if (exactMatch) {
    throw new Error(
      `A home already exists for this path: '${exactMatch.label}' (id: ${exactMatch.id})`
    );
  }

  const id = createHash('sha256').update(normalizedPath).digest('hex').slice(0, 16);
  const resolvedLabel = label ?? path.basename(normalizedPath);

  const db = getDb();
  db.prepare(
    `INSERT INTO homes (id, label, path, enabled) VALUES (?, ?, ?, 1)`
  ).run(id, resolvedLabel, normalizedPath);

  return getHome(id) as Home;
}

/**
 * Remove a home. The 'default' sentinel can never be removed.
 * Sessions with this home_id are NOT cascade-deleted (see file header comment).
 */
export function removeHome(id: string): void {
  if (id === 'default') {
    throw new Error('the default home cannot be removed');
  }
  const home = getHome(id);
  if (!home) {
    throw new Error(`No home found with id: ${id}`);
  }
  const db = getDb();
  db.prepare('DELETE FROM homes WHERE id = ?').run(id);
}

/**
 * Enable or disable a home (affects whether it's included in sync by default).
 * Allowed on 'default' too — a user may want to exclude their own machine
 * from an aggregated sync.
 */
export function setHomeEnabled(id: string, enabled: boolean): void {
  const home = getHome(id);
  if (!home) {
    throw new Error(`No home found with id: ${id}`);
  }
  const db = getDb();
  db.prepare('UPDATE homes SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
}
