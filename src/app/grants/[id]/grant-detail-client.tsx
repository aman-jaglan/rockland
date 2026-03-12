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
 * Format currency amount with K/M suffix
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
 * Get fit score color
 */
function getFitScoreColor(score: number): string {
  if (score >= 8) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300";
  if (score >= 5) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300";
  return "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 border-red-300";
}

/**
 * Get fit score label
 */
function getFitScoreLabel(score: number): string {
  if (score >= 8) return "Strong Match";
  if (score >= 5) return "Moderate Match";
  return "Poor Match";
}

/**
 * Agency badge colors
 */
function getAgencyColor(agency: string): string {
  const agencyUpper = agency.toUpperCase();
  if (agencyUpper.includes('HRSA')) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (agencyUpper.includes('CDC')) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  if (agencyUpper.includes('SAMHSA')) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  if (agencyUpper.includes('NIH')) return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
  if (agencyUpper.includes('HHS')) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
}

/**
 * Grant Detail Client Component
 *
 * AI-DOMINANT LAYOUT: Chat takes 60% of the screen, grant details are secondary
 */
export function GrantDetailClient({
  grant,
  profile,
  match,
}: GrantDetailClientProps) {
  const [isAddingToPipeline, setIsAddingToPipeline] = useState(false);
  const [addedToPipeline, setAddedToPipeline] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const daysUntilDeadline = getDaysUntilDeadline(grant.deadline);
  const isDeadlineUrgent = daysUntilDeadline >= 0 && daysUntilDeadline < 14;

  async function handleAddToPipeline() {
    if (addedToPipeline || isAddingToPipeline) return;
    setIsAddingToPipeline(true);

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      }
    } catch (error) {
      console.error("Error adding to pipeline:", error);
    } finally {
      setIsAddingToPipeline(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold border ${getFitScoreColor(match.fitScore)}`}>
                <span>{match.fitScore}/10</span>
                <span className="text-xs opacity-75">{getFitScoreLabel(match.fitScore)}</span>
              </div>
              <Button
                onClick={handleAddToPipeline}
                disabled={addedToPipeline || isAddingToPipeline}
                loading={isAddingToPipeline}
                size="sm"
              >
                {addedToPipeline ? "Added" : "Add to Pipeline"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content - AI dominant layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-8rem)]">

          {/* Left side - Grant summary (compact, 40%) */}
          <div className="lg:col-span-2 space-y-4 overflow-y-auto">
            {/* Grant header */}
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getAgencyColor(grant.agency)}`}>
                    {grant.agency}
                  </span>
                  <Badge variant={grant.status === "posted" ? "success" : "warning"} className="text-xs">
                    {grant.status === "posted" ? "Posted" : "Forecasted"}
                  </Badge>
                </div>

                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight">
                  {grant.title}
                </h1>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Funding</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(grant.fundingAmount.min)} - {formatCurrency(grant.fundingAmount.max)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Deadline</span>
                    <p className={`font-medium ${isDeadlineUrgent ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}>
                      {formatDate(grant.deadline)}
                      {daysUntilDeadline >= 0 && <span className="text-xs ml-1">({daysUntilDeadline}d)</span>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Match Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Match Analysis</h3>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {match.fitExplanation}
                </p>

                {match.matchedCriteria.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1.5">What Matches</p>
                    <ul className="space-y-1">
                      {match.matchedCriteria.slice(0, 3).map((item, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5">+</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {match.notMatchingCriteria.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">Gaps</p>
                    <ul className="space-y-1">
                      {match.notMatchingCriteria.slice(0, 3).map((item, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                          <span className="text-red-500 mt-0.5">-</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description (collapsible) */}
            <Card>
              <div
                className="px-4 py-3 cursor-pointer"
                onClick={() => setShowFullDescription(!showFullDescription)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Description</h3>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${showFullDescription ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {showFullDescription && (
                <CardContent className="pt-0">
                  {grant.description ? (
                    <HtmlContent html={grant.description} className="text-sm text-gray-700 dark:text-gray-300" />
                  ) : (
                    <p className="text-sm text-gray-500 italic">No description available</p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Quick actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => window.open(grant.sourceUrl, "_blank")}
              >
                View on Grants.gov
              </Button>
              {grant.applicationUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => window.open(grant.applicationUrl, "_blank")}
                >
                  Apply Now
                </Button>
              )}
            </div>
          </div>

          {/* Right side - AI Chat (dominant, 60%) */}
          <div className="lg:col-span-3 h-full min-h-0">
            <Card className="h-full flex flex-col overflow-hidden">
              <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                <ChatInterface grant={grant} profile={profile} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
