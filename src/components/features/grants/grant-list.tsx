import { GrantCard } from "./grant-card";
import { Card } from "@/components/ui/card";
import type { Grant } from "@/lib/types";

interface GrantListProps {
  grants: Grant[];
  loading?: boolean;
  onAddToPipeline?: (grant: Grant) => void;
}

/**
 * Loading skeleton for a single grant card
 */
function GrantCardSkeleton() {
  return (
    <Card padding="md" className="animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-6 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
      <div className="flex justify-between mb-3">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between">
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </Card>
  );
}

/**
 * Empty state when no grants are found
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
          d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        No grants found
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
        Try adjusting your filters or search terms to find relevant grant opportunities.
      </p>
    </div>
  );
}

/**
 * Grant List Component
 *
 * Renders a responsive grid of grant cards with loading and empty states.
 * Grid layout: 1 column on mobile, 2 columns on tablet, 3 columns on desktop.
 */
export function GrantList({ grants, loading = false, onAddToPipeline }: GrantListProps) {
  // Show loading skeletons
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <GrantCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (grants.length === 0) {
    return (
      <div className="grid grid-cols-1">
        <EmptyState />
      </div>
    );
  }

  // Render grant cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {grants.map((grant) => (
        <GrantCard
          key={grant.id}
          grant={grant}
          onAddToPipeline={onAddToPipeline}
        />
      ))}
    </div>
  );
}
