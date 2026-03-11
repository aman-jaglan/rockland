"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Grant } from "@/lib/types";

interface GrantCardProps {
  grant: Grant;
  onAddToPipeline?: (grant: Grant) => void;
}

/**
 * Agency badge colors for different federal agencies
 */
const agencyColors: Record<string, string> = {
  HHS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  HRSA: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CDC: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  SAMHSA: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  NIH: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

/**
 * Get agency badge color, falling back to default gray
 */
function getAgencyColor(agency: string): string {
  return agencyColors[agency] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
}

/**
 * Format currency amount with K/M suffix for readability
 */
function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Check if deadline is urgent (less than 14 days away)
 */
function isDeadlineUrgent(deadline: Date): boolean {
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  const now = new Date();
  const daysUntilDeadline = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilDeadline >= 0 && daysUntilDeadline < 14;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Grant Card Component
 *
 * Displays a single grant opportunity with key information for quick scanning.
 * Designed for CFOs who need to review grants quickly (10-minute constraint).
 */
export function GrantCard({ grant, onAddToPipeline }: GrantCardProps) {
  const isUrgent = isDeadlineUrgent(grant.deadline);
  const statusVariant = grant.status === "posted" ? "success" : "warning";
  const statusLabel = grant.status === "posted" ? "Posted" : "Forecasted";

  function handleAddToPipeline() {
    if (onAddToPipeline) {
      onAddToPipeline(grant);
    }
  }

  return (
    <Card hover className="flex flex-col h-full">
      <CardContent className="flex-1">
        {/* Header: Agency and Status badges */}
        <div className="flex items-center justify-between mb-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${getAgencyColor(grant.agency)}`}
          >
            {grant.agency}
          </span>
          <Badge variant={statusVariant} size="sm">
            {statusLabel}
          </Badge>
        </div>

        {/* Grant Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
          {truncateText(grant.title, 100)}
        </h3>

        {/* Funding and Deadline Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">Funding:</span>{" "}
            {formatCurrency(grant.fundingAmount.min)} - {formatCurrency(grant.fundingAmount.max)}
          </span>
          <span className={isUrgent ? "text-red-600 font-semibold" : "text-gray-600 dark:text-gray-400"}>
            <span className="font-medium">Deadline:</span> {formatDate(grant.deadline)}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
          {truncateText(grant.description, 200)}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(grant.sourceUrl, "_blank")}
        >
          View Details
        </Button>
        <Button size="sm" onClick={handleAddToPipeline}>
          Add to Pipeline
        </Button>
      </CardFooter>
    </Card>
  );
}
