// Re-export useChat from @ai-sdk/react for convenience
export { useChat } from '@ai-sdk/react';

import type { FQHCProfile, Grant } from '../types';

/**
 * Builds a context string from FQHC profile and grant for AI chat
 */
export function buildChatContext(profile: FQHCProfile | null, grant: Grant | null): string {
  const parts: string[] = [];

  if (profile) {
    parts.push(`Organization: ${profile.name}`);
    parts.push(`Services: ${profile.services.join(', ')}`);
    parts.push(`Patient Demographics: ${profile.patientDemographics.join(', ')}`);
    parts.push(`Location: ${profile.address.city}, ${profile.address.state}`);
    parts.push(`Staff Count: ${profile.staffCount}`);
    parts.push(`Annual Budget: $${profile.annualBudget.toLocaleString()}`);
    if (profile.activeGrants.length > 0) {
      parts.push(`Active Grants: ${profile.activeGrants.join(', ')}`);
    }
  }

  if (grant) {
    parts.push(`\nGrant Being Discussed:`);
    parts.push(`Title: ${grant.title}`);
    parts.push(`Agency: ${grant.agency}`);
    parts.push(`Funding: $${grant.fundingAmount.min.toLocaleString()} - $${grant.fundingAmount.max.toLocaleString()}`);
    const deadline = grant.deadline instanceof Date
      ? grant.deadline.toLocaleDateString()
      : new Date(grant.deadline).toLocaleDateString();
    parts.push(`Deadline: ${deadline}`);
    if (grant.description) {
      parts.push(`Description: ${grant.description}`);
    }
    if (grant.eligibilityDescription) {
      parts.push(`Eligibility: ${grant.eligibilityDescription}`);
    }
  }

  return parts.join('\n');
}
