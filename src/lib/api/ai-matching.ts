/**
 * AI-Powered Grant Eligibility Matching
 *
 * Provides intelligent matching between grants and FQHC profiles.
 * Uses a hybrid approach:
 * - Google Gemini API if GOOGLE_API_KEY is available
 * - Rule-based fallback if no API key or API fails
 *
 * Includes caching to avoid redundant API calls for the same grant+profile pair.
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import type { Grant, FQHCProfile, GrantMatch } from '../types';

// ============================================================================
// Configuration
// ============================================================================

/** Cache TTL for match results in milliseconds (4 hours) */
const MATCH_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

/** Health-related agencies most relevant to FQHCs */
const FQHC_PRIORITY_AGENCIES = ['HRSA', 'HHS', 'CDC', 'SAMHSA', 'NIH', 'CMS', 'ACF', 'AHRQ'];

/** Days threshold for urgent deadline warning */
const URGENT_DEADLINE_DAYS = 14;

/** Keywords that indicate strong FQHC relevance */
const FQHC_RELEVANT_KEYWORDS = [
  'community health',
  'federally qualified',
  'fqhc',
  'health center',
  'primary care',
  'underserved',
  'low-income',
  'uninsured',
  'medicaid',
  'health equity',
  'rural health',
  'migrant health',
  'homeless health',
  'behavioral health',
  'substance abuse',
  'mental health',
  'maternal health',
  'pediatric',
  'dental',
  'hiv',
  'aids',
  'chronic disease',
  'diabetes',
  'hypertension',
  'prevention',
  'workforce',
  'telehealth',
];

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry {
  match: GrantMatch;
  timestamp: number;
}

const matchCache = new Map<string, CacheEntry>();

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
    return null;
  }

  const isExpired = Date.now() - entry.timestamp > MATCH_CACHE_TTL_MS;
  if (isExpired) {
    matchCache.delete(cacheKey);
    return null;
  }

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
}

/**
 * Clears all cached match results
 */
export function clearMatchCache(): void {
  matchCache.clear();
}

/**
 * Clears expired match cache entries
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

// ============================================================================
// AI Prompt Building
// ============================================================================

/**
 * Builds a structured prompt for AI-based grant matching
 */
function buildAIMatchPrompt(grant: Grant, profile: FQHCProfile): string {
  const fundingMin = grant.fundingAmount.min.toLocaleString();
  const fundingMax = grant.fundingAmount.max.toLocaleString();
  const deadlineStr = grant.deadline instanceof Date
    ? grant.deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date(grant.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return `You are a grant eligibility expert for Federally Qualified Health Centers (FQHCs).

FQHC Profile:
- Name: ${profile.name}
- Services: ${profile.services.join(', ')}
- Patient Demographics: ${profile.patientDemographics.join(', ')}
- Location: ${profile.address.city}, ${profile.address.state}
- Active Grants: ${profile.activeGrants.length > 0 ? profile.activeGrants.join(', ') : 'None listed'}
- Staff: ${profile.staffCount}
- Annual Budget: $${profile.annualBudget.toLocaleString()}
- FQHC Designation: ${profile.fqhcDesignation ? 'Yes' : 'No'}

Grant Opportunity:
- Title: ${grant.title}
- Agency: ${grant.agency}
- Description: ${grant.description || 'No description available'}
- Eligibility: ${grant.eligibilityDescription || 'No eligibility criteria listed'}
- Funding: $${fundingMin} - $${fundingMax}
- Deadline: ${deadlineStr}
- Status: ${grant.status}
- Grant Type: ${grant.grantType}

Score this grant's fit for this FQHC on a scale of 1-10.
Provide your analysis in the following JSON format only:

{
  "fitScore": <number 1-10>,
  "fitExplanation": "<2-3 sentences explaining why this score>",
  "matchedCriteria": ["<list of matching factors>"],
  "notMatchingCriteria": ["<list of gaps or aspects that don't align>"],
  "potentialConcerns": ["<any concerns or conflicts>"]
}

Important scoring guidelines:
- 8-10: Strong fit - FQHC clearly eligible, services/demographics align, agency is relevant
- 5-7: Moderate fit - Some alignment, may need to verify specific eligibility requirements
- 1-4: Poor fit - Limited alignment, likely ineligible, or significant conflicts

For notMatchingCriteria, identify specific gaps like:
- Services the FQHC offers that aren't mentioned in the grant
- Demographics served that aren't targeted
- Geographic mismatches
- Only include REAL gaps, not every possible thing

Respond with only the JSON object, no additional text.`;
}

/**
 * Parses AI response JSON into a match result
 */
function parseAIResponse(
  responseText: string,
  grantId: string,
  profileId: string
): GrantMatch | null {
  try {
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText.trim();
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

    // Validate required fields
    if (
      typeof parsed.fitScore !== 'number' ||
      typeof parsed.fitExplanation !== 'string' ||
      !Array.isArray(parsed.matchedCriteria) ||
      !Array.isArray(parsed.potentialConcerns)
    ) {
      return null;
    }

    // Ensure score is within bounds
    const fitScore = Math.max(1, Math.min(10, Math.round(parsed.fitScore)));

    return {
      grantId,
      fqhcProfileId: profileId,
      fitScore,
      fitExplanation: parsed.fitExplanation,
      matchedCriteria: parsed.matchedCriteria,
      notMatchingCriteria: parsed.notMatchingCriteria || [],
      potentialConcerns: parsed.potentialConcerns,
      calculatedAt: new Date(),
    };
  } catch {
    return null;
  }
}

// ============================================================================
// AI API Integration (Google Gemini)
// ============================================================================

/**
 * Calls Google Gemini API to calculate grant match
 * Uses Vercel AI SDK with gemini-3-flash-preview model
 * Returns null if API call fails
 */
async function callGeminiAPI(
  grant: Grant,
  profile: FQHCProfile
): Promise<GrantMatch | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = buildAIMatchPrompt(grant, profile);

  try {
    const result = await generateText({
      model: google('gemini-3-flash-preview'),
      prompt,
    });

    const responseText = result.text;

    if (!responseText) {
      return null;
    }

    return parseAIResponse(responseText, grant.id, profile.id);
  } catch (error) {
    console.error('Gemini API call failed:', error);
    return null;
  }
}

// ============================================================================
// Rule-Based Matching (Fallback)
// ============================================================================

/**
 * Calculates days until deadline
 */
function getDaysUntilDeadline(deadline: Date): number {
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  const now = new Date();
  return Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Checks if text contains any of the keywords (case-insensitive)
 */
function containsKeywords(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  return keywords.filter((keyword) => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Rule-based grant matching when AI API is unavailable
 * Uses structured scoring based on multiple factors
 * Tracks both what matches AND what doesn't match
 */
export function calculateRuleBasedMatch(
  grant: Grant,
  profile: FQHCProfile
): GrantMatch {
  let score = 5; // Base score
  const matchedCriteria: string[] = [];
  const notMatchingCriteria: string[] = [];
  const potentialConcerns: string[] = [];

  const grantText = `${grant.title} ${grant.description || ''} ${grant.eligibilityDescription || ''}`.toLowerCase();
  const agencyUpper = grant.agency.toUpperCase();

  // =========================================================================
  // Factor 1: Agency relevance (+1 to +2)
  // =========================================================================
  const isHRSA = agencyUpper.includes('HRSA');
  const isHealthAgency = FQHC_PRIORITY_AGENCIES.some((agency) => agencyUpper.includes(agency));

  if (isHRSA) {
    score += 2;
    matchedCriteria.push('HRSA is the primary agency for FQHCs');
  } else if (isHealthAgency) {
    score += 1;
    matchedCriteria.push(`${grant.agency} is a health-related federal agency`);
  } else {
    notMatchingCriteria.push(`${grant.agency} is not a primary FQHC funding agency`);
  }

  // =========================================================================
  // Factor 2: Services alignment (+1 for each match, max +2)
  // =========================================================================
  const servicesFound = profile.services.filter((service) =>
    grantText.includes(service.toLowerCase())
  );
  const servicesNotFound = profile.services.filter((service) =>
    !grantText.includes(service.toLowerCase())
  );

  if (servicesFound.length > 0) {
    score += Math.min(servicesFound.length, 2);
    matchedCriteria.push(`Grant aligns with your services: ${servicesFound.slice(0, 3).join(', ')}`);
  }

  // Only mention services gap if NO services matched
  if (servicesFound.length === 0 && servicesNotFound.length > 0) {
    notMatchingCriteria.push(`Grant does not mention your services (${servicesNotFound.slice(0, 2).join(', ')})`);
  }

  // =========================================================================
  // Factor 3: Demographics alignment (+1)
  // =========================================================================
  const demographicsFound = profile.patientDemographics.filter((demo) =>
    grantText.includes(demo.toLowerCase())
  );
  const demographicsNotFound = profile.patientDemographics.filter((demo) =>
    !grantText.includes(demo.toLowerCase())
  );

  if (demographicsFound.length > 0) {
    score += 1;
    matchedCriteria.push(`Grant targets your patient demographics: ${demographicsFound.slice(0, 3).join(', ')}`);
  }

  // Only mention demographics gap if NO demographics matched
  if (demographicsFound.length === 0 && demographicsNotFound.length > 0) {
    notMatchingCriteria.push(`Grant does not specifically target your patient demographics`);
  }

  // =========================================================================
  // Factor 4: State/location match (+1)
  // =========================================================================
  const locationMatches =
    grantText.includes(profile.address.state.toLowerCase()) ||
    grantText.includes(profile.address.city.toLowerCase());
  const isNational = grantText.includes('national') || grantText.includes('all states') || grantText.includes('nationwide');

  if (locationMatches) {
    score += 1;
    matchedCriteria.push(`Grant mentions your location: ${profile.address.city}, ${profile.address.state}`);
  } else if (isNational) {
    matchedCriteria.push('Grant is available nationwide');
  }
  // Don't mark location as "not matching" since most federal grants are national

  // =========================================================================
  // Factor 5: FQHC-specific keywords (+1)
  // =========================================================================
  const keywordsFound = containsKeywords(grantText, FQHC_RELEVANT_KEYWORDS);
  const fqhcExplicitlyMentioned =
    grantText.includes('fqhc') ||
    grantText.includes('federally qualified') ||
    grantText.includes('health center');

  if (fqhcExplicitlyMentioned) {
    score += 1;
    matchedCriteria.push('Grant specifically targets FQHCs or health centers');
  } else if (keywordsFound.length >= 3) {
    score += 1;
    matchedCriteria.push('Grant contains multiple FQHC-relevant terms');
  } else if (keywordsFound.length >= 1) {
    matchedCriteria.push(`Grant mentions relevant topics: ${keywordsFound.slice(0, 2).join(', ')}`);
  } else if (!isHRSA && !isHealthAgency) {
    // Only flag FQHC targeting if agency is also not health-related
    notMatchingCriteria.push('Grant does not specifically mention FQHCs or community health');
  }

  // =========================================================================
  // Factor 6: Deadline urgency (-1 if too soon)
  // =========================================================================
  const daysUntilDeadline = getDaysUntilDeadline(grant.deadline);
  if (daysUntilDeadline >= 0 && daysUntilDeadline < URGENT_DEADLINE_DAYS) {
    score -= 1;
    potentialConcerns.push(`Deadline is only ${daysUntilDeadline} days away`);
  } else if (daysUntilDeadline < 0) {
    score -= 3;
    potentialConcerns.push('Deadline has passed');
  }

  // =========================================================================
  // Factor 7: Funding amount reasonableness
  // =========================================================================
  const minFunding = grant.fundingAmount.min;
  const maxFunding = grant.fundingAmount.max;
  if (maxFunding > 0 && maxFunding < 10000) {
    potentialConcerns.push('Small funding amount may not justify application effort');
  } else if (minFunding > profile.annualBudget * 0.5) {
    potentialConcerns.push('Minimum award is large relative to your annual budget');
  }

  // =========================================================================
  // Factor 8: FQHC designation
  // =========================================================================
  if (profile.fqhcDesignation) {
    matchedCriteria.push('Your FQHC designation qualifies you for health center grants');
  }

  // =========================================================================
  // Factor 9: Check for potential conflicts with active grants
  // =========================================================================
  const activeGrantsLower = profile.activeGrants.map((g) => g.toLowerCase());
  const grantTitleLower = grant.title.toLowerCase();
  const potentialConflict = activeGrantsLower.find(
    (activeGrant) =>
      grantTitleLower.includes(activeGrant.slice(0, 15)) ||
      activeGrant.includes(grantTitleLower.slice(0, 15))
  );
  if (potentialConflict) {
    potentialConcerns.push(`May overlap with your existing grant: ${potentialConflict}`);
  }

  // =========================================================================
  // Ensure score stays within 1-10 range
  // =========================================================================
  score = Math.max(1, Math.min(10, score));

  // =========================================================================
  // Generate explanation based on score
  // =========================================================================
  let fitExplanation: string;
  if (score >= 8) {
    fitExplanation = `Strong match for your FQHC. ${matchedCriteria.slice(0, 2).join('. ')}. This grant aligns well with your organization's mission and capabilities.`;
  } else if (score >= 5) {
    fitExplanation = `Moderate match worth reviewing. ${matchedCriteria.length > 0 ? matchedCriteria[0] + '.' : ''} Review eligibility criteria to confirm fit with your specific services and patient population.`;
  } else {
    fitExplanation = `Limited alignment with your FQHC profile. ${notMatchingCriteria.length > 0 ? notMatchingCriteria[0] + '.' : ''} Consider whether this grant's focus matches your organization's priorities.`;
  }

  return {
    grantId: grant.id,
    fqhcProfileId: profile.id,
    fitScore: score,
    fitExplanation,
    matchedCriteria,
    notMatchingCriteria,
    potentialConcerns,
    calculatedAt: new Date(),
  };
}

// ============================================================================
// Main Matching Function (Hybrid Approach)
// ============================================================================

/**
 * Calculates grant match using AI if available, with rule-based fallback
 *
 * Priority:
 * 1. Return cached result if available
 * 2. Try Google Gemini API
 * 3. Fall back to rule-based matching
 *
 * Results are cached to prevent redundant API calls.
 */
export async function calculateGrantMatch(
  grant: Grant,
  profile: FQHCProfile
): Promise<GrantMatch> {
  // Check cache first
  const cachedMatch = getCachedMatch(grant.id, profile.id);
  if (cachedMatch) {
    return cachedMatch;
  }

  // Try Gemini API
  let match: GrantMatch | null = null;
  match = await callGeminiAPI(grant, profile);

  // Fall back to rule-based if AI unavailable
  if (!match) {
    match = calculateRuleBasedMatch(grant, profile);
  }

  // Cache the result
  setCachedMatch(match);

  return match;
}

/**
 * Calculates matches for multiple grants in parallel
 * Returns matches sorted by fit score (highest first)
 */
export async function calculateBatchMatches(
  grants: Grant[],
  profile: FQHCProfile
): Promise<GrantMatch[]> {
  const matchPromises = grants.map((grant) => calculateGrantMatch(grant, profile));
  const matches = await Promise.all(matchPromises);

  // Sort by fit score descending
  return matches.sort((a, b) => b.fitScore - a.fitScore);
}

/**
 * Checks if AI matching is available (Google API key configured)
 */
export function isAIMatchingAvailable(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}
