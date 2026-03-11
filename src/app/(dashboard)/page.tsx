import { Suspense } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { TopMatches, type GrantWithMatch } from "@/components/features/dashboard/top-matches";
import { SYNTHETIC_PROFILE } from "@/lib/data/synthetic-profile";
import { calculateBatchMatches } from "@/lib/api/ai-matching";
import type { GrantWithMeta } from "@/lib/types";

/**
 * Force dynamic rendering to avoid build-time fetch errors
 */
export const dynamic = "force-dynamic";

interface SummaryCardProps {
  title: string;
  children: React.ReactNode;
}

function SummaryCard({ title, children }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Fetch grants from the API
 */
async function fetchGrants(): Promise<GrantWithMeta[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/grants?fqhcOnly=true&limit=50`, {
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
 * Compute match scores for grants against the synthetic profile
 */
async function computeMatches(grants: GrantWithMeta[]): Promise<GrantWithMatch[]> {
  if (grants.length === 0) {
    return [];
  }

  try {
    // Calculate matches for all grants
    const matches = await calculateBatchMatches(grants, SYNTHETIC_PROFILE);

    // Combine grants with their matches
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
 * Loading skeleton for the top matches section
 */
function TopMatchesSkeleton() {
  return <TopMatches grantsWithMatches={[]} loading={true} maxItems={6} />;
}

/**
 * Server component that fetches grants and computes matches
 */
async function TopMatchesContent() {
  const grants = await fetchGrants();
  const grantsWithMatches = await computeMatches(grants);

  return (
    <TopMatches
      grantsWithMatches={grantsWithMatches}
      loading={false}
      maxItems={6}
    />
  );
}

/**
 * Calculate days until a date
 */
function getNextDeadline(grants: GrantWithMeta[]): string {
  if (grants.length === 0) {
    return "No upcoming deadlines";
  }

  const now = new Date();
  const futureGrants = grants
    .filter((g) => new Date(g.deadline) > now)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  if (futureGrants.length === 0) {
    return "No upcoming deadlines";
  }

  const nextDeadline = new Date(futureGrants[0].deadline);
  return nextDeadline.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardHomePage() {
  // Fetch grants for summary cards
  const grants = await fetchGrants();

  // Calculate summary stats
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newMatchesCount = grants.filter(
    (g) => g.isNew || (g.firstSeenAt && new Date(g.firstSeenAt) > oneWeekAgo)
  ).length;

  const nextDeadline = getNextDeadline(grants);

  // Placeholder pipeline data (would come from pipeline API in production)
  const pipelineStatus = {
    evaluating: 3,
    applying: 2,
    submitted: 1,
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Your grant discovery and pipeline overview
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* New Matches This Week */}
        <SummaryCard title="New Matches This Week">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {newMatchesCount}
            </span>
            <span className="text-sm text-gray-500">grants</span>
          </div>
        </SummaryCard>

        {/* Pipeline Status */}
        <SummaryCard title="Pipeline Status">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold text-amber-600">
                {pipelineStatus.evaluating}
              </span>
              <span className="text-sm text-gray-500">Evaluating</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold text-blue-600">
                {pipelineStatus.applying}
              </span>
              <span className="text-sm text-gray-500">Applying</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold text-green-600">
                {pipelineStatus.submitted}
              </span>
              <span className="text-sm text-gray-500">Submitted</span>
            </div>
          </div>
        </SummaryCard>

        {/* Upcoming Deadlines */}
        <SummaryCard title="Upcoming Deadlines">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-gray-900">
              {nextDeadline}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">Next deadline</p>
        </SummaryCard>
      </div>

      {/* Top Matching Grants */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Top Matches for Your Organization
          </h2>
          <Link
            href="/discover"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View All Grants
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
        <Suspense fallback={<TopMatchesSkeleton />}>
          <TopMatchesContent />
        </Suspense>
      </section>
    </div>
  );
}
