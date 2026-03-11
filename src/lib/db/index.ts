/**
 * Database connection setup for the Grant Discovery & Pipeline Management Tool
 *
 * Uses Drizzle ORM with SQLite (better-sqlite3 driver)
 *
 * The database file is stored in the project root as `grants.db`.
 * In production, this path should be configurable via environment variable.
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// ============================================================================
// Database Configuration
// ============================================================================

/**
 * Path to the SQLite database file
 * Defaults to 'grants.db' in the project root
 * Can be overridden via DATABASE_PATH environment variable
 */
const DATABASE_PATH = process.env.DATABASE_PATH || 'grants.db';

// ============================================================================
// Database Connection
// ============================================================================

/**
 * SQLite database instance
 *
 * Configuration:
 * - WAL mode is enabled for better concurrent read performance
 * - Foreign keys are enforced
 */
const sqlite = new Database(DATABASE_PATH);

// Enable Write-Ahead Logging for better performance
sqlite.pragma('journal_mode = WAL');

// Enable foreign key constraints
sqlite.pragma('foreign_keys = ON');

/**
 * Drizzle ORM database instance
 *
 * Usage:
 * ```typescript
 * import { db } from '@/lib/db';
 * import { fqhcProfiles } from '@/lib/db/schema';
 *
 * // Select all profiles
 * const profiles = await db.select().from(fqhcProfiles);
 *
 * // Insert a new profile
 * await db.insert(fqhcProfiles).values({ ... });
 * ```
 */
export const db = drizzle(sqlite, { schema });

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * SQL statements to create all tables
 *
 * This is used for initial database setup.
 * In production, use proper migrations via drizzle-kit.
 */
const CREATE_TABLES_SQL = `
  -- FQHC Profiles table
  CREATE TABLE IF NOT EXISTS fqhc_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ein TEXT NOT NULL,
    address TEXT NOT NULL,
    services TEXT NOT NULL,
    patient_demographics TEXT NOT NULL,
    staff_count INTEGER NOT NULL,
    annual_budget REAL NOT NULL,
    active_grants TEXT NOT NULL,
    fqhc_designation INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Grants table (cached from API)
  CREATE TABLE IF NOT EXISTS grants (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    agency TEXT NOT NULL,
    description TEXT NOT NULL,
    eligibility_description TEXT NOT NULL,
    funding_amount TEXT NOT NULL,
    deadline INTEGER NOT NULL,
    posted_date INTEGER NOT NULL,
    grant_type TEXT NOT NULL,
    cfda_number TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('forecasted', 'posted', 'closed')),
    application_url TEXT NOT NULL,
    source_url TEXT NOT NULL,
    cached_at INTEGER NOT NULL DEFAULT (unixepoch()),
    first_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_checked_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Pipeline Items table
  CREATE TABLE IF NOT EXISTS pipeline_items (
    id TEXT PRIMARY KEY,
    grant_id TEXT NOT NULL REFERENCES grants(id),
    fqhc_profile_id TEXT NOT NULL REFERENCES fqhc_profiles(id),
    status TEXT NOT NULL DEFAULT 'discovered'
      CHECK (status IN ('discovered', 'evaluating', 'applying', 'submitted', 'awarded', 'rejected')),
    fit_score REAL NOT NULL,
    fit_explanation TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    assigned_to TEXT,
    added_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deadline INTEGER NOT NULL
  );

  -- Grant Matches table
  CREATE TABLE IF NOT EXISTS grant_matches (
    id TEXT PRIMARY KEY,
    grant_id TEXT NOT NULL REFERENCES grants(id),
    fqhc_profile_id TEXT NOT NULL REFERENCES fqhc_profiles(id),
    fit_score REAL NOT NULL,
    fit_explanation TEXT NOT NULL,
    matched_criteria TEXT NOT NULL,
    potential_concerns TEXT NOT NULL,
    calculated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Indexes for common query patterns
  CREATE INDEX IF NOT EXISTS idx_pipeline_items_fqhc_profile_id
    ON pipeline_items(fqhc_profile_id);

  CREATE INDEX IF NOT EXISTS idx_pipeline_items_status
    ON pipeline_items(status);

  CREATE INDEX IF NOT EXISTS idx_pipeline_items_deadline
    ON pipeline_items(deadline);

  CREATE INDEX IF NOT EXISTS idx_grants_agency
    ON grants(agency);

  CREATE INDEX IF NOT EXISTS idx_grants_status
    ON grants(status);

  CREATE INDEX IF NOT EXISTS idx_grants_deadline
    ON grants(deadline);

  CREATE INDEX IF NOT EXISTS idx_grant_matches_fqhc_profile_id
    ON grant_matches(fqhc_profile_id);
`;

/**
 * Initialize the database by creating all tables if they don't exist
 *
 * This function is idempotent - safe to call multiple times.
 * Uses "CREATE TABLE IF NOT EXISTS" to avoid errors on existing tables.
 *
 * Usage:
 * ```typescript
 * import { initializeDatabase } from '@/lib/db';
 * await initializeDatabase();
 * ```
 */
export function initializeDatabase(): void {
  sqlite.exec(CREATE_TABLES_SQL);
}

/**
 * Close the database connection
 *
 * Should be called when the application shuts down.
 * Important for proper cleanup and avoiding data corruption.
 */
export function closeDatabase(): void {
  sqlite.close();
}

/**
 * Get the underlying SQLite database instance
 *
 * Use this for operations that require direct SQLite access,
 * such as custom pragmas or low-level operations.
 */
export function getSqliteInstance(): Database.Database {
  return sqlite;
}

// ============================================================================
// Re-exports for Convenience
// ============================================================================

export * from './schema';
