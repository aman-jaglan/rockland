"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PipelineItemWithGrant, PipelineStatus } from "@/lib/types";

// Icon components
function AlertTriangleIcon({ className }: { className?: string }) {
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
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
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
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
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
        d="M15 19l-7-7 7-7"
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

function PlayIcon({ className }: { className?: string }) {
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
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
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
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}

interface PipelineCardProps {
  item: PipelineItemWithGrant;
  onMoveStatus: (itemId: string, newStatus: PipelineStatus) => void;
  isUpdating?: boolean;
}

const STAGE_ORDER: PipelineStatus[] = [
  "interested",
  "evaluating",
  "applying",
  "submitted",
  "awarded",
];

const STAGE_LABELS: Record<PipelineStatus, { prev: string; next: string }> = {
  interested: { prev: "", next: "Move to Evaluating" },
  evaluating: { prev: "Back", next: "Start Application" },
  applying: { prev: "Back", next: "Submit" },
  submitted: { prev: "Back", next: "Mark Awarded" },
  awarded: { prev: "Back", next: "" },
  rejected: { prev: "", next: "" },
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

function formatDeadline(deadline: Date): { text: string; daysUntil: number } {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysUntil = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const monthDay = deadlineDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return { text: `${monthDay} (${daysUntil} days)`, daysUntil };
}

function getScoreBadgeVariant(score: number): "success" | "warning" | "default" {
  if (score >= 8) return "success";
  if (score >= 5) return "warning";
  return "default";
}

function getScoreEmoji(score: number): string {
  if (score >= 8) return "🟢";
  if (score >= 5) return "🟡";
  return "⚪";
}

interface ProgressBarProps {
  progress: number;
}

function ProgressBar({ progress }: ProgressBarProps) {
  const filledBlocks = Math.round((progress / 100) * 16);
  const emptyBlocks = 16 - filledBlocks;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">Progress:</span>
      <div className="flex">
        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
          {"█".repeat(filledBlocks)}
        </span>
        <span className="font-mono text-xs text-gray-300 dark:text-gray-600">
          {"░".repeat(emptyBlocks)}
        </span>
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {progress}%
      </span>
    </div>
  );
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

  const { text: deadlineText, daysUntil } = formatDeadline(item.deadline);
  const isUrgent = daysUntil <= 14;

  const fundingDisplay =
    item.grant.fundingAmount.max > 0 && item.grant.fundingAmount.max !== item.grant.fundingAmount.min
      ? `${formatCurrency(item.grant.fundingAmount.min)} - ${formatCurrency(item.grant.fundingAmount.max)}`
      : formatCurrency(item.grant.fundingAmount.max || item.grant.fundingAmount.min);

  // Extract progress from notes for "applying" stage (mock - in production this would be a real field)
  const progressMatch = item.notes.match(/(\d+)%/);
  const progress = progressMatch ? parseInt(progressMatch[1], 10) : null;

  const stageLabels = STAGE_LABELS[item.status];

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-gray-800 ${
        isUpdating
          ? "border-indigo-300 dark:border-indigo-600"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left Section: Score + Content */}
        <div className="flex flex-1 gap-3">
          {/* Score Badge */}
          <div className="flex-shrink-0">
            <Badge
              variant={getScoreBadgeVariant(item.fitScore)}
              size="sm"
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
            >
              <span className="mr-0.5">{getScoreEmoji(item.fitScore)}</span>
              {item.fitScore}/10
            </Badge>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Title */}
            <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
              {item.grant.title}
            </h4>

            {/* Meta info */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{item.grant.agency}</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {fundingDisplay}
              </span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="flex items-center gap-1">
                Due: {deadlineText}
                {isUrgent && (
                  <AlertTriangleIcon className="h-4 w-4 text-amber-500" />
                )}
              </span>
            </div>

            {/* Progress bar for applying stage */}
            {item.status === "applying" && progress !== null && (
              <div className="mt-2">
                <ProgressBar progress={progress} />
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:ml-4">
          {/* View Button */}
          <Link href={`/grants/${item.grantId}`}>
            <Button variant="outline" size="sm">
              <EyeIcon className="mr-1 h-3 w-3" />
              View
            </Button>
          </Link>

          {/* Back Button */}
          {canMovePrevious && previousStatus && (
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={() => onMoveStatus(item.id, previousStatus)}
            >
              <ChevronLeftIcon className="mr-1 h-3 w-3" />
              {stageLabels.prev}
            </Button>
          )}

          {/* Forward Button */}
          {canMoveNext && nextStatus && (
            <Button
              variant="primary"
              size="sm"
              disabled={isUpdating}
              onClick={() => onMoveStatus(item.id, nextStatus)}
            >
              {item.status === "applying" ? (
                <>
                  <SendIcon className="mr-1 h-3 w-3" />
                  {stageLabels.next}
                </>
              ) : item.status === "evaluating" ? (
                <>
                  <PlayIcon className="mr-1 h-3 w-3" />
                  {stageLabels.next}
                </>
              ) : (
                <>
                  {stageLabels.next}
                  <ChevronRightIcon className="ml-1 h-3 w-3" />
                </>
              )}
            </Button>
          )}

          {/* Continue Application button for applying stage */}
          {item.status === "applying" && (
            <Link href={`/grants/${item.grantId}/apply`}>
              <Button variant="outline" size="sm">
                Continue Application
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
