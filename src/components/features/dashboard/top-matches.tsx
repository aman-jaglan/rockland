"use client";

import { MatchCard } from "./match-card";
import { Card } from "@/components/ui/card";
import type { GrantWithMeta, GrantMatch } from "@/lib/types";

interface GrantWithMatch {
  grant: GrantWithMeta;
  match: GrantMatch;
}

interface TopMatchesProps {
  grantsWithMatches: GrantWithMatch[];
  loading?: boolean;
  maxItems?: number;
}

/**
 * Extract a brief reason from the fit explanation
 * Returns the first sentence or truncates to a reasonable length
 */
function extractBriefReason(fitExplanation: string): string {
  if (!fitExplanation) {
    return "Matches your organization's profile.";
  }

  // Split by sentence-ending punctuation
  const sentences = fitExplanation.split(/(?<=[.!?])\s+/);
  const firstSentence = sentences[0] || fitExplanation;

  // Ensure it's not too long
  if (firstSentence.length > 120) {
    return firstSentence.slice(0, 117).trim() + "...";
  }

  return firstSentence;
}

/**
 * Loading skeleton for a single match card
 */
function MatchCardSkeleton() {
  return (
    <Card padding="md" className="animate-pulse h-[240px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      {/* Title */}
      <div className="space-y-2 mb-3">
        <div className="h-5 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {/* Funding and Deadline */}
      <div className="flex gap-4 mb-3">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {/* Reason */}
      <div className="space-y-2 flex-1">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </Card>
  );
}

/**
 * Empty state when no matches are found
 */
function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
      <svg
        className="h-12 w-12 text-gray-400 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        No matching grants found
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
        We could not find any grants matching your profile. Check
        back soon for new opportunities.
      </p>
    </div>
  );
}

/**
 * Top Matches Component
 *
 * Displays a grid of top matching grants with their scores.
 * Sorts by match score (highest first) and limits to top items.
 * Responsive grid: 1 column on mobile, 2 columns on tablet, 3 columns on desktop.
 */
export function TopMatches({
  grantsWithMatches,
  loading = false,
  maxItems = 6,
}: TopMatchesProps) {
  // Show loading skeletons
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: maxItems }).map((_, index) => (
          <MatchCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (grantsWithMatches.length === 0) {
    return (
      <div className="grid grid-cols-1">
        <EmptyState />
      </div>
    );
  }

  // Sort by match score (highest first) and take top items
  const sortedMatches = [...grantsWithMatches]
    .sort((a, b) => b.match.fitScore - a.match.fitScore)
    .slice(0, maxItems);

  // Render match cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedMatches.map(({ grant, match }) => (
        <MatchCard
          key={grant.id}
          grant={grant}
          matchScore={match.fitScore}
          matchReason={extractBriefReason(match.fitExplanation)}
        />
      ))}
    </div>
  );
}

export type { GrantWithMatch };
