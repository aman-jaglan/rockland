/**
 * Grants.gov API Client
 *
 * Provides functions to search and retrieve federal grant opportunities
 * from the Grants.gov API. Includes in-memory caching with 4-hour TTL,
 * persistent SQLite caching for grant details, and rule-based filtering
 * for FQHC-relevant grants.
 */

import type { Grant, GrantStatus, GrantWithMeta } from '../types';
import {
  getCachedGrants,
  saveGrantsToCache,
  markGrantsAsChecked,
  isGrantNew,
  type CachedGrant,
} from '../db/grants-cache';

// ============================================================================
// Configuration Constants
// ============================================================================

const GRANTS_GOV_SEARCH_URL = 'https://api.grants.gov/v1/api/search2';
const GRANTS_GOV_DETAILS_URL = 'https://api.grants.gov/v1/api/fetchOpportunity';

/** Cache TTL in milliseconds (4 hours) */
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

/** Maximum concurrent detail fetches to avoid overwhelming the API */
const MAX_CONCURRENT_FETCHES = 5;

/** Health-related agencies that are relevant to FQHCs */
const FQHC_RELEVANT_AGENCIES = ['HHS', 'HRSA', 'CDC', 'SAMHSA', 'NIH', 'CMS', 'ACF', 'AHRQ'];

/** Eligibility codes for nonprofits and community organizations */
const NONPROFIT_ELIGIBILITY_CODES = '11,12,13,21,22';

// ============================================================================
// Types
// ============================================================================

export interface GrantSearchParams {
  keyword?: string;
  agency?: string;
  fundingCategory?: string;
  status?: 'forecasted' | 'posted' | 'all';
  limit?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface GrantsGovOpportunity {
  id: string;
  number: string;
  title: string;
  agency: string;
  agencyCode: string;
  openDate: string;
  closeDate: string;
  oppStatus: string;
  docType: string;
  cfdaList?: string[];
}

interface GrantsGovApiResponse<T> {
  errorcode: number;
  msg: string;
  token?: string;
  data: T;
}

interface GrantsGovSearchData {
  oppHits: GrantsGovOpportunity[];
  hitCount: number;
}

interface GrantsGovDetailsData {
  id: number;
  opportunityNumber: string;
  opportunityTitle: string;
  owningAgencyCode: string;
  synopsis?: {
    synopsisDesc: string;
    postingDate: string;
    responseDate: string;
    archiveDate?: string;
    awardCeiling?: number;
    awardFloor?: number;
    applicantEligibilityDesc?: string;
  };
  agencyDetails?: {
    agencyCode: string;
    agencyName: string;
  };
  alns?: Array<{ programTitle: string; assistanceListingNumber: string }>;
  fundingInstruments?: Array<{ code: string; description: string }>;
}

// ============================================================================
// Cache Implementation
// ============================================================================

const cache = new Map<string, CacheEntry<unknown>>();

function getCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  return `${prefix}:${sortedParams}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return null;
  }

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setInCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clears expired entries from the cache.
 * Should be called periodically to prevent memory leaks.
 */
export function clearExpiredCache(): number {
  const now = Date.now();
  let clearedCount = 0;

  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
      clearedCount++;
    }
  }

  return clearedCount;
}

/**
 * Clears all cached data. Useful for testing or forcing fresh data.
 */
export function clearAllCache(): void {
  cache.clear();
}

// ============================================================================
// Date Parsing Utilities
// ============================================================================

/** Far future date used when no deadline is specified (forecasted grants) */
const FAR_FUTURE_DATE = new Date('2099-12-31');

/**
 * Parses a date string from Grants.gov format (MM/DD/YYYY) to a Date object.
 * Returns a far future date if the date string is empty (common for forecasted grants).
 */
function parseGrantsGovDate(dateString: string | undefined | null): Date {
  if (!dateString || dateString.trim() === '') {
    // For forecasted grants without close dates, use a far future date
    return FAR_FUTURE_DATE;
  }

  // Handle MM/DD/YYYY format
  const slashParts = dateString.split('/');
  if (slashParts.length === 3) {
    const month = parseInt(slashParts[0], 10) - 1;
    const day = parseInt(slashParts[1], 10);
    const year = parseInt(slashParts[2], 10);

    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  // Try ISO format as fallback
  const parsed = new Date(dateString);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return FAR_FUTURE_DATE;
}

/**
 * Maps Grants.gov status string to our GrantStatus type.
 */
function mapGrantStatus(oppStatus: string): GrantStatus {
  const normalizedStatus = oppStatus.toLowerCase();

  if (normalizedStatus === 'forecasted') {
    return 'forecasted';
  }
  if (normalizedStatus === 'posted') {
    return 'posted';
  }
  return 'closed';
}

// ============================================================================
// API Request Helpers
// ============================================================================

interface FetchApiOptions {
  method: 'GET' | 'POST';
  url: string;
  body?: Record<string, unknown>;
}

async function fetchFromGrantsGov<T>(options: FetchApiOptions): Promise<T> {
  const { method, url, body } = options;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  if (body && method === 'POST') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Grants.gov API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data as T;
}

// ============================================================================
// Grant Transformation
// ============================================================================

/**
 * Transforms a Grants.gov opportunity object to our Grant interface.
 *
 * Note: The search API returns limited fields. For full details including
 * description and funding amounts, use getGrantDetails().
 */
function transformOpportunityToGrant(opportunity: GrantsGovOpportunity): Grant {
  const cfdaNumber = opportunity.cfdaList?.[0] || '';

  // Extract agency code from agencyCode (e.g., "HHS-NIH11" -> "HHS")
  const agencyCode = opportunity.agencyCode?.split('-')[0] || opportunity.agency || 'Unknown';

  return {
    id: opportunity.id || opportunity.number,
    title: opportunity.title || 'Untitled Grant',
    agency: agencyCode,
    description: '', // Not available in search results, requires getGrantDetails
    eligibilityDescription: '', // Not available in search results
    fundingAmount: {
      min: 0, // Not available in search results
      max: 0, // Not available in search results
    },
    deadline: parseGrantsGovDate(opportunity.closeDate),
    postedDate: parseGrantsGovDate(opportunity.openDate),
    grantType: opportunity.docType || 'Grant',
    cfdaNumber,
    status: mapGrantStatus(opportunity.oppStatus || 'posted'),
    applicationUrl: `https://www.grants.gov/search-results-detail/${opportunity.id}`,
    sourceUrl: `https://www.grants.gov/search-results-detail/${opportunity.id}`,
  };
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Searches for grant opportunities on Grants.gov.
 *
 * @param params - Search parameters
 * @returns Array of grants matching the search criteria
 */
export async function searchGrants(params: GrantSearchParams = {}): Promise<Grant[]> {
  const {
    keyword = '',
    agency = '',
    fundingCategory = 'HL',
    status = 'all',
    limit = 25,
  } = params;

  // Build cache key
  const cacheKey = getCacheKey('search', { keyword, agency, fundingCategory, status, limit });

  // Check cache first
  const cachedResult = getFromCache<Grant[]>(cacheKey);
  if (cachedResult !== null) {
    return cachedResult;
  }

  // Build request body for Grants.gov API
  // Note: We don't filter by eligibilities here as it limits results too much.
  // FQHC filtering is done post-fetch via filterGrantsForFQHC.
  const requestBody: Record<string, unknown> = {
    sortBy: 'openDate|desc',
    rows: limit,
  };

  // Add funding category filter
  if (fundingCategory) {
    requestBody.fundingCategories = fundingCategory;
  }

  // Add keyword search
  if (keyword) {
    requestBody.keyword = keyword;
  }

  // Add agency filter
  if (agency) {
    requestBody.agencies = agency;
  }

  // Add status filter (Grants.gov uses pipe separator for multiple values)
  if (status === 'forecasted') {
    requestBody.oppStatuses = 'forecasted';
  } else if (status === 'posted') {
    requestBody.oppStatuses = 'posted';
  } else {
    requestBody.oppStatuses = 'forecasted|posted';
  }

  try {
    const response = await fetchFromGrantsGov<GrantsGovApiResponse<GrantsGovSearchData>>({
      method: 'POST',
      url: GRANTS_GOV_SEARCH_URL,
      body: requestBody,
    });

    // Check for API-level errors
    if (response.errorcode !== 0) {
      throw new Error(`Grants.gov API returned error: ${response.msg}`);
    }

    const grants = (response.data?.oppHits || []).map(transformOpportunityToGrant);

    // Store in cache
    setInCache(cacheKey, grants);

    return grants;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to search grants: ${errorMessage}`);
  }
}

/**
 * Retrieves detailed information about a specific grant opportunity.
 *
 * @param opportunityId - The Grants.gov opportunity ID (numeric string)
 * @returns The grant details, or null if not found
 */
export async function getGrantDetails(opportunityId: string): Promise<Grant | null> {
  if (!opportunityId) {
    return null;
  }

  // Build cache key
  const cacheKey = getCacheKey('details', { opportunityId });

  // Check cache first
  const cachedResult = getFromCache<Grant | null>(cacheKey);
  if (cachedResult !== null) {
    return cachedResult;
  }

  try {
    const response = await fetchFromGrantsGov<GrantsGovApiResponse<GrantsGovDetailsData>>({
      method: 'POST',
      url: GRANTS_GOV_DETAILS_URL,
      body: { opportunityId: parseInt(opportunityId, 10) },
    });

    // Check for API-level errors
    if (response.errorcode !== 0) {
      throw new Error(`Grants.gov API returned error: ${response.msg}`);
    }

    const data = response.data;
    if (!data) {
      setInCache(cacheKey, null);
      return null;
    }

    const synopsis = data.synopsis;
    const agencyCode = data.agencyDetails?.agencyCode || data.owningAgencyCode || 'Unknown Agency';
    const alnNumber = data.alns?.[0]?.assistanceListingNumber || '';
    const fundingInstrument = data.fundingInstruments?.[0]?.description || 'Grant';

    const grant: Grant = {
      id: String(data.id) || opportunityId,
      title: data.opportunityTitle || 'Untitled Grant',
      agency: agencyCode,
      description: synopsis?.synopsisDesc || '',
      eligibilityDescription: synopsis?.applicantEligibilityDesc || '',
      fundingAmount: {
        min: synopsis?.awardFloor || 0,
        max: synopsis?.awardCeiling || 0,
      },
      deadline: parseGrantsGovDate(synopsis?.responseDate),
      postedDate: parseGrantsGovDate(synopsis?.postingDate),
      grantType: fundingInstrument,
      cfdaNumber: alnNumber,
      status: synopsis?.archiveDate ? 'closed' : 'posted',
      applicationUrl: `https://www.grants.gov/web/grants/search-grants.html?keywords=${encodeURIComponent(data.opportunityNumber || opportunityId)}`,
      sourceUrl: `https://www.grants.gov/search-results-detail/${data.id || opportunityId}`,
    };

    // Store in cache
    setInCache(cacheKey, grant);

    return grant;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get grant details: ${errorMessage}`);
  }
}

// ============================================================================
// Rule-Based Filtering for FQHCs
// ============================================================================

/**
 * Filters grants to only include those relevant to FQHCs.
 *
 * Keeps grants where:
 * - Agency is health-related (HHS, HRSA, CDC, SAMHSA, NIH, etc.)
 * - Status is posted or forecasted (not closed)
 * - Deadline is in the future
 *
 * @param grants - Array of grants to filter
 * @returns Filtered array of FQHC-relevant grants
 */
export function filterGrantsForFQHC(grants: Grant[]): Grant[] {
  const now = new Date();

  return grants.filter((grant) => {
    // Check if agency is health-related
    const agencyIsRelevant = FQHC_RELEVANT_AGENCIES.some((relevantAgency) => {
      const grantAgencyUpper = grant.agency.toUpperCase();
      return grantAgencyUpper.includes(relevantAgency);
    });

    if (!agencyIsRelevant) {
      return false;
    }

    // Check if status is active (not closed)
    const statusIsActive = grant.status === 'posted' || grant.status === 'forecasted';
    if (!statusIsActive) {
      return false;
    }

    // Check if deadline is in the future
    const deadlineIsInFuture = grant.deadline > now;
    if (!deadlineIsInFuture) {
      return false;
    }

    return true;
  });
}

/**
 * Searches for grants and applies FQHC filtering.
 *
 * This is a convenience function that combines searchGrants and filterGrantsForFQHC.
 *
 * @param params - Search parameters
 * @returns Array of FQHC-relevant grants
 */
export async function searchGrantsForFQHC(params: GrantSearchParams = {}): Promise<Grant[]> {
  const grants = await searchGrants(params);
  return filterGrantsForFQHC(grants);
}

// ============================================================================
// Grant Detail Enrichment with Persistent Caching
// ============================================================================

/**
 * Fetches grant details in batches with rate limiting.
 * Processes up to MAX_CONCURRENT_FETCHES grants at a time.
 *
 * @param grantIds - Array of grant IDs to fetch details for
 * @returns Map of grantId -> Grant details (or null if fetch failed)
 */
async function fetchDetailsInBatches(grantIds: string[]): Promise<Map<string, Grant | null>> {
  const results = new Map<string, Grant | null>();

  if (grantIds.length === 0) {
    return results;
  }

  // Process in batches of MAX_CONCURRENT_FETCHES
  for (let i = 0; i < grantIds.length; i += MAX_CONCURRENT_FETCHES) {
    const batch = grantIds.slice(i, i + MAX_CONCURRENT_FETCHES);

    // Fetch all grants in this batch concurrently
    const batchPromises = batch.map(async (id) => {
      try {
        const details = await getGrantDetails(id);
        return { id, details };
      } catch (error) {
        console.error(`Failed to fetch details for grant ${id}:`, error);
        return { id, details: null };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const { id, details } of batchResults) {
      results.set(id, details);
    }
  }

  return results;
}

/**
 * Enriches basic grant data with full details.
 *
 * Flow:
 * 1. Check SQLite for cached grants
 * 2. Identify which grants need detail fetching (not in cache)
 * 3. Fetch details in parallel (max 5 concurrent)
 * 4. Save new grants to SQLite
 * 5. Return merged results with isNew flag
 *
 * @param basicGrants - Array of basic grants from search API
 * @returns Array of grants with full details and isNew metadata
 */
export async function enrichGrantsWithDetails(basicGrants: Grant[]): Promise<GrantWithMeta[]> {
  if (basicGrants.length === 0) {
    return [];
  }

  // Step 1: Get IDs and check SQLite cache
  const grantIds = basicGrants.map(g => g.id);
  let cachedGrants: Map<string, CachedGrant>;

  try {
    cachedGrants = await getCachedGrants(grantIds);
  } catch (error) {
    console.error('Failed to get cached grants:', error);
    cachedGrants = new Map();
  }

  // Step 2: Identify grants that need detail fetching
  const uncachedIds: string[] = [];
  for (const id of grantIds) {
    if (!cachedGrants.has(id)) {
      uncachedIds.push(id);
    }
  }

  // Step 3: Fetch details for uncached grants
  let newlyFetchedDetails: Map<string, Grant | null> = new Map();
  if (uncachedIds.length > 0) {
    newlyFetchedDetails = await fetchDetailsInBatches(uncachedIds);
  }

  // Step 4: Save newly fetched grants to SQLite
  const grantsToSave: Grant[] = [];
  for (const [id, details] of newlyFetchedDetails.entries()) {
    if (details) {
      grantsToSave.push(details);
    }
  }

  if (grantsToSave.length > 0) {
    try {
      await saveGrantsToCache(grantsToSave);
    } catch (error) {
      console.error('Failed to save grants to cache:', error);
    }
  }

  // Update lastCheckedAt for cached grants that were found in search results
  const cachedIds = Array.from(cachedGrants.keys());
  if (cachedIds.length > 0) {
    try {
      await markGrantsAsChecked(cachedIds);
    } catch (error) {
      console.error('Failed to mark grants as checked:', error);
    }
  }

  // Step 5: Build final results with isNew flag
  const results: GrantWithMeta[] = [];
  const now = new Date();

  for (const basicGrant of basicGrants) {
    const cached = cachedGrants.get(basicGrant.id);
    const newlyFetched = newlyFetchedDetails.get(basicGrant.id);

    let enrichedGrant: GrantWithMeta;

    if (cached) {
      // Use cached data with full details
      enrichedGrant = {
        ...cached,
        isNew: isGrantNew(cached.firstSeenAt),
        firstSeenAt: cached.firstSeenAt,
      };
    } else if (newlyFetched) {
      // Use newly fetched data - this is a new grant
      enrichedGrant = {
        ...newlyFetched,
        isNew: true, // Just discovered, so it's new
        firstSeenAt: now,
      };
    } else {
      // Fallback to basic grant data if fetch failed
      enrichedGrant = {
        ...basicGrant,
        isNew: true, // Assume new if we couldn't check cache
        firstSeenAt: now,
      };
    }

    results.push(enrichedGrant);
  }

  return results;
}
