"use client";

import { useState } from "react";
import { PipelineCard } from "./pipeline-card";
import type { PipelineItemWithGrant, PipelineStatus } from "@/lib/types";

// Icon components
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

interface PipelineColumnProps {
  status: PipelineStatus;
  items: PipelineItemWithGrant[];
  onMoveStatus: (itemId: string, newStatus: PipelineStatus) => void;
  updatingItemId: string | null;
}

const STAGE_CONFIG: Record<
  PipelineStatus,
  { label: string; headerColor: string; accentColor: string }
> = {
  interested: {
    label: "INTERESTED",
    headerColor: "text-gray-700 dark:text-gray-300",
    accentColor: "bg-gray-400",
  },
  evaluating: {
    label: "EVALUATING",
    headerColor: "text-blue-700 dark:text-blue-300",
    accentColor: "bg-blue-500",
  },
  applying: {
    label: "APPLYING",
    headerColor: "text-yellow-700 dark:text-yellow-300",
    accentColor: "bg-yellow-500",
  },
  submitted: {
    label: "SUBMITTED",
    headerColor: "text-purple-700 dark:text-purple-300",
    accentColor: "bg-purple-500",
  },
  awarded: {
    label: "AWARDED",
    headerColor: "text-green-700 dark:text-green-300",
    accentColor: "bg-green-500",
  },
  rejected: {
    label: "REJECTED",
    headerColor: "text-red-700 dark:text-red-300",
    accentColor: "bg-red-500",
  },
};

export function PipelineColumn({
  status,
  items,
  onMoveStatus,
  updatingItemId,
}: PipelineColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const config = STAGE_CONFIG[status];

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
      {/* Section Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {/* Collapse indicator */}
        {isCollapsed ? (
          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        )}

        {/* Color accent bar */}
        <div className={`h-4 w-1 rounded-full ${config.accentColor}`} />

        {/* Stage label */}
        <h3 className={`text-sm font-semibold tracking-wide ${config.headerColor}`}>
          {config.label}
        </h3>

        {/* Count badge */}
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          {items.length}
        </span>
      </button>

      {/* Cards Container */}
      {!isCollapsed && (
        <div className="space-y-3 px-4 pb-4">
          {items.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 py-6 text-center dark:border-gray-700">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No grants in this stage
              </p>
            </div>
          ) : (
            items.map((item) => (
              <PipelineCard
                key={item.id}
                item={item}
                onMoveStatus={onMoveStatus}
                isUpdating={updatingItemId === item.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
