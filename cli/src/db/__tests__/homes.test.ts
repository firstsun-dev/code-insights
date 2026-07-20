import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runMigrations } from '../migrate.js';

// ──────────────────────────────────────────────────────
// Module-scoped mutable DB reference — see cli/src/db/read-write.test.ts
// for the rationale (vi.mock is hoisted above imports, so getDb() must
// read testDb via closure at call time, not capture time).
// ──────────────────────────────────────────────────────

let testDb: Database.Database;

vi.mock('../client.js', () => ({
  getDb: () => testDb,
}));

const { listHomes, getHome, addHome, removeHome, setHomeEnabled } = await import('../homes.js');

describe('homes.ts', () => {
  let tmpRoot: string;

  beforeEach(() => {
    testDb = new Database(':memory:');
    runMigrations(testDb);
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-homes-test-'));
  });

  afterEach(() => {
    testDb.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe('listHomes / getHome', () => {
    it('seeds a default home from the V12 migration', () => {
      const homes = listHomes();
      expect(homes).toHaveLength(1);
      expect(homes[0].id).toBe('default');
      expect(homes[0].enabled).toBe(true);
    });

    it('getHome returns null for an unknown id', () => {
      expect(getHome('nonexistent')).toBeNull();
    });
  });

  describe('addHome', () => {
    it('registers a new home for a valid directory', () => {
      const dir = fs.mkdtempSync(path.join(tmpRoot, 'alice-'));
      const home = addHome(dir, 'Alice');

      expect(home.label).toBe('Alice');
      expect(home.path).toBe(path.resolve(dir));
      expect(home.enabled).toBe(true);
      expect(home.id).not.toBe('default');
      expect(listHomes()).toHaveLength(2);
    });

    it('defaults the label to the directory basename when omitted', () => {
      const dir = fs.mkdtempSync(path.join(tmpRoot, 'bob-'));
      const home = addHome(dir);
      expect(home.label).toBe(path.basename(dir));
    });

    it('rejects a path that does not exist', () => {
      const missing = path.join(tmpRoot, 'does-not-exist');
      expect(() => addHome(missing)).toThrow(/does not exist/i);
      expect(listHomes()).toHaveLength(1);
    });

    it('rejects a path that is not a directory', () => {
      const filePath = path.join(tmpRoot, 'a-file.txt');
      fs.writeFileSync(filePath, 'hello');
      expect(() => addHome(filePath)).toThrow(/not a directory/i);
      expect(listHomes()).toHaveLength(1);
    });

    it('rejects a duplicate path', () => {
      const dir = fs.mkdtempSync(path.join(tmpRoot, 'dup-'));
      addHome(dir, 'First');
      expect(() => addHome(dir, 'Second')).toThrow(/already exists/i);
      expect(listHomes()).toHaveLength(2); // only the first insert succeeded
    });

    it('rejects a path nested inside an existing home', () => {
      const parent = fs.mkdtempSync(path.join(tmpRoot, 'parent-'));
      addHome(parent, 'Parent');

      const child = path.join(parent, 'nested');
      fs.mkdirSync(child);

      expect(() => addHome(child)).toThrow(/conflicts with existing home/i);
    });

    it('rejects a path that is an ancestor of an existing home', () => {
      const parent = fs.mkdtempSync(path.join(tmpRoot, 'parent2-'));
      const child = path.join(parent, 'nested');
      fs.mkdirSync(child);
      addHome(child, 'Child');

      expect(() => addHome(parent)).toThrow(/conflicts with existing home/i);
    });

    it('does not flag sibling directories with a shared string prefix as nested', () => {
      // '/tmp/xxx/al' must not be flagged as a prefix of '/tmp/xxx/alice'
      const al = fs.mkdtempSync(path.join(tmpRoot, 'al'));
      const alice = `${al}ice`;
      fs.mkdirSync(alice);

      addHome(al, 'Al');
      // Should succeed — these are sibling directories, not nested roots.
      expect(() => addHome(alice, 'Alice')).not.toThrow();
      expect(listHomes()).toHaveLength(3);
    });
  });

  describe('removeHome', () => {
    it('throws when attempting to remove the default home', () => {
      expect(() => removeHome('default')).toThrow(/default home cannot be removed/i);
    });

    it('throws for an unknown id', () => {
      expect(() => removeHome('nonexistent')).toThrow(/no home found/i);
    });

    it('removes a non-default home', () => {
      const dir = fs.mkdtempSync(path.join(tmpRoot, 'removable-'));
      const home = addHome(dir);
      removeHome(home.id);
      expect(getHome(home.id)).toBeNull();
      expect(listHomes()).toHaveLength(1);
    });

    it('does not cascade-delete sessions referencing the removed home_id', () => {
      const dir = fs.mkdtempSync(path.join(tmpRoot, 'orphan-'));
      const home = addHome(dir);

      testDb.exec(`
        INSERT INTO projects (id, name, path, last_activity)
          VALUES ('p1', 'test', '/test', datetime('now'));
        INSERT INTO sessions (id, project_id, project_name, project_path, started_at, ended_at, home_id)
          VALUES ('s1', 'p1', 'test', '/test', datetime('now'), datetime('now'), '${home.id}');
      `);

      removeHome(home.id);

      const row = testDb.prepare('SELECT home_id FROM sessions WHERE id = ?').get('s1') as { home_id: string };
      expect(row.home_id).toBe(home.id); // orphaned, not cascade-deleted
    });
  });

  describe('setHomeEnabled', () => {
    it('throws for an unknown id', () => {
      expect(() => setHomeEnabled('nonexistent', false)).toThrow(/no home found/i);
    });

    it('disables and re-enables the default home', () => {
      setHomeEnabled('default', false);
      expect(getHome('default')?.enabled).toBe(false);

      setHomeEnabled('default', true);
      expect(getHome('default')?.enabled).toBe(true);
    });

    it('disables a non-default home', () => {
      const dir = fs.mkdtempSync(path.join(tmpRoot, 'toggle-'));
      const home = addHome(dir);
      setHomeEnabled(home.id, false);
      expect(getHome(home.id)?.enabled).toBe(false);
    });
  });
});
