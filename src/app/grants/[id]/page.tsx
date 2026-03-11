import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Grant, FQHCProfile, GrantMatch } from "@/lib/types";
import { getGrantDetails } from "@/lib/api/grants-gov";
import { calculateGrantMatch } from "@/lib/api/ai-matching";
import { GrantDetailClient } from "./grant-detail-client";

/**
 * Force dynamic rendering to avoid build-time fetch errors
 */
export const dynamic = "force-dynamic";

/**
 * Synthetic profile for matching when no profile is saved
 * Based on a typical FQHC organization
 */
const SYNTHETIC_PROFILE: FQHCProfile = {
  id: "synthetic-fqhc-001",
  name: "Community Health Center",
  ein: "12-3456789",
  address: {
    street: "123 Main Street",
    city: "Los Angeles",
    state: "CA",
    zip: "90001",
  },
  services: [
    "primary care",
    "dental",
    "behavioral health",
    "HIV/AIDS services",
    "chronic disease management",
    "pediatric care",
    "prenatal care",
  ],
  patientDemographics: [
    "low-income",
    "uninsured",
    "underserved",
    "homeless",
    "migrant workers",
  ],
  staffCount: 75,
  annualBudget: 5000000,
  activeGrants: ["HRSA 330", "Ryan White Part A"],
  fqhcDesignation: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Fetch profile from API or return synthetic profile
 */
async function fetchProfile(): Promise<FQHCProfile> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/profile`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return SYNTHETIC_PROFILE;
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      return SYNTHETIC_PROFILE;
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return SYNTHETIC_PROFILE;
  }
}

/**
 * Fetch grant details by ID
 */
async function fetchGrantById(id: string): Promise<Grant | null> {
  try {
    // First try to get from cache/API
    const grant = await getGrantDetails(id);
    return grant;
  } catch (error) {
    console.error("Error fetching grant:", error);
    return null;
  }
}

/**
 * Compute match analysis for grant and profile
 */
async function computeMatchAnalysis(
  grant: Grant,
  profile: FQHCProfile
): Promise<GrantMatch> {
  try {
    const match = await calculateGrantMatch(grant, profile);
    return match;
  } catch (error) {
    console.error("Error computing match:", error);
    // Return a default match if computation fails
    return {
      grantId: grant.id,
      fqhcProfileId: profile.id,
      fitScore: 5,
      fitExplanation: "Unable to compute match analysis. Please review manually.",
      matchedCriteria: [],
      potentialConcerns: ["Match analysis unavailable"],
      calculatedAt: new Date(),
    };
  }
}

/**
 * Loading skeleton for grant detail
 */
function GrantDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          {/* Back button skeleton */}
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left column skeleton */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="h-6 w-1/4 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
              </div>
            </div>

            {/* Right column skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700 h-96">
                <div className="h-6 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GrantDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Server component that fetches and renders grant detail
 */
async function GrantDetailContent({ grantId }: { grantId: string }) {
  // Fetch grant, profile, and compute match in parallel
  const [grant, profile] = await Promise.all([
    fetchGrantById(grantId),
    fetchProfile(),
  ]);

  if (!grant) {
    notFound();
  }

  // Compute match analysis
  const match = await computeMatchAnalysis(grant, profile);

  return (
    <GrantDetailClient
      grant={grant}
      profile={profile}
      match={match}
    />
  );
}

/**
 * Grant Detail Page
 *
 * Dynamic route that displays full grant details with AI chat assistant.
 * Server component that fetches grant data, profile, and computes match.
 */
export default async function GrantDetailPage({ params }: GrantDetailPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<GrantDetailSkeleton />}>
      <GrantDetailContent grantId={id} />
    </Suspense>
  );
}
