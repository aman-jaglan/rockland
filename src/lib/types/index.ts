/**
 * TypeScript types for the Grant Discovery & Pipeline Management Tool
 *
 * These types define the core data structures for:
 * - Grants from Grants.gov API
 * - FQHC organization profiles for matching
 * - Pipeline tracking items
 * - AI matching results
 */

// ============================================================================
// Shared Base Types
// ============================================================================

/**
 * Common timestamp fields used across multiple entities
 */
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Physical address structure used by organizations
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

/**
 * Funding amount range for grants
 */
export interface FundingAmountRange {
  min: number;
  max: number;
}

// ============================================================================
// Grant Types (from Grants.gov API)
// ============================================================================

/**
 * Status of a grant opportunity in the federal system
 */
export type GrantStatus = 'forecasted' | 'posted' | 'closed';

/**
 * A grant opportunity from Grants.gov
 *
 * Represents federal funding opportunities that FQHCs can apply for.
 * Data is fetched from the Grants.gov API and cached locally.
 */
export interface Grant {
  /** Grants.gov opportunity ID (e.g., "HRSA-24-001") */
  id: string;

  /** Full title of the grant opportunity */
  title: string;

  /** Awarding agency abbreviation (e.g., "HHS", "HRSA", "CDC") */
  agency: string;

  /** Full description of the grant program and objectives */
  description: string;

  /** Who is eligible to apply - critical for FQHC matching */
  eligibilityDescription: string;

  /** Expected funding amount range */
  fundingAmount: FundingAmountRange;

  /** Application deadline - CFOs need this prominently displayed */
  deadline: Date;

  /** When the opportunity was posted to Grants.gov */
  postedDate: Date;

  /** Type of grant (e.g., "Discretionary", "Formula", "Competitive") */
  grantType: string;

  /** Catalog of Federal Domestic Assistance number for tracking */
  cfdaNumber: string;

  /** Current status in the grant lifecycle */
  status: GrantStatus;

  /** Direct link to the application system */
  applicationUrl: string;

  /** Link to the Grants.gov opportunity page for full details */
  sourceUrl: string;
}

/**
 * Simplified grant data for list views
 * Used when displaying multiple grants to reduce data transfer
 */
export interface GrantSummary {
  id: string;
  title: string;
  agency: string;
  fundingAmount: FundingAmountRange;
  deadline: Date;
  status: GrantStatus;
}

// ============================================================================
// FQHC Profile Types
// ============================================================================

/**
 * Organization profile for an FQHC
 *
 * Captures the characteristics needed for AI matching against grants.
 * The CFO fills this out once during onboarding.
 */
export interface FQHCProfile extends Timestamps {
  /** Unique identifier for the organization */
  id: string;

  /** Legal name of the organization */
  name: string;

  /** Employer Identification Number (required for 501c3 verification) */
  ein: string;

  /** Physical address of the primary location */
  address: Address;

  /**
   * Services provided by the FQHC
   * Examples: "primary care", "dental", "behavioral health", "HIV/AIDS services"
   * Used for matching against grant eligibility criteria
   */
  services: string[];

  /**
   * Demographics of patients served
   * Examples: "low-income", "uninsured", "homeless", "migrant workers"
   * Key factor in grant eligibility matching
   */
  patientDemographics: string[];

  /** Total number of staff members */
  staffCount: number;

  /** Annual operating budget in USD */
  annualBudget: number;

  /**
   * Names of currently active grants
   * Examples: "Ryan White Part A", "HRSA 330"
   * Important for avoiding conflicts and identifying complementary opportunities
   */
  activeGrants: string[];

  /** Whether the organization has official FQHC designation */
  fqhcDesignation: boolean;
}

/**
 * Input type for creating a new FQHC profile (without auto-generated fields)
 */
export type CreateFQHCProfileInput = Omit<FQHCProfile, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Input type for updating an existing FQHC profile
 */
export type UpdateFQHCProfileInput = Partial<Omit<FQHCProfile, 'id' | 'createdAt' | 'updatedAt'>>;

// ============================================================================
// Pipeline Types
// ============================================================================

/**
 * Status stages for grants in the pipeline
 *
 * Reflects the CFO's workflow from discovery to award:
 * - discovered: AI found a potentially matching grant
 * - evaluating: Team is reviewing fit and feasibility
 * - applying: Active work on the application
 * - submitted: Application sent, awaiting decision
 * - awarded: Grant received
 * - rejected: Application not selected
 */
export type PipelineStatus =
  | 'discovered'
  | 'evaluating'
  | 'applying'
  | 'submitted'
  | 'awarded'
  | 'rejected';

/**
 * A grant in the organization's pipeline
 *
 * Tracks a specific grant opportunity for a specific FQHC.
 * This is the core workflow entity the CFO interacts with.
 */
export interface PipelineItem {
  /** Unique identifier for the pipeline item */
  id: string;

  /** References the Grant.id this pipeline item tracks */
  grantId: string;

  /** References the FQHCProfile.id of the applying organization */
  fqhcProfileId: string;

  /** Current stage in the pipeline workflow */
  status: PipelineStatus;

  /**
   * AI-calculated fit score from 1-10
   * Helps CFO quickly prioritize which grants to pursue
   */
  fitScore: number;

  /**
   * AI-generated explanation of why this grant matches
   * 2-3 sentences explaining the key factors
   * Critical for the CFO's 10-minute/week time constraint
   */
  fitExplanation: string;

  /** Free-form notes from the team */
  notes: string;

  /** Team member assigned to this grant (null if unassigned) */
  assignedTo: string | null;

  /** When this grant was added to the pipeline */
  addedAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /**
   * Application deadline (copied from Grant for easy access)
   * Denormalized to avoid joins in deadline-critical views
   */
  deadline: Date;
}

/**
 * Input type for adding a grant to the pipeline
 */
export interface CreatePipelineItemInput {
  grantId: string;
  fqhcProfileId: string;
  fitScore: number;
  fitExplanation: string;
  deadline: Date;
  status?: PipelineStatus;
  notes?: string;
  assignedTo?: string | null;
}

/**
 * Input type for updating a pipeline item
 */
export type UpdatePipelineItemInput = Partial<
  Omit<PipelineItem, 'id' | 'grantId' | 'fqhcProfileId' | 'addedAt'>
>;

/**
 * Pipeline item with related grant data for display
 */
export interface PipelineItemWithGrant extends PipelineItem {
  grant: Grant;
}

// ============================================================================
// AI Matching Types
// ============================================================================

/**
 * AI-generated grant matching result
 *
 * Produced when the AI evaluates a grant against an FQHC profile.
 * Contains the reasoning the CFO needs to make quick decisions.
 */
export interface GrantMatch {
  /** The grant being evaluated */
  grantId: string;

  /** The FQHC profile used for matching */
  fqhcProfileId: string;

  /**
   * Overall fit score from 1-10
   * 1-3: Poor fit, likely ineligible
   * 4-6: Moderate fit, worth reviewing
   * 7-10: Strong fit, prioritize
   */
  fitScore: number;

  /**
   * Human-readable explanation of the match
   * 2-3 sentences that the CFO can scan quickly
   */
  fitExplanation: string;

  /**
   * Specific criteria that matched well
   * Examples: "HIV/AIDS services", "501c3 status", "California location"
   * Shown as tags/chips in the UI
   */
  matchedCriteria: string[];

  /**
   * Potential issues or conflicts to consider
   * Examples: "May conflict with HRSA 330 allocation", "Deadline is only 14 days away"
   * Helps CFO avoid surprises
   */
  potentialConcerns: string[];

  /** When this match was calculated */
  calculatedAt: Date;
}

/**
 * Input for requesting an AI match calculation
 */
export interface CalculateMatchInput {
  grantId: string;
  fqhcProfileId: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Filter and Search Types
// ============================================================================

/**
 * Filters for searching grants
 */
export interface GrantSearchFilters {
  query?: string;
  agency?: string;
  status?: GrantStatus;
  minAmount?: number;
  maxAmount?: number;
  deadlineBefore?: Date;
  deadlineAfter?: Date;
}

/**
 * Filters for viewing pipeline items
 */
export interface PipelineFilters {
  status?: PipelineStatus;
  assignedTo?: string;
  minFitScore?: number;
  deadlineBefore?: Date;
}
