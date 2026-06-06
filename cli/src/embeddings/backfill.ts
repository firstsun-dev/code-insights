// Batch backfill job: compute embeddings for all pending insights and messages.
// Processes in batches, stores vectors in sqlite-vec, updates embedding_status.

import { getDb } from '../db/client.js';
import { embedTexts } from './ollama-client.js';
import type { EmbeddingConfig } from './types.js';
import {
  loadVectorExtension,
  createAllVectorTables,
  insertEmbeddingsBatch,
} from './store.js';
import type { EmbeddingEntityType, BackfillStats } from './types.js';
import type Database from 'better-sqlite3';

/** Construct the source text that gets embedded for an insight. */
function insightSourceText(row: {
  type: string;
  project_name: string;
  title: string;
  content: string;
  summary: string;
}): string {
  return `${row.type} [${row.project_name}] ${row.title}\n${row.content}\n${row.summary}`;
}

/** Construct the source text for a message (just the content). */
function messageSourceText(row: { content: string }): string {
  return row.content;
}

/**
 * Backfill embeddings for a specific entity type.
 *
 * 1. Load the sqlite-vec extension
 * 2. Create virtual tables if needed
 * 3. Query rows WHERE embedding_status = 'pending'
 * 4. Embed via Ollama in batches
 * 5. Store vectors in sqlite-vec + embedding_metadata
 * 6. Update embedding_status to 'computed'
 */
export async function backfillEmbeddings(
  config: EmbeddingConfig,
  entityType: EmbeddingEntityType,
): Promise<BackfillStats> {
  const db = getDb();
  loadVectorExtension(db);
  createAllVectorTables(db, config.dim);

  const stats: BackfillStats = {
    entityType,
    total: 0,
    computed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Fetch pending rows
  let pendingRows: Array<{ id: string; type?: string; project_name?: string; title?: string; content: string; summary?: string }>;

  if (entityType === 'insight') {
    pendingRows = db
      .prepare(
        `SELECT id, type, project_name, title, content, summary
         FROM insights
         WHERE embedding_status = 'pending'`,
      )
      .all() as Array<{ id: string; type: string; project_name: string; title: string; content: string; summary: string }>;
  } else {
    pendingRows = db
      .prepare(
        `SELECT id, content
         FROM messages
         WHERE embedding_status = 'pending'
           AND type = 'user'
           AND content != ''`,
      )
      .all() as Array<{ id: string; content: string }>;
  }

  stats.total = pendingRows.length;

  if (pendingRows.length === 0) {
    return stats;
  }

  // Prepare items for embedding
  const items = pendingRows.map(row => ({
    id: row.id,
    text:
      entityType === 'insight'
        ? insightSourceText(row as { type: string; project_name: string; title: string; content: string; summary: string })
        : messageSourceText(row as { content: string }),
  }));

  // Embed in batches
  const embeddingResults: EmbeddingResult[] = [];

  for (let i = 0; i < items.length; i += config.batchSize) {
    const batch = items.slice(i, i + config.batchSize);
    try {
      const results = await embedTexts(config, batch);
      embeddingResults.push(...results);
    } catch (err) {
      // Mark the whole batch as failed
      const msg = err instanceof Error ? err.message : String(err);
      for (const item of batch) {
        stats.failed++;
        stats.errors.push({ id: item.id, error: msg });
        // Update status to 'failed' so we don't retry forever
        updateStatus(db, entityType, item.id, 'failed');
      }
    }
  }

  // Store successful embeddings
  if (embeddingResults.length > 0) {
    insertEmbeddingsBatch(db, entityType, embeddingResults);

    // Write metadata + update status in a transaction
    const metaStmt = db.prepare(`
      INSERT OR REPLACE INTO embedding_metadata (id, entity_type, model, dim, source_text, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    const statusStmt = db.prepare(`
      UPDATE ${entityType === 'insight' ? 'insights' : 'messages'}
      SET embedding_status = 'computed'
      WHERE id = ?
    `);
    const updateBatch = db.transaction((results: EmbeddingResult[]) => {
      for (const r of results) {
        metaStmt.run(r.id, entityType, r.model, r.dim, r.sourceText);
        statusStmt.run(r.id);
      }
    });
    updateBatch(embeddingResults);
    stats.computed = embeddingResults.length;
  }

  return stats;
}

function updateStatus(
  db: Database.Database,
  entityType: EmbeddingEntityType,
  id: string,
  status: 'computed' | 'stale' | 'failed',
): void {
  const table = entityType === 'insight' ? 'insights' : 'messages';
  db.prepare(`UPDATE ${table} SET embedding_status = ? WHERE id = ?`).run(status, id);
}

/**
 * Backfill both insights and messages.
 */
export async function backfillAll(
  config: EmbeddingConfig,
): Promise<{ insights: BackfillStats; messages: BackfillStats }> {
  const insights = await backfillEmbeddings(config, 'insight');
  const messages = await backfillEmbeddings(config, 'message');
  return { insights, messages };
}
