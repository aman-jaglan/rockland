// Re-export useChat from @ai-sdk/react for convenience
export { useChat } from '@ai-sdk/react';

import type { FQHCProfile, Grant } from '../types';

// Helper to build context string from profile and grant
export function buildChatContext(profile: FQHCProfile | null, grant: Grant | null): string {
  const parts: string[] = [];

  if (profile) {
    parts.push(`Organization: ${profile.name}`);
    parts.push(`Services: ${profile.services.join(', ')}`);
    parts.push(`Patient Demographics: ${profile.patientDemographics.join(', ')}`);
    parts.push(`Location: ${profile.address.city}, ${profile.address.state}`);
    parts.push(`Active Grants: ${profile.activeGrants.join(', ')}`);
  }

  if (grant) {
    parts.push(`\nGrant Being Discussed:`);
    parts.push(`Title: ${grant.title}`);
    parts.push(`Agency: ${grant.agency}`);
    parts.push(`Funding: $${grant.fundingAmount.min} - $${grant.fundingAmount.max}`);
    parts.push(`Deadline: ${grant.deadline}`);
    parts.push(`Description: ${grant.description}`);
    parts.push(`Eligibility: ${grant.eligibilityDescription}`);
  }

  return parts.join('\n');
}
