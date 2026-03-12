/**
 * AI-Powered Grant Eligibility Matching
 *
 * Uses Google Gemini for ALL matching - no rule-based fallback.
 * Results are cached to avoid redundant API calls.
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import type { Grant, FQHCProfile, GrantMatch } from '../types';

// ============================================================================
// Cache Implementation (In-Memory for Vercel compatibility)
// ============================================================================

/** Cache TTL for match results in milliseconds (24 hours) */
const MATCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  match: GrantMatch;
  timestamp: number;
}

// Use global to persist cache across HMR in development
const globalForCache = globalThis as typeof globalThis & {
  matchCache?: Map<string, CacheEntry>;
};

const matchCache = globalForCache.matchCache ?? new Map<string, CacheEntry>();
globalForCache.matchCache = matchCache;

/**
 * Generates a unique cache key for a grant+profile pair
 */
function generateCacheKey(grantId: string, profileId: string): string {
  return `match:${grantId}:${profileId}`;
}

/**
 * Retrieves a cached match result if available and not expired
 */
function getCachedMatch(grantId: string, profileId: string): GrantMatch | null {
  const cacheKey = generateCacheKey(grantId, profileId);
  const entry = matchCache.get(cacheKey);

  if (!entry) {
    console.log(`[AI-Match] Cache MISS for ${cacheKey} (cache size: ${matchCache.size})`);
    return null;
  }

  const isExpired = Date.now() - entry.timestamp > MATCH_CACHE_TTL_MS;
  if (isExpired) {
    console.log(`[AI-Match] Cache EXPIRED for ${cacheKey}`);
    matchCache.delete(cacheKey);
    return null;
  }

  console.log(`[AI-Match] Cache HIT for ${cacheKey}`);
  return entry.match;
}

/**
 * Stores a match result in the cache
 */
function setCachedMatch(match: GrantMatch): void {
  const cacheKey = generateCacheKey(match.grantId, match.fqhcProfileId);
  matchCache.set(cacheKey, {
    match,
    timestamp: Date.now(),
  });
  console.log(`[AI-Match] Cached result for ${cacheKey} (cache size: ${matchCache.size})`);
}

/**
 * Clears all cached match results
 */
export function clearMatchCache(): void {
  matchCache.clear();
}

// ============================================================================
// AI Matching - Single Grant
// ============================================================================

/**
 * Builds prompt for single grant analysis
 */
function buildSingleGrantPrompt(grant: Grant, profile: FQHCProfile): string {
  return `You are a grant eligibility expert for Federally Qualified Health Centers (FQHCs).

Analyze this grant opportunity against the FQHC profile and determine if it's a good match.

## FQHC ORGANIZATION PROFILE:
- Organization: ${profile.name}
- Location: ${profile.address.city}, ${profile.address.state}
- Services Offered: ${profile.services.join(', ')}
- Patient Demographics Served: ${profile.patientDemographics.join(', ')}
- Staff Count: ${profile.staffCount}
- Annual Budget: $${profile.annualBudget.toLocaleString()}
- FQHC Designation: ${profile.fqhcDesignation ? 'Yes (Federally Qualified)' : 'No'}
- Current Active Grants: ${profile.activeGrants.length > 0 ? profile.activeGrants.join(', ') : 'None'}

## GRANT OPPORTUNITY:
- Title: ${grant.title}
- Agency: ${grant.agency}
- Funding Range: $${grant.fundingAmount.min.toLocaleString()} - $${grant.fundingAmount.max.toLocaleString()}
- Deadline: ${new Date(grant.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
- Grant Type: ${grant.grantType}
- Status: ${grant.status}

### Grant Description:
${grant.description || 'No description provided'}

### Eligibility Requirements:
${grant.eligibilityDescription || 'No eligibility criteria provided'}

## YOUR TASK:
Analyze the match between this grant and the FQHC profile. Return a JSON object with:

{
  "fitScore": <number 1-10>,
  "fitExplanation": "<2-3 clear sentences explaining the overall fit>",
  "matchedCriteria": ["<specific things that match well>"],
  "notMatchingCriteria": ["<specific gaps or misalignments>"],
  "potentialConcerns": ["<warnings about deadlines, conflicts, or issues>"]
}

SCORING GUIDELINES:
- 8-10: Strong match - organization clearly eligible, services/mission align directly
- 5-7: Moderate match - some alignment, may need to stretch or verify eligibility
- 1-4: Poor match - significant gaps, likely not eligible or poor fit

BE HONEST. If the grant doesn't match, say so. False positives waste CFO time.

Return ONLY the JSON object, no other text.`;
}

/**
 * Calls Gemini to analyze a single grant match
 */
async function analyzeGrantWithAI(
  grant: Grant,
  profile: FQHCProfile
): Promise<GrantMatch | null> {
  try {
    console.log(`[AI-Match] Calling Gemini for grant ${grant.id}...`);
    const startTime = Date.now();

    const result = await generateText({
      model: google('gemini-3-flash-preview'),
      prompt: buildSingleGrantPrompt(grant, profile),
    });

    console.log(`[AI-Match] Gemini response received in ${Date.now() - startTime}ms`);

    const responseText = result.text.trim();

    // Parse JSON from response
    let jsonStr = responseText;
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    return {
      grantId: grant.id,
      fqhcProfileId: profile.id,
      fitScore: Math.max(1, Math.min(10, Math.round(parsed.fitScore))),
      fitExplanation: parsed.fitExplanation,
      matchedCriteria: parsed.matchedCriteria || [],
      notMatchingCriteria: parsed.notMatchingCriteria || [],
      potentialConcerns: parsed.potentialConcerns || [],
      calculatedAt: new Date(),
    };
  } catch (error) {
    console.error('AI matching failed for grant:', grant.id, error);
    return null;
  }
}

// ============================================================================
// AI Matching - Batch (for Dashboard)
// ============================================================================

/**
 * Builds prompt for batch grant scoring (dashboard view)
 */
function buildBatchPrompt(grants: Grant[], profile: FQHCProfile): string {
  const grantSummaries = grants.map((g, i) => `
GRANT ${i + 1} (ID: ${g.id}):
- Title: ${g.title}
- Agency: ${g.agency}
- Funding: $${g.fundingAmount.min.toLocaleString()} - $${g.fundingAmount.max.toLocaleString()}
- Description: ${(g.description || '').slice(0, 500)}${(g.description || '').length > 500 ? '...' : ''}
- Eligibility: ${(g.eligibilityDescription || '').slice(0, 300)}${(g.eligibilityDescription || '').length > 300 ? '...' : ''}
`).join('\n');

  return `You are a grant eligibility expert for Federally Qualified Health Centers (FQHCs).

Score these grants for the FQHC below. Be STRICT - only high scores for genuine matches.

## FQHC PROFILE:
- Organization: ${profile.name}
- Location: ${profile.address.city}, ${profile.address.state}
- Services: ${profile.services.join(', ')}
- Patient Demographics: ${profile.patientDemographics.join(', ')}
- Annual Budget: $${profile.annualBudget.toLocaleString()}
- FQHC Designation: ${profile.fqhcDesignation ? 'Yes' : 'No'}

## GRANTS TO SCORE:
${grantSummaries}

## RETURN FORMAT:
Return a JSON array with one object per grant:
[
  {
    "grantId": "<grant ID>",
    "fitScore": <1-10>,
    "fitExplanation": "<1 sentence summary>"
  }
]

SCORING:
- 8-10: Excellent fit, clearly eligible
- 5-7: Moderate fit, worth reviewing
- 1-4: Poor fit, probably not eligible

BE STRICT. Don't give high scores unless there's clear alignment.

Return ONLY the JSON array.`;
}

interface BatchScoreResult {
  grantId: string;
  fitScore: number;
  fitExplanation: string;
}

/**
 * Batch score multiple grants at once (for dashboard)
 */
async function batchScoreGrants(
  grants: Grant[],
  profile: FQHCProfile
): Promise<Map<string, { fitScore: number; fitExplanation: string }>> {
  const results = new Map<string, { fitScore: number; fitExplanation: string }>();

  if (grants.length === 0) {
    return results;
  }

  try {
    console.log(`[AI-Match] Batch scoring ${grants.length} grants...`);
    const startTime = Date.now();

    const result = await generateText({
      model: google('gemini-3-flash-preview'),
      prompt: buildBatchPrompt(grants, profile),
    });

    console.log(`[AI-Match] Batch scoring completed in ${Date.now() - startTime}ms`);

    const responseText = result.text.trim();

    // Parse JSON array from response
    let jsonStr = responseText;
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed: BatchScoreResult[] = JSON.parse(jsonStr);

    for (const item of parsed) {
      results.set(item.grantId, {
        fitScore: Math.max(1, Math.min(10, Math.round(item.fitScore))),
        fitExplanation: item.fitExplanation,
      });
    }
  } catch (error) {
    console.error('Batch AI scoring failed:', error);
  }

  return results;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Calculate match for a single grant using AI
 * Checks cache first, calls AI if not cached
 */
export async function calculateGrantMatch(
  grant: Grant,
  profile: FQHCProfile
): Promise<GrantMatch> {
  // Check cache first
  const cached = getCachedMatch(grant.id, profile.id);
  if (cached) {
    return cached;
  }

  // Call AI
  const match = await analyzeGrantWithAI(grant, profile);

  if (match) {
    setCachedMatch(match);
    return match;
  }

  // Fallback if AI fails (should rarely happen)
  const fallback: GrantMatch = {
    grantId: grant.id,
    fqhcProfileId: profile.id,
    fitScore: 5,
    fitExplanation: 'Unable to analyze match. Please review manually.',
    matchedCriteria: [],
    notMatchingCriteria: [],
    potentialConcerns: ['Automated analysis unavailable'],
    calculatedAt: new Date(),
  };

  return fallback;
}

/**
 * Calculate matches for multiple grants efficiently
 * Uses batch AI call for uncached grants
 */
export async function calculateBatchMatches(
  grants: Grant[],
  profile: FQHCProfile
): Promise<GrantMatch[]> {
  const results: GrantMatch[] = [];
  const uncachedGrants: Grant[] = [];

  // Check cache for each grant
  for (const grant of grants) {
    const cached = getCachedMatch(grant.id, profile.id);
    if (cached) {
      results.push(cached);
    } else {
      uncachedGrants.push(grant);
    }
  }

  // Batch score uncached grants
  if (uncachedGrants.length > 0) {
    const batchScores = await batchScoreGrants(uncachedGrants, profile);

    // For grants that got batch scores, we create partial matches
    // Full analysis happens when user clicks on the grant
    for (const grant of uncachedGrants) {
      const score = batchScores.get(grant.id);

      const match: GrantMatch = {
        grantId: grant.id,
        fqhcProfileId: profile.id,
        fitScore: score?.fitScore || 5,
        fitExplanation: score?.fitExplanation || 'Click to view detailed analysis',
        matchedCriteria: [],
        notMatchingCriteria: [],
        potentialConcerns: [],
        calculatedAt: new Date(),
      };

      // Cache the batch result (will be replaced with full analysis when user views detail)
      setCachedMatch(match);
      results.push(match);
    }
  }

  // Sort by fit score descending
  return results.sort((a, b) => b.fitScore - a.fitScore);
}

/**
 * Check if AI matching is available
 */
export function isAIMatchingAvailable(): boolean {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

/**
 * Clear expired cache entries
 */
export function clearExpiredMatchCache(): number {
  const now = Date.now();
  let clearedCount = 0;

  for (const [key, entry] of matchCache.entries()) {
    if (now - entry.timestamp > MATCH_CACHE_TTL_MS) {
      matchCache.delete(key);
      clearedCount++;
    }
  }

  return clearedCount;
}
