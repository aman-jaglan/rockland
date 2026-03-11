"use client";

import { useState } from "react";
import { GrantFilters } from "@/components/features/grants/grant-filters";
import { GrantList } from "@/components/features/grants/grant-list";
import type { Grant, GrantSearchFilters } from "@/lib/types";

interface DiscoverClientWrapperProps {
  initialGrants: Grant[];
}

/**
 * Client-side filtering of grants
 *
 * For prototype, filtering happens client-side.
 * In production, this would make API calls with filter params.
 */
function filterGrants(grants: Grant[], filters: GrantSearchFilters): Grant[] {
  return grants.filter((grant) => {
    // Keyword search - check title and description
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const matchesTitle = grant.title.toLowerCase().includes(query);
      const matchesDescription = grant.description.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDescription) {
        return false;
      }
    }

    // Agency filter - use includes() because agency can be "HHS-NIH11" and filter is "HHS" or "NIH"
    if (filters.agency) {
      const agencyUpper = grant.agency.toUpperCase();
      const filterAgencyUpper = filters.agency.toUpperCase();
      if (!agencyUpper.includes(filterAgencyUpper)) {
        return false;
      }
    }

    // Status filter
    if (filters.status && grant.status !== filters.status) {
      return false;
    }

    return true;
  });
}

/**
 * Discover Client Wrapper
 *
 * Handles client-side interactivity for the discover page:
 * - Filter state management
 * - Client-side filtering
 * - Add to pipeline functionality
 */
export function DiscoverClientWrapper({ initialGrants }: DiscoverClientWrapperProps) {
  const [filters, setFilters] = useState<GrantSearchFilters>({});
  const [addedGrants, setAddedGrants] = useState<Set<string>>(new Set());

  const filteredGrants = filterGrants(initialGrants, filters);

  function handleFilterChange(newFilters: GrantSearchFilters) {
    setFilters(newFilters);
  }

  function handleAddToPipeline(grant: Grant) {
    // For prototype, just track that the grant was added
    // In production, this would make an API call to create a pipeline item
    setAddedGrants((prev) => new Set(prev).add(grant.id));

    // Show a simple notification (could be replaced with a toast component)
    console.log(`Added grant "${grant.title}" to pipeline with status "discovered"`);

    // In a real implementation, we would call:
    // await fetch('/api/pipeline', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     grantId: grant.id,
    //     status: 'discovered',
    //     ...
    //   })
    // });
  }

  return (
    <>
      <GrantFilters onFilterChange={handleFilterChange} initialFilters={filters} />

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredGrants.length} of {initialGrants.length} grants
      </div>

      <GrantList grants={filteredGrants} onAddToPipeline={handleAddToPipeline} />
    </>
  );
}
