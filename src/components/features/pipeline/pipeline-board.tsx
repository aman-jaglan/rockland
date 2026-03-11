"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PipelineColumn } from "./pipeline-column";
import type { PipelineItemWithGrant, PipelineStatus } from "@/lib/types";

const VISIBLE_STAGES: PipelineStatus[] = [
  "interested",
  "evaluating",
  "applying",
  "submitted",
  "awarded",
];

// Plus icon component
function PlusIcon({ className }: { className?: string }) {
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
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

export function PipelineBoard() {
  const [items, setItems] = useState<PipelineItemWithGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Fetch pipeline data on mount
  useEffect(() => {
    async function fetchPipeline() {
      try {
        const response = await fetch("/api/pipeline");
        if (!response.ok) {
          throw new Error("Failed to fetch pipeline data");
        }
        const data = await response.json();
        setItems(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchPipeline();
  }, []);

  // Handle status change with optimistic update
  async function handleMoveStatus(itemId: string, newStatus: PipelineStatus) {
    // Find the item
    const itemIndex = items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return;

    const previousItems = [...items];
    const updatedItem = { ...items[itemIndex], status: newStatus };

    // Optimistic update
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? updatedItem : item))
    );
    setUpdatingItemId(itemId);

    try {
      const response = await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }
    } catch {
      // Revert on failure
      setItems(previousItems);
      setError("Failed to update status. Please try again.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  // Group items by status
  function getItemsByStatus(status: PipelineStatus): PipelineItemWithGrant[] {
    return items.filter((item) => item.status === status);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading pipeline...
          </p>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Grant Pipeline
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track your grant opportunities from interest to award
          </p>
        </div>
        <Button variant="primary" size="sm">
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Grant
        </Button>
      </div>

      {/* Error banner for non-critical errors */}
      {error && items.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {error}
          </p>
        </div>
      )}

      {/* Vertical Pipeline View */}
      <div className="space-y-6">
        {VISIBLE_STAGES.map((status) => (
          <PipelineColumn
            key={status}
            status={status}
            items={getItemsByStatus(status)}
            onMoveStatus={handleMoveStatus}
            updatingItemId={updatingItemId}
          />
        ))}
      </div>

      {/* Summary Stats */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {items.length} grants in pipeline
        </p>
        <div className="flex gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {items.filter((i) => i.status === "applying").length} in progress
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            {items.filter((i) => i.status === "awarded").length} awarded
          </p>
        </div>
      </div>
    </div>
  );
}
