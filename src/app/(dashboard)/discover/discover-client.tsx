"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GrantWithMatch, GrantSearchFilters } from "@/lib/types";

interface DiscoverClientWrapperProps {
  grantsWithMatches: GrantWithMatch[];
}

const ITEMS_PER_PAGE = 12;

/**
 * Get score color based on fit score
 */
function getScoreColor(score: number): string {
  if (score >= 8) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (score >= 5) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  return "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400";
}

/**
 * Get agency color
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
 * Format currency
 */
function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

/**
 * Format date
 */
function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Grant Card with Score
 */
function GrantCardWithScore({ grantWithMatch }: { grantWithMatch: GrantWithMatch }) {
  const { grant, match } = grantWithMatch;
  const deadline = grant.deadline instanceof Date ? grant.deadline : new Date(grant.deadline);
  const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysUntil >= 0 && daysUntil < 14;

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardContent className="flex-1 pt-5 pb-4 flex flex-col">
        {/* Header with agency and score */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getAgencyColor(grant.agency)}`}>
            {grant.agency}
          </span>
          <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-bold ${getScoreColor(match.fitScore)}`}>
            {match.fitScore}/10
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
          {grant.title}
        </h3>

        {/* Match explanation */}
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {match.fitExplanation}
        </p>

        {/* Funding and deadline */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span>
            {formatCurrency(grant.fundingAmount.min)} - {formatCurrency(grant.fundingAmount.max)}
          </span>
          <span className={isUrgent ? "text-red-600 font-medium" : ""}>
            {daysUntil >= 0 ? `${daysUntil}d left` : "Closed"} ({formatDate(deadline)})
          </span>
        </div>

        {/* Status badge */}
        <div className="mb-4">
          <Badge variant={grant.status === "posted" ? "success" : "warning"} className="text-xs">
            {grant.status === "posted" ? "Posted" : "Forecasted"}
          </Badge>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action */}
        <Link href={`/grants/${grant.id}`} className="block">
          <Button variant="outline" size="sm" className="w-full">
            View Details & Chat with AI
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Filter component
 */
function Filters({
  filters,
  onFilterChange,
  agencies,
}: {
  filters: GrantSearchFilters;
  onFilterChange: (filters: GrantSearchFilters) => void;
  agencies: string[];
}) {
  return (
    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Search grants..."
          value={filters.query || ""}
          onChange={(e) => onFilterChange({ ...filters, query: e.target.value })}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Agency filter */}
      <select
        value={filters.agency || ""}
        onChange={(e) => onFilterChange({ ...filters, agency: e.target.value || undefined })}
        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All Agencies</option>
        {agencies.map((agency) => (
          <option key={agency} value={agency}>
            {agency}
          </option>
        ))}
      </select>

      {/* Min score filter */}
      <select
        value={filters.minScore || ""}
        onChange={(e) => onFilterChange({ ...filters, minScore: e.target.value ? parseInt(e.target.value) : undefined })}
        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Any Score</option>
        <option value="8">8+ (Strong Match)</option>
        <option value="5">5+ (Moderate+)</option>
        <option value="1">All Scores</option>
      </select>

      {/* Status filter */}
      <select
        value={filters.status || ""}
        onChange={(e) => onFilterChange({ ...filters, status: e.target.value as "posted" | "forecasted" | undefined })}
        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All Status</option>
        <option value="posted">Posted</option>
        <option value="forecasted">Forecasted</option>
      </select>
    </div>
  );
}

/**
 * Pagination component
 */
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        Previous
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            1
          </button>
          {start > 2 && <span className="px-2">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 rounded-lg border text-sm font-medium ${
            page === currentPage
              ? "bg-indigo-600 text-white border-indigo-600"
              : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          {page}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-2">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        Next
      </button>
    </div>
  );
}

/**
 * Discover Client Wrapper with filtering and pagination
 */
export function DiscoverClientWrapper({ grantsWithMatches }: DiscoverClientWrapperProps) {
  const [filters, setFilters] = useState<GrantSearchFilters>({});
  const [currentPage, setCurrentPage] = useState(1);

  // Extract unique agencies
  const agencies = useMemo(() => {
    const agencySet = new Set<string>();
    grantsWithMatches.forEach(({ grant }) => {
      // Extract main agency name
      const agency = grant.agency.split("-")[0].trim();
      agencySet.add(agency);
    });
    return Array.from(agencySet).sort();
  }, [grantsWithMatches]);

  // Filter grants
  const filteredGrants = useMemo(() => {
    return grantsWithMatches.filter(({ grant, match }) => {
      // Keyword search
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const matchesTitle = grant.title.toLowerCase().includes(query);
        const matchesDescription = grant.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) return false;
      }

      // Agency filter
      if (filters.agency) {
        if (!grant.agency.toUpperCase().includes(filters.agency.toUpperCase())) return false;
      }

      // Status filter
      if (filters.status && grant.status !== filters.status) return false;

      // Min score filter
      if (filters.minScore && match.fitScore < filters.minScore) return false;

      return true;
    });
  }, [grantsWithMatches, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredGrants.length / ITEMS_PER_PAGE);
  const paginatedGrants = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGrants.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredGrants, currentPage]);

  // Reset to page 1 when filters change
  function handleFilterChange(newFilters: GrantSearchFilters) {
    setFilters(newFilters);
    setCurrentPage(1);
  }

  return (
    <>
      {/* Filters */}
      <Filters filters={filters} onFilterChange={handleFilterChange} agencies={agencies} />

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {paginatedGrants.length} of {filteredGrants.length} grants
        {filteredGrants.length !== grantsWithMatches.length && ` (${grantsWithMatches.length} total)`}
      </div>

      {/* Grant grid */}
      {paginatedGrants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No grants match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedGrants.map((grantWithMatch) => (
            <GrantCardWithScore key={grantWithMatch.grant.id} grantWithMatch={grantWithMatch} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </>
  );
}
