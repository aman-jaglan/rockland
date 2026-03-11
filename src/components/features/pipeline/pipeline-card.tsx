"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PipelineItemWithGrant, PipelineStatus } from "@/lib/types";

interface PipelineCardProps {
  item: PipelineItemWithGrant;
  onMoveStatus: (itemId: string, newStatus: PipelineStatus) => void;
  isUpdating?: boolean;
}

const STAGE_ORDER: PipelineStatus[] = [
  "discovered",
  "evaluating",
  "applying",
  "submitted",
  "awarded",
];

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

function formatDeadline(deadline: Date): string {
  const date = new Date(deadline);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDeadlineUrgency(deadline: Date): "danger" | "warning" | "default" {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysUntil = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil < 0) return "danger";
  if (daysUntil <= 7) return "danger";
  if (daysUntil <= 14) return "warning";
  return "default";
}

function truncateTitle(title: string, maxLength: number = 40): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + "...";
}

export function PipelineCard({
  item,
  onMoveStatus,
  isUpdating = false,
}: PipelineCardProps) {
  const currentIndex = STAGE_ORDER.indexOf(item.status);
  const canMovePrevious = currentIndex > 0;
  const canMoveNext = currentIndex < STAGE_ORDER.length - 1;

  const previousStatus = canMovePrevious ? STAGE_ORDER[currentIndex - 1] : null;
  const nextStatus = canMoveNext ? STAGE_ORDER[currentIndex + 1] : null;

  const deadlineUrgency = getDeadlineUrgency(item.deadline);
  const fundingDisplay = item.grant.fundingAmount.max > 0
    ? `${formatCurrency(item.grant.fundingAmount.min)} - ${formatCurrency(item.grant.fundingAmount.max)}`
    : formatCurrency(item.grant.fundingAmount.min);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Title */}
      <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
        {truncateTitle(item.grant.title)}
      </h4>

      {/* Funding Amount */}
      <p className="mb-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
        {fundingDisplay}
      </p>

      {/* Deadline */}
      <div className="mb-2 flex items-center gap-2">
        <Badge variant={deadlineUrgency} size="sm">
          {formatDeadline(item.deadline)}
        </Badge>
        {item.fitScore > 0 && (
          <Badge variant="info" size="sm">
            {item.fitScore}/10 match
          </Badge>
        )}
      </div>

      {/* Agency */}
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        {item.grant.agency}
      </p>

      {/* Move Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canMovePrevious || isUpdating}
          onClick={() => previousStatus && onMoveStatus(item.id, previousStatus)}
          className="flex-1 text-xs"
        >
          &larr; Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canMoveNext || isUpdating}
          onClick={() => nextStatus && onMoveStatus(item.id, nextStatus)}
          className="flex-1 text-xs"
        >
          Next &rarr;
        </Button>
      </div>
    </div>
  );
}
