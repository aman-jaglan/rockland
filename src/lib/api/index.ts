/**
 * API Client Exports
 *
 * Central export point for all API client functions.
 * Import from this file rather than individual API modules.
 */

// Grants.gov API
export {
  searchGrants,
  searchGrantsForFQHC,
  getGrantDetails,
  filterGrantsForFQHC,
  clearExpiredCache,
  clearAllCache,
  type GrantSearchParams,
} from './grants-gov';

// AI Matching API
export {
  calculateGrantMatch,
  calculateBatchMatches,
  isAIMatchingAvailable,
  clearMatchCache,
  clearExpiredMatchCache,
} from './ai-matching';

// AI Chat API
export { useChat, buildChatContext } from './ai-chat';

// Synthetic Profile (Demo Mode)
export {
  SYNTHETIC_PROFILE,
  getSyntheticProfile,
  isDemoMode,
} from '../data/synthetic-profile';
