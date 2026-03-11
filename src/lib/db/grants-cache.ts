/**
 * Grant Caching Operations
 *
 * Provides database operations for persistent grant caching in SQLite.
 * Grants are stored permanently to avoid redundant API calls.
 *
 * Key functions:
 * - getCachedGrants: Retrieve grants by IDs (Map for fast lookup)
 * - saveGrantsToCache: Insert or update grants
 * - getAllCachedGrants: Get all cached grants for offline/fast load
 * - markGrantsAsChecked: Update lastCheckedAt timestamp
 */

import { db, initializeDatabase } from './index';
import { grants } from './schema';
import { inArray, sql } from 'drizzle-orm';
import type { Grant } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Grant with caching metadata from the database
 */
export interface CachedGrant extends Grant {
  firstSeenAt: Date;
  lastCheckedAt: Date;
}

// ============================================================================
// Database Initialization
// ============================================================================

let dbInitialized = false;

/**
 * Ensures the database is initialized before operations.
 * Safe to call multiple times.
 */
function ensureDbInitialized(): void {
  if (!dbInitialized) {
    try {
      initializeDatabase();
      // Add new columns if they don't exist (for existing databases)
      addNewColumnsIfNeeded();
      dbInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Don't throw - allow operations to fail gracefully
    }
  }
}

/**
 * Adds firstSeenAt and lastCheckedAt columns to existing grants table.
 * Uses SQLite's ALTER TABLE which is idempotent when column exists.
 */
function addNewColumnsIfNeeded(): void {
  try {
    const sqlite = db.$client;

    // Check if columns exist by querying table info
    const tableInfo = sqlite.prepare('PRAGMA table_info(grants)').all() as Array<{ name: string }>;
    const columnNames = tableInfo.map(col => col.name);

    if (!columnNames.includes('first_seen_at')) {
      sqlite.exec(`ALTER TABLE grants ADD COLUMN first_seen_at INTEGER NOT NULL DEFAULT (unixepoch())`);
    }

    if (!columnNames.includes('last_checked_at')) {
      sqlite.exec(`ALTER TABLE grants ADD COLUMN last_checked_at INTEGER NOT NULL DEFAULT (unixepoch())`);
    }
  } catch (error) {
    // Columns might already exist or table might not exist yet
    console.warn('Could not add new columns (may already exist):', error);
  }
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get cached grants by their IDs.
 *
 * @param grantIds - Array of grant IDs to look up
 * @returns Map of grantId -> CachedGrant for fast O(1) lookup
 */
export async function getCachedGrants(grantIds: string[]): Promise<Map<string, CachedGrant>> {
  ensureDbInitialized();

  const result = new Map<string, CachedGrant>();

  if (grantIds.length === 0) {
    return result;
  }

  try {
    const rows = await db
      .select()
      .from(grants)
      .where(inArray(grants.id, grantIds));

    for (const row of rows) {
      const grant: CachedGrant = {
        id: row.id,
        title: row.title,
        agency: row.agency,
        description: row.description,
        eligibilityDescription: row.eligibilityDescription,
        fundingAmount: row.fundingAmount,
        deadline: row.deadline,
        postedDate: row.postedDate,
        grantType: row.grantType,
        cfdaNumber: row.cfdaNumber,
        status: row.status,
        applicationUrl: row.applicationUrl,
        sourceUrl: row.sourceUrl,
        firstSeenAt: row.firstSeenAt,
        lastCheckedAt: row.lastCheckedAt,
      };
      result.set(row.id, grant);
    }
  } catch (error) {
    console.error('Failed to get cached grants:', error);
    // Return empty map on error - caller will fetch fresh data
  }

  return result;
}

/**
 * Save grants to the cache.
 * Uses upsert (insert or replace) to handle both new and existing grants.
 * Preserves firstSeenAt for existing grants.
 *
 * @param grantsToSave - Array of grants to cache
 */
export async function saveGrantsToCache(grantsToSave: Grant[]): Promise<void> {
  ensureDbInitialized();

  if (grantsToSave.length === 0) {
    return;
  }

  try {
    const now = new Date();

    // Get existing grants to preserve their firstSeenAt
    const existingIds = grantsToSave.map(g => g.id);
    const existingGrants = await getCachedGrants(existingIds);

    // Insert each grant, preserving firstSeenAt if it already exists
    for (const grant of grantsToSave) {
      const existing = existingGrants.get(grant.id);
      const firstSeenAt = existing?.firstSeenAt || now;

      await db
        .insert(grants)
        .values({
          id: grant.id,
          title: grant.title,
          agency: grant.agency,
          description: grant.description,
          eligibilityDescription: grant.eligibilityDescription,
          fundingAmount: grant.fundingAmount,
          deadline: grant.deadline,
          postedDate: grant.postedDate,
          grantType: grant.grantType,
          cfdaNumber: grant.cfdaNumber,
          status: grant.status,
          applicationUrl: grant.applicationUrl,
          sourceUrl: grant.sourceUrl,
          cachedAt: now,
          firstSeenAt: firstSeenAt,
          lastCheckedAt: now,
        })
        .onConflictDoUpdate({
          target: grants.id,
          set: {
            title: grant.title,
            agency: grant.agency,
            description: grant.description,
            eligibilityDescription: grant.eligibilityDescription,
            fundingAmount: grant.fundingAmount,
            deadline: grant.deadline,
            postedDate: grant.postedDate,
            grantType: grant.grantType,
            cfdaNumber: grant.cfdaNumber,
            status: grant.status,
            applicationUrl: grant.applicationUrl,
            sourceUrl: grant.sourceUrl,
            cachedAt: now,
            lastCheckedAt: now,
            // Preserve firstSeenAt - don't update it
          },
        });
    }
  } catch (error) {
    console.error('Failed to save grants to cache:', error);
    // Don't throw - caching failure shouldn't break the request
  }
}

/**
 * Get all cached grants for fast initial load.
 * Returns grants ordered by deadline (soonest first).
 *
 * @returns Array of all cached grants
 */
export async function getAllCachedGrants(): Promise<CachedGrant[]> {
  ensureDbInitialized();

  try {
    const rows = await db
      .select()
      .from(grants)
      .orderBy(grants.deadline);

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      agency: row.agency,
      description: row.description,
      eligibilityDescription: row.eligibilityDescription,
      fundingAmount: row.fundingAmount,
      deadline: row.deadline,
      postedDate: row.postedDate,
      grantType: row.grantType,
      cfdaNumber: row.cfdaNumber,
      status: row.status,
      applicationUrl: row.applicationUrl,
      sourceUrl: row.sourceUrl,
      firstSeenAt: row.firstSeenAt,
      lastCheckedAt: row.lastCheckedAt,
    }));
  } catch (error) {
    console.error('Failed to get all cached grants:', error);
    return [];
  }
}

/**
 * Update lastCheckedAt timestamp for grants.
 * Called after verifying grants still exist in the API.
 *
 * @param grantIds - Array of grant IDs to mark as checked
 */
export async function markGrantsAsChecked(grantIds: string[]): Promise<void> {
  ensureDbInitialized();

  if (grantIds.length === 0) {
    return;
  }

  try {
    const now = new Date();

    await db
      .update(grants)
      .set({ lastCheckedAt: now })
      .where(inArray(grants.id, grantIds));
  } catch (error) {
    console.error('Failed to mark grants as checked:', error);
    // Don't throw - this is a non-critical update
  }
}

/**
 * Check if a grant is "new" (first seen within the last 7 days).
 *
 * @param firstSeenAt - When the grant was first discovered
 * @returns true if the grant is less than 7 days old
 */
export function isGrantNew(firstSeenAt: Date): boolean {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return firstSeenAt > sevenDaysAgo;
}
