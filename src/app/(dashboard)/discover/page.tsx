import { Suspense } from "react";
import type { Grant } from "@/lib/types";
import { GrantList } from "@/components/features/grants/grant-list";
import { DiscoverClientWrapper } from "./discover-client";

/**
 * Force dynamic rendering to avoid build-time fetch errors
 */
export const dynamic = "force-dynamic";

/**
 * Fetch grants from the API
 */
async function fetchGrants(): Promise<Grant[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/grants?fqhcOnly=true`, {
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
 * Loading skeleton for the grants list
 */
function GrantListSkeleton() {
  return <GrantList grants={[]} loading={true} />;
}

/**
 * Server component that fetches and displays grants
 */
async function GrantsContent() {
  const grants = await fetchGrants();

  return <DiscoverClientWrapper initialGrants={grants} />;
}

/**
 * Discover Page
 *
 * Main grant discovery page for finding FQHC-relevant grants.
 * Server component that fetches grants from /api/grants?fqhcOnly=true.
 * Uses Suspense for loading state.
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
          Find FQHC-relevant federal funding opportunities. Add promising grants to your pipeline for tracking.
        </p>
      </div>

      {/* Grants Content with Suspense */}
      <Suspense fallback={<GrantListSkeleton />}>
        <GrantsContent />
      </Suspense>
    </div>
  );
}
