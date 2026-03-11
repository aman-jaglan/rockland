/**
 * Database schema for the Grant Discovery & Pipeline Management Tool
 *
 * Uses Drizzle ORM with SQLite (better-sqlite3 driver)
 *
 * Tables:
 * - fqhc_profiles: Organization profiles for matching
 * - grants: Cached grant data from Grants.gov API
 * - pipeline_items: Grants being tracked by an organization
 * - grant_matches: AI matching results
 */

import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ============================================================================
// FQHC Profiles Table
// ============================================================================

/**
 * Stores organization profiles for FQHCs
 *
 * Complex fields (address, services, patientDemographics, activeGrants)
 * are stored as JSON strings and parsed in the application layer.
 */
export const fqhcProfiles = sqliteTable('fqhc_profiles', {
  /** Unique identifier (UUID) */
  id: text('id').primaryKey(),

  /** Legal name of the organization */
  name: text('name').notNull(),

  /** Employer Identification Number for 501c3 verification */
  ein: text('ein').notNull(),

  /**
   * Physical address stored as JSON
   * Format: { street: string, city: string, state: string, zip: string }
   */
  address: text('address', { mode: 'json' }).notNull().$type<{
    street: string;
    city: string;
    state: string;
    zip: string;
  }>(),

  /**
   * Services provided, stored as JSON array
   * Examples: ["primary care", "dental", "behavioral health"]
   */
  services: text('services', { mode: 'json' }).notNull().$type<string[]>(),

  /**
   * Patient demographics served, stored as JSON array
   * Examples: ["low-income", "uninsured", "homeless"]
   */
  patientDemographics: text('patient_demographics', { mode: 'json' }).notNull().$type<string[]>(),

  /** Total number of staff members */
  staffCount: integer('staff_count').notNull(),

  /** Annual operating budget in USD */
  annualBudget: real('annual_budget').notNull(),

  /**
   * Names of active grants, stored as JSON array
   * Examples: ["Ryan White Part A", "HRSA 330"]
   */
  activeGrants: text('active_grants', { mode: 'json' }).notNull().$type<string[]>(),

  /** Whether the organization has official FQHC designation */
  fqhcDesignation: integer('fqhc_designation', { mode: 'boolean' }).notNull().default(false),

  /** Timestamp when profile was created (Unix timestamp) */
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),

  /** Timestamp when profile was last updated (Unix timestamp) */
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// Grants Table (Cached from API)
// ============================================================================

/**
 * Stores grant data fetched from Grants.gov API
 *
 * This table serves as a cache to avoid repeated API calls.
 * Data is refreshed periodically from the Grants.gov API.
 */
export const grants = sqliteTable('grants', {
  /** Grants.gov opportunity ID (e.g., "HRSA-24-001") */
  id: text('id').primaryKey(),

  /** Full title of the grant opportunity */
  title: text('title').notNull(),

  /** Awarding agency abbreviation (e.g., "HHS", "HRSA") */
  agency: text('agency').notNull(),

  /** Full description of the grant program */
  description: text('description').notNull(),

  /** Eligibility requirements description */
  eligibilityDescription: text('eligibility_description').notNull(),

  /**
   * Funding amount range stored as JSON
   * Format: { min: number, max: number }
   */
  fundingAmount: text('funding_amount', { mode: 'json' }).notNull().$type<{
    min: number;
    max: number;
  }>(),

  /** Application deadline (Unix timestamp) */
  deadline: integer('deadline', { mode: 'timestamp' }).notNull(),

  /** When the opportunity was posted (Unix timestamp) */
  postedDate: integer('posted_date', { mode: 'timestamp' }).notNull(),

  /** Type of grant (e.g., "Discretionary", "Formula") */
  grantType: text('grant_type').notNull(),

  /** Catalog of Federal Domestic Assistance number */
  cfdaNumber: text('cfda_number').notNull(),

  /** Current status: "forecasted", "posted", or "closed" */
  status: text('status', { enum: ['forecasted', 'posted', 'closed'] }).notNull(),

  /** Direct link to the application system */
  applicationUrl: text('application_url').notNull(),

  /** Link to the Grants.gov opportunity page */
  sourceUrl: text('source_url').notNull(),

  /** When this record was cached (Unix timestamp) */
  cachedAt: integer('cached_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// Pipeline Items Table
// ============================================================================

/**
 * Tracks grants in an organization's pipeline
 *
 * This is the core workflow table that the CFO interacts with.
 * Each row represents a specific grant being tracked by a specific FQHC.
 */
export const pipelineItems = sqliteTable('pipeline_items', {
  /** Unique identifier (UUID) */
  id: text('id').primaryKey(),

  /** References grants.id */
  grantId: text('grant_id')
    .notNull()
    .references(() => grants.id),

  /** References fqhc_profiles.id */
  fqhcProfileId: text('fqhc_profile_id')
    .notNull()
    .references(() => fqhcProfiles.id),

  /**
   * Current pipeline status
   * Workflow: discovered -> evaluating -> applying -> submitted -> awarded/rejected
   */
  status: text('status', {
    enum: ['discovered', 'evaluating', 'applying', 'submitted', 'awarded', 'rejected'],
  })
    .notNull()
    .default('discovered'),

  /**
   * AI-calculated fit score (1-10)
   * Higher scores indicate better match with organization profile
   */
  fitScore: real('fit_score').notNull(),

  /**
   * AI-generated explanation of why this grant matches
   * 2-3 sentences for quick CFO review
   */
  fitExplanation: text('fit_explanation').notNull(),

  /** Free-form notes from the team */
  notes: text('notes').notNull().default(''),

  /** Team member assigned to this grant (null if unassigned) */
  assignedTo: text('assigned_to'),

  /** When this grant was added to the pipeline (Unix timestamp) */
  addedAt: integer('added_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),

  /** Last update timestamp (Unix timestamp) */
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),

  /**
   * Application deadline (denormalized from grants table)
   * Copied here for easy access in deadline-critical views
   */
  deadline: integer('deadline', { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// Grant Matches Table
// ============================================================================

/**
 * Stores AI matching results
 *
 * Created when the AI evaluates a grant against an FQHC profile.
 * These results can be cached to avoid redundant AI calls.
 */
export const grantMatches = sqliteTable('grant_matches', {
  /** Composite primary key would be grantId + fqhcProfileId, but using simple id for simplicity */
  id: text('id').primaryKey(),

  /** References grants.id */
  grantId: text('grant_id')
    .notNull()
    .references(() => grants.id),

  /** References fqhc_profiles.id */
  fqhcProfileId: text('fqhc_profile_id')
    .notNull()
    .references(() => fqhcProfiles.id),

  /**
   * Overall fit score (1-10)
   * 1-3: Poor fit, 4-6: Moderate, 7-10: Strong
   */
  fitScore: real('fit_score').notNull(),

  /** Human-readable explanation of the match */
  fitExplanation: text('fit_explanation').notNull(),

  /**
   * Criteria that matched well, stored as JSON array
   * Examples: ["HIV/AIDS services", "501c3 status"]
   */
  matchedCriteria: text('matched_criteria', { mode: 'json' }).notNull().$type<string[]>(),

  /**
   * Potential issues to consider, stored as JSON array
   * Examples: ["May conflict with HRSA 330 allocation"]
   */
  potentialConcerns: text('potential_concerns', { mode: 'json' }).notNull().$type<string[]>(),

  /** When this match was calculated (Unix timestamp) */
  calculatedAt: integer('calculated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ============================================================================
// Type Exports for Application Use
// ============================================================================

/**
 * TypeScript types inferred from the schema
 * Use these for type-safe database operations
 */
export type FQHCProfileRow = typeof fqhcProfiles.$inferSelect;
export type NewFQHCProfile = typeof fqhcProfiles.$inferInsert;

export type GrantRow = typeof grants.$inferSelect;
export type NewGrant = typeof grants.$inferInsert;

export type PipelineItemRow = typeof pipelineItems.$inferSelect;
export type NewPipelineItem = typeof pipelineItems.$inferInsert;

export type GrantMatchRow = typeof grantMatches.$inferSelect;
export type NewGrantMatch = typeof grantMatches.$inferInsert;
