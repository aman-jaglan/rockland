"use client";

import { PipelineCard } from "./pipeline-card";
import type { PipelineItemWithGrant, PipelineStatus } from "@/lib/types";

interface PipelineColumnProps {
  status: PipelineStatus;
  items: PipelineItemWithGrant[];
  onMoveStatus: (itemId: string, newStatus: PipelineStatus) => void;
  updatingItemId: string | null;
}

const STAGE_CONFIG: Record<
  PipelineStatus,
  { label: string; headerColor: string; borderColor: string }
> = {
  discovered: {
    label: "Discovered",
    headerColor: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    borderColor: "border-gray-300 dark:border-gray-600",
  },
  evaluating: {
    label: "Evaluating",
    headerColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    borderColor: "border-blue-300 dark:border-blue-700",
  },
  applying: {
    label: "Applying",
    headerColor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    borderColor: "border-yellow-300 dark:border-yellow-700",
  },
  submitted: {
    label: "Submitted",
    headerColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    borderColor: "border-purple-300 dark:border-purple-700",
  },
  awarded: {
    label: "Awarded",
    headerColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    borderColor: "border-green-300 dark:border-green-700",
  },
  rejected: {
    label: "Rejected",
    headerColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    borderColor: "border-red-300 dark:border-red-700",
  },
};

export function PipelineColumn({
  status,
  items,
  onMoveStatus,
  updatingItemId,
}: PipelineColumnProps) {
  const config = STAGE_CONFIG[status];

  return (
    <div
      className={`flex min-w-[280px] flex-col rounded-lg border-2 ${config.borderColor} bg-gray-50 dark:bg-gray-900`}
    >
      {/* Column Header */}
      <div
        className={`flex items-center justify-between rounded-t-md px-3 py-2 ${config.headerColor}`}
      >
        <h3 className="text-sm font-semibold">{config.label}</h3>
        <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium dark:bg-black/20">
          {items.length}
        </span>
      </div>

      {/* Cards Container */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 dark:border-gray-700">
            <p className="text-center text-sm text-gray-400 dark:text-gray-500">
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
    </div>
  );
}
