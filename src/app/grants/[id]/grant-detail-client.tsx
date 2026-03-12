"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HtmlContent } from "@/components/ui/html-content";
import { ChatInterface } from "@/components/features/grants/chat-interface";
import type { Grant, FQHCProfile, GrantMatch } from "@/lib/types";

interface GrantDetailClientProps {
  grant: Grant;
  profile: FQHCProfile;
  match: GrantMatch;
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
 * Calculate days until deadline
 */
function getDaysUntilDeadline(deadline: Date): number {
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  const now = new Date();
  return Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get fit score color based on score value
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
 * Get fit score label
 */
function getFitScoreLabel(score: number): string {
  if (score >= 8) return "Strong Match";
  if (score >= 5) return "Moderate Match";
  return "Limited Match";
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

function getAgencyColor(agency: string): string {
  // Check if agency contains any of the known agency codes
  for (const [code, color] of Object.entries(agencyColors)) {
    if (agency.toUpperCase().includes(code)) {
      return color;
    }
  }
  return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
}

/**
 * Match Analysis Card Component
 * Uses the notMatchingCriteria from the match analysis
 */
function MatchAnalysisCard({ match }: { match: GrantMatch }) {
  const scoreColor = getFitScoreColor(match.fitScore);
  const scoreLabel = getFitScoreLabel(match.fitScore);

  // Get not matching criteria from the match (properly calculated by matching algorithm)
  const notMatching = match.notMatchingCriteria || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Match Analysis
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{scoreLabel}</span>
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-lg font-bold border ${scoreColor}`}
            >
              {match.fitScore}/10
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Fit explanation */}
        <p className="text-gray-700 dark:text-gray-300 mb-5">
          {match.fitExplanation}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Matched criteria - left column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                What Matches
              </p>
            </div>
            {match.matchedCriteria.length > 0 ? (
              <div className="space-y-2">
                {match.matchedCriteria.map((criterion, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 pl-2"
                  >
                    <span className="text-green-500 mt-0.5 font-bold">+</span>
                    <span>{criterion}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 pl-2 italic">
                No specific matching factors identified
              </p>
            )}
          </div>

          {/* Not matching - right column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Gaps / Not Matching
              </p>
            </div>
            {notMatching.length > 0 ? (
              <div className="space-y-2">
                {notMatching.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 pl-2"
                  >
                    <span className="text-red-500 mt-0.5 font-bold">-</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 pl-2 italic">
                No significant gaps identified
              </p>
            )}
          </div>
        </div>

        {/* Potential concerns */}
        {match.potentialConcerns.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Considerations
              </p>
            </div>
            <div className="space-y-2">
              {match.potentialConcerns.map((concern, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 pl-2"
                >
                  <span className="text-amber-500 mt-0.5 font-bold">!</span>
                  <span>{concern}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Grant Detail Client Component
 *
 * Two-column layout with grant details on the left and AI chat on the right.
 * Handles interactivity including chat and "Add to Pipeline" functionality.
 */
export function GrantDetailClient({
  grant,
  profile,
  match,
}: GrantDetailClientProps) {
  const [isAddingToPipeline, setIsAddingToPipeline] = useState(false);
  const [addedToPipeline, setAddedToPipeline] = useState(false);

  const daysUntilDeadline = getDaysUntilDeadline(grant.deadline);
  const isDeadlineUrgent = daysUntilDeadline >= 0 && daysUntilDeadline < 14;
  const statusVariant = grant.status === "posted" ? "success" : "warning";

  async function handleAddToPipeline() {
    if (addedToPipeline || isAddingToPipeline) return;

    setIsAddingToPipeline(true);

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grantId: grant.id,
          fqhcProfileId: profile.id,
          fitScore: match.fitScore,
          fitExplanation: match.fitExplanation,
          deadline: grant.deadline,
          status: "interested",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAddedToPipeline(true);
      } else {
        console.error("Failed to add to pipeline:", data.error);
        alert("Failed to add grant to pipeline. Please try again.");
      }
    } catch (error) {
      console.error("Error adding to pipeline:", error);
      alert("Failed to add grant to pipeline. Please try again.");
    } finally {
      setIsAddingToPipeline(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Back to Dashboard</span>
        </Link>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left column - Grant details (60%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Grant header */}
            <Card>
              <CardContent className="pt-6">
                {/* Agency and status badges */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getAgencyColor(
                      grant.agency
                    )}`}
                  >
                    {grant.agency}
                  </span>
                  <Badge variant={statusVariant}>
                    {grant.status === "posted" ? "Posted" : "Forecasted"}
                  </Badge>
                  {grant.cfdaNumber && (
                    <Badge variant="default">CFDA: {grant.cfdaNumber}</Badge>
                  )}
                </div>

                {/* Grant title */}
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {grant.title}
                </h1>

                {/* Key details row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Funding:
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatCurrency(grant.fundingAmount.min)} -{" "}
                      {formatCurrency(grant.fundingAmount.max)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Deadline:
                    </span>
                    <span
                      className={
                        isDeadlineUrgent
                          ? "text-red-600 font-semibold"
                          : "text-gray-900 dark:text-gray-100"
                      }
                    >
                      {formatDate(grant.deadline)}
                      {daysUntilDeadline >= 0 && (
                        <span className="ml-1">({daysUntilDeadline} days)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Posted:
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatDate(grant.postedDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Type:
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {grant.grantType}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Match analysis */}
            <MatchAnalysisCard match={match} />

            {/* Description section */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Description
                </h3>
              </CardHeader>
              <CardContent>
                {grant.description ? (
                  <HtmlContent
                    html={grant.description}
                    className="text-gray-700 dark:text-gray-300"
                  />
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    No description available.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Eligibility section */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Eligibility Requirements
                </h3>
              </CardHeader>
              <CardContent>
                {grant.eligibilityDescription ? (
                  <HtmlContent
                    html={grant.eligibilityDescription}
                    className="text-gray-700 dark:text-gray-300"
                  />
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    No eligibility information available.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Action buttons */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleAddToPipeline}
                    disabled={addedToPipeline || isAddingToPipeline}
                    loading={isAddingToPipeline}
                    className="flex-1 sm:flex-none"
                  >
                    {addedToPipeline ? "Added to Pipeline" : "Add to Pipeline"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(grant.sourceUrl, "_blank")}
                    className="flex-1 sm:flex-none"
                  >
                    View on Grants.gov
                  </Button>
                  {grant.applicationUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(grant.applicationUrl, "_blank")}
                      className="flex-1 sm:flex-none"
                    >
                      Apply Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - AI Chat (40%) */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-8">
              <Card className="h-[calc(100vh-8rem)] flex flex-col">
                <CardContent className="flex-1 min-h-0 py-4">
                  <ChatInterface grant={grant} profile={profile} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
