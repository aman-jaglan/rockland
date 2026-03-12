import { Suspense } from "react";
import type { GrantWithMeta, GrantWithMatch } from "@/lib/types";
import { DiscoverClientWrapper } from "./discover-client";
import { calculateBatchMatches } from "@/lib/api/ai-matching";
import { SYNTHETIC_PROFILE } from "@/lib/data/synthetic-profile";

/**
 * Force dynamic rendering to avoid build-time fetch errors
 */
export const dynamic = "force-dynamic";

/**
 * Fetch grants from the API
 */
async function fetchGrants(): Promise<GrantWithMeta[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/grants?fqhcOnly=true&limit=100`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch grants:", response.status);
      return [];
    }

    const data = await response.json();

    if (!data.success) {
      console.error("API error:", data.error);
      return [];
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching grants:", error);
    return [];
  }
}

/**
 * Compute match scores for grants
 */
async function computeMatches(grants: GrantWithMeta[]): Promise<GrantWithMatch[]> {
  if (grants.length === 0) {
    return [];
  }

  try {
    const matches = await calculateBatchMatches(grants, SYNTHETIC_PROFILE);

    const grantsWithMatches: GrantWithMatch[] = [];

    for (const match of matches) {
      const grant = grants.find((g) => g.id === match.grantId);
      if (grant) {
        grantsWithMatches.push({ grant, match });
      }
    }

    return grantsWithMatches;
  } catch (error) {
    console.error("Error computing matches:", error);
    return [];
  }
}

/**
 * Loading skeleton
 */
function DiscoverSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Server component that fetches and computes matches
 */
async function DiscoverContent() {
  const grants = await fetchGrants();
  const grantsWithMatches = await computeMatches(grants);

  return <DiscoverClientWrapper grantsWithMatches={grantsWithMatches} />;
}

/**
 * Discover Page
 */
export default function DiscoverPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Discover Grants
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Find FQHC-relevant federal funding opportunities with AI-powered match scores.
        </p>
      </div>

      {/* Grants Content with Suspense */}
      <Suspense fallback={<DiscoverSkeleton />}>
        <DiscoverContent />
      </Suspense>
    </div>
  );
}
