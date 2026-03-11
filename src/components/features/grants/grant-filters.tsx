"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { GrantSearchFilters, GrantStatus } from "@/lib/types";

interface GrantFiltersProps {
  onFilterChange: (filters: GrantSearchFilters) => void;
  onRefresh?: () => Promise<void>;
  initialFilters?: GrantSearchFilters;
  isRefreshing?: boolean;
}

/**
 * Agency options for the dropdown
 */
const agencyOptions = [
  { value: "", label: "All Agencies" },
  { value: "HHS", label: "HHS" },
  { value: "HRSA", label: "HRSA" },
  { value: "CDC", label: "CDC" },
  { value: "SAMHSA", label: "SAMHSA" },
  { value: "NIH", label: "NIH" },
];

/**
 * Status options for the dropdown
 */
const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "posted", label: "Posted" },
  { value: "forecasted", label: "Forecasted" },
];

/**
 * Grant Filters Component
 *
 * Provides search and filter controls for grant discovery.
 * Client component for interactivity (search input, dropdowns, button).
 * Includes a "Refresh Grants" button for manual cache bypass.
 */
export function GrantFilters({
  onFilterChange,
  onRefresh,
  initialFilters,
  isRefreshing = false,
}: GrantFiltersProps) {
  const [query, setQuery] = useState(initialFilters?.query || "");
  const [agency, setAgency] = useState(initialFilters?.agency || "");
  const [status, setStatus] = useState<GrantStatus | "">(initialFilters?.status || "");

  function handleApplyFilters() {
    const filters: GrantSearchFilters = {};

    if (query.trim()) {
      filters.query = query.trim();
    }

    if (agency) {
      filters.agency = agency;
    }

    if (status) {
      filters.status = status;
    }

    onFilterChange(filters);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      handleApplyFilters();
    }
  }

  function handleClearFilters() {
    setQuery("");
    setAgency("");
    setStatus("");
    onFilterChange({});
  }

  const hasActiveFilters = query.trim() || agency || status;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <Input
            placeholder="Search grants by keyword..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Agency Dropdown */}
        <div className="w-full lg:w-48">
          <Select
            options={agencyOptions}
            value={agency}
            onChange={setAgency}
            placeholder="Select Agency"
          />
        </div>

        {/* Status Dropdown */}
        <div className="w-full lg:w-48">
          <Select
            options={statusOptions}
            value={status}
            onChange={(value) => setStatus(value as GrantStatus | "")}
            placeholder="Select Status"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleApplyFilters}>
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
          )}
          {onRefresh && (
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh Grants"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
