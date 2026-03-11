"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Grant, GrantMatch } from "@/lib/types";

interface GrantCardProps {
  grant: Grant;
  match?: GrantMatch;
  onAddToPipeline?: (grant: Grant) => void;
  onRequestMatch?: (grant: Grant) => void;
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
 * Get fit score color based on score value
 * Green (8-10): Strong fit
 * Yellow (5-7): Moderate fit
 * Gray (1-4): Limited fit
 */
function getFitScoreColor(score: number): string {
  if (score >= 8) {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300";
  }
  if (score >= 5) {
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300";
  }
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-300";
}

/**
 * Get fit score label based on score value
 */
function getFitScoreLabel(score: number): string {
  if (score >= 8) {
    return "Strong Match";
  }
  if (score >= 5) {
    return "Moderate Fit";
  }
  return "Limited Fit";
}

/**
 * Fit Score Badge Component
 * Displays the AI-calculated fit score with visual indicator
 */
function FitScoreBadge({ score }: { score: number }) {
  const colorClass = getFitScoreColor(score);
  const label = getFitScoreLabel(score);

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold border ${colorClass}`}
      title={label}
    >
      <span className="text-xs uppercase tracking-wide opacity-75">Fit</span>
      <span>{score}/10</span>
    </div>
  );
}

/**
 * Fit Explanation Section Component
 * Expandable section showing detailed match explanation
 */
function FitExplanationSection({ match }: { match: GrantMatch }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors w-full text-left"
        aria-expanded={isExpanded}
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
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
        <span className="font-medium">Why this score?</span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2 text-sm">
          {/* Fit Explanation */}
          <p className="text-gray-700 dark:text-gray-300">{match.fitExplanation}</p>

          {/* Matched Criteria */}
          {match.matchedCriteria.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Matching Factors
              </p>
              <div className="flex flex-wrap gap-1">
                {match.matchedCriteria.map((criterion, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs text-green-700 dark:text-green-300"
                  >
                    {criterion}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Potential Concerns */}
          {match.potentialConcerns.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Considerations
              </p>
              <div className="flex flex-wrap gap-1">
                {match.potentialConcerns.map((concern, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300"
                  >
                    {concern}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Grant Card Component
 *
 * Displays a single grant opportunity with key information for quick scanning.
 * Designed for CFOs who need to review grants quickly (10-minute constraint).
 *
 * Features:
 * - Core grant info (title, agency, funding, deadline)
 * - AI-powered fit score when match data is available
 * - Expandable explanation showing why the grant matches
 * - Visual urgency indicators for deadlines
 */
export function GrantCard({ grant, match, onAddToPipeline, onRequestMatch }: GrantCardProps) {
  const isUrgent = isDeadlineUrgent(grant.deadline);
  const statusVariant = grant.status === "posted" ? "success" : "warning";
  const statusLabel = grant.status === "posted" ? "Posted" : "Forecasted";

  function handleAddToPipeline() {
    if (onAddToPipeline) {
      onAddToPipeline(grant);
    }
  }

  function handleRequestMatch() {
    if (onRequestMatch) {
      onRequestMatch(grant);
    }
  }

  return (
    <Card hover className="flex flex-col h-full">
      <CardContent className="flex-1">
        {/* Header: Agency, Status, and Fit Score */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${getAgencyColor(grant.agency)}`}
            >
              {grant.agency}
            </span>
            <Badge variant={statusVariant} size="sm">
              {statusLabel}
            </Badge>
          </div>

          {/* Fit Score Badge */}
          {match && <FitScoreBadge score={match.fitScore} />}
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

        {/* Fit Explanation Section (expandable) */}
        {match && <FitExplanationSection match={match} />}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(grant.sourceUrl, "_blank")}
          >
            View Details
          </Button>
          {!match && onRequestMatch && (
            <Button variant="outline" size="sm" onClick={handleRequestMatch}>
              Check Fit
            </Button>
          )}
        </div>
        <Button size="sm" onClick={handleAddToPipeline}>
          Add to Pipeline
        </Button>
      </CardFooter>
    </Card>
  );
}
