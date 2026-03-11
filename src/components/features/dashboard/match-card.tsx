"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GrantWithMeta } from "@/lib/types";

interface MatchCardProps {
  grant: GrantWithMeta;
  matchScore: number;
  matchReason: string;
}

/**
 * Get score badge variant based on score value
 * Green (8-10): Strong fit
 * Yellow (5-7): Moderate fit
 * Gray (1-4): Limited fit
 */
function getScoreVariant(score: number): "success" | "warning" | "default" {
  if (score >= 8) return "success";
  if (score >= 5) return "warning";
  return "default";
}

/**
 * Get score label based on score value
 */
function getScoreLabel(score: number): string {
  if (score >= 8) return "Strong";
  if (score >= 5) return "Good";
  return "Fair";
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
 * Calculate days until deadline
 */
function getDaysUntilDeadline(deadline: Date): number {
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  const now = new Date();
  return Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Format deadline text for display
 */
function formatDeadline(deadline: Date): string {
  const days = getDaysUntilDeadline(deadline);

  if (days < 0) {
    return "Passed";
  }
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "1 day left";
  }
  if (days <= 30) {
    return `${days} days left`;
  }
  if (days <= 60) {
    return `${Math.round(days / 7)} weeks left`;
  }
  return `${Math.round(days / 30)} months left`;
}

/**
 * Check if deadline is urgent (less than 14 days)
 */
function isDeadlineUrgent(deadline: Date): boolean {
  const days = getDaysUntilDeadline(deadline);
  return days >= 0 && days < 14;
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
 * Extract short agency code from full agency string
 * e.g., "HHS-HRSA" -> "HHS-HRSA", "DEPARTMENT-OF-HEALTH" -> "HHS"
 */
function getAgencyCode(agency: string): string {
  // Common agency mappings
  const agencyMap: Record<string, string> = {
    HHS: "HHS",
    HRSA: "HHS-HRSA",
    CDC: "HHS-CDC",
    NIH: "HHS-NIH",
    SAMHSA: "HHS-SAMHSA",
    CMS: "HHS-CMS",
    ACF: "HHS-ACF",
  };

  // Check if agency starts with any known code
  for (const [code, display] of Object.entries(agencyMap)) {
    if (agency.toUpperCase().includes(code)) {
      return display;
    }
  }

  // Return truncated agency if too long
  return truncateText(agency, 12);
}

/**
 * Match Card Component
 *
 * A compact card showing a grant match with score, funding, deadline,
 * and a brief match reason. Links to the grant detail page.
 */
export function MatchCard({ grant, matchScore, matchReason }: MatchCardProps) {
  const scoreVariant = getScoreVariant(matchScore);
  const scoreLabel = getScoreLabel(matchScore);
  const deadlineUrgent = isDeadlineUrgent(grant.deadline);
  const fundingDisplay =
    grant.fundingAmount.max > 0
      ? formatCurrency(grant.fundingAmount.max)
      : "TBD";

  return (
    <Link href={`/grants/${grant.id}`} className="block group">
      <Card
        hover
        className="h-full flex flex-col transition-all duration-200 group-hover:border-indigo-300 dark:group-hover:border-indigo-700"
      >
        {/* Header: Score and Agency */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`
                inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold
                ${
                  scoreVariant === "success"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : scoreVariant === "warning"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }
              `}
            >
              <span>{matchScore}/10</span>
              {matchScore >= 8 && (
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
          <Badge variant="default" size="sm">
            {getAgencyCode(grant.agency)}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2 min-h-[3rem] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {truncateText(grant.title, 80)}
        </h3>

        {/* Funding and Deadline Row */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">{fundingDisplay}</span>
          </span>
          <span
            className={`flex items-center gap-1 ${
              deadlineUrgent
                ? "text-red-600 dark:text-red-400 font-medium"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formatDeadline(grant.deadline)}</span>
          </span>
        </div>

        {/* Match Reason */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 flex-1">
          {truncateText(matchReason, 100)}
        </p>

        {/* View Details Link */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 flex items-center gap-1">
            View Details
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
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
          </span>
        </div>
      </Card>
    </Link>
  );
}
