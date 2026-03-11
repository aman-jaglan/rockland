"use client";

import { useState, useEffect } from "react";
import type { FQHCProfile } from "@/lib/types";
import { ProfileForm } from "@/components/features/profile/profile-form";

/**
 * Profile Page
 *
 * Displays the FQHC organization profile form.
 * - Loads existing profile from localStorage (prototype) or API
 * - First-time users see empty form with helpful guidance
 * - Saves profile to localStorage and syncs with API
 */

const PROFILE_STORAGE_KEY = "fqhc_profile";

export default function ProfilePage() {
  const [profile, setProfile] = useState<FQHCProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setIsLoading(true);
    setLoadError(null);

    try {
      // First, try to load from localStorage (for prototype persistence)
      const localData = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        // Convert date strings back to Date objects
        parsed.createdAt = new Date(parsed.createdAt);
        parsed.updatedAt = new Date(parsed.updatedAt);
        setProfile(parsed);
      }

      // Also try to fetch from API (for future database integration)
      const response = await fetch("/api/profile");
      const result = await response.json();

      if (result.success && result.data) {
        // API has data - use it (it may be more up-to-date)
        const apiProfile = result.data;
        apiProfile.createdAt = new Date(apiProfile.createdAt);
        apiProfile.updatedAt = new Date(apiProfile.updatedAt);
        setProfile(apiProfile);

        // Sync to localStorage
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(apiProfile));
      }
    } catch (error) {
      // If API fails but we have localStorage data, continue with that
      if (!profile) {
        setLoadError("Failed to load profile. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(
    data: Omit<FQHCProfile, "id" | "createdAt" | "updatedAt">
  ) {
    // Save to API
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to save profile");
    }

    const savedProfile = result.data;
    savedProfile.createdAt = new Date(savedProfile.createdAt);
    savedProfile.updatedAt = new Date(savedProfile.updatedAt);

    // Update local state
    setProfile(savedProfile);

    // Also save to localStorage for prototype persistence
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(savedProfile));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading profile...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/30">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error loading profile
                </h3>
                <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                  {loadError}
                </p>
                <button
                  onClick={loadProfile}
                  className="mt-3 text-sm font-medium text-red-800 underline hover:text-red-900 dark:text-red-300 dark:hover:text-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ProfileForm initialData={profile} onSave={handleSave} />
      </div>
    </div>
  );
}
