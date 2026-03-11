"use client";

import { useState } from "react";
import type { FQHCProfile, Address } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ServicesSelector } from "./services-selector";

/**
 * Common FQHC services for selection
 * Based on typical health center service offerings
 */
const FQHC_SERVICES = [
  "Primary Care",
  "Dental",
  "Behavioral Health",
  "HIV/AIDS Services",
  "Pharmacy",
  "OB/GYN",
  "Pediatrics",
  "Substance Abuse",
  "Vision",
];

/**
 * Patient demographics commonly served by FQHCs
 * Key factor in grant eligibility matching
 */
const PATIENT_DEMOGRAPHICS = [
  "Low-income",
  "Uninsured",
  "Homeless",
  "Migrant Workers",
  "Veterans",
  "Rural",
];

/**
 * US state abbreviations for address selection
 */
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

interface ProfileFormProps {
  initialData?: FQHCProfile | null;
  onSave: (data: Omit<FQHCProfile, "id" | "createdAt" | "updatedAt">) => Promise<void>;
}

interface FormErrors {
  name?: string;
  ein?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  staffCount?: string;
  annualBudget?: string;
  services?: string;
  patientDemographics?: string;
}

export function ProfileForm({ initialData, onSave }: ProfileFormProps) {
  // Form state
  const [name, setName] = useState(initialData?.name || "");
  const [ein, setEin] = useState(initialData?.ein || "");
  const [street, setStreet] = useState(initialData?.address?.street || "");
  const [city, setCity] = useState(initialData?.address?.city || "");
  const [state, setState] = useState(initialData?.address?.state || "");
  const [zip, setZip] = useState(initialData?.address?.zip || "");
  const [staffCount, setStaffCount] = useState(
    initialData?.staffCount?.toString() || ""
  );
  const [annualBudget, setAnnualBudget] = useState(
    initialData?.annualBudget?.toString() || ""
  );
  const [fqhcDesignation, setFqhcDesignation] = useState(
    initialData?.fqhcDesignation ?? true
  );
  const [services, setServices] = useState<string[]>(
    initialData?.services || []
  );
  const [patientDemographics, setPatientDemographics] = useState<string[]>(
    initialData?.patientDemographics || []
  );
  const [activeGrants, setActiveGrants] = useState(
    initialData?.activeGrants?.join(", ") || ""
  );

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Organization name is required";
    }

    if (!ein.trim()) {
      newErrors.ein = "EIN is required";
    } else if (!/^\d{2}-?\d{7}$/.test(ein.replace(/\s/g, ""))) {
      newErrors.ein = "EIN must be in format XX-XXXXXXX";
    }

    if (!street.trim()) {
      newErrors.street = "Street address is required";
    }

    if (!city.trim()) {
      newErrors.city = "City is required";
    }

    if (!state.trim()) {
      newErrors.state = "State is required";
    }

    if (!zip.trim()) {
      newErrors.zip = "ZIP code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(zip)) {
      newErrors.zip = "ZIP must be 5 or 9 digits";
    }

    if (!staffCount.trim()) {
      newErrors.staffCount = "Staff count is required";
    } else if (isNaN(Number(staffCount)) || Number(staffCount) < 0) {
      newErrors.staffCount = "Enter a valid number";
    }

    if (!annualBudget.trim()) {
      newErrors.annualBudget = "Annual budget is required";
    } else if (isNaN(Number(annualBudget)) || Number(annualBudget) < 0) {
      newErrors.annualBudget = "Enter a valid amount";
    }

    if (services.length === 0) {
      newErrors.services = "Select at least one service";
    }

    if (patientDemographics.length === 0) {
      newErrors.patientDemographics = "Select at least one demographic";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaveMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    const address: Address = {
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
    };

    // Parse comma-separated grants
    const grantsArray = activeGrants
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0);

    const profileData = {
      name: name.trim(),
      ein: ein.trim(),
      address,
      services,
      patientDemographics,
      staffCount: Number(staffCount),
      annualBudget: Number(annualBudget),
      activeGrants: grantsArray,
      fqhcDesignation,
    };

    try {
      await onSave(profileData);
      setSaveMessage({ type: "success", text: "Profile saved successfully!" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save profile";
      setSaveMessage({ type: "error", text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  }

  const isFirstTime = !initialData;

  return (
    <form onSubmit={handleSubmit}>
      <Card padding="lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Organization Profile
              </h1>
              {isFirstTime && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Tell us about your FQHC to help us find relevant grant
                  opportunities.
                </p>
              )}
            </div>
            <Button type="submit" loading={isSaving}>
              Save
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success/Error Message */}
          {saveMessage && (
            <div
              className={`rounded-md p-4 ${
                saveMessage.type === "success"
                  ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300"
              }`}
            >
              {saveMessage.text}
            </div>
          )}

          {/* Organization Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Organization Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              placeholder="Community Health Center of Example"
              required
            />
            <Input
              label="EIN (Tax ID)"
              value={ein}
              onChange={(e) => setEin(e.target.value)}
              error={errors.ein}
              placeholder="XX-XXXXXXX"
              required
            />
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Address
            </h3>
            <Input
              label="Street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              error={errors.street}
              placeholder="123 Main Street"
              required
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                error={errors.city}
                placeholder="City"
                required
              />
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="state"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  State
                </label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm transition-colors duration-150 focus:ring-2 focus:outline-none ${
                    errors.state
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  <option value="">Select</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.state}
                  </p>
                )}
              </div>
              <Input
                label="ZIP"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                error={errors.zip}
                placeholder="12345"
                required
              />
            </div>
          </div>

          {/* Staff and Budget */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Staff Count"
              type="number"
              value={staffCount}
              onChange={(e) => setStaffCount(e.target.value)}
              error={errors.staffCount}
              placeholder="50"
              min="0"
              required
            />
            <Input
              label="Annual Budget"
              type="number"
              value={annualBudget}
              onChange={(e) => setAnnualBudget(e.target.value)}
              error={errors.annualBudget}
              placeholder="5000000"
              min="0"
              helperText="Enter amount in USD (e.g., 5000000 for $5M)"
              required
            />
          </div>

          {/* FQHC Designation */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              FQHC Designation
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fqhcDesignation"
                  checked={fqhcDesignation === true}
                  onChange={() => setFqhcDesignation(true)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Yes
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fqhcDesignation"
                  checked={fqhcDesignation === false}
                  onChange={() => setFqhcDesignation(false)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  No
                </span>
              </label>
            </div>
          </div>

          {/* Services */}
          <ServicesSelector
            label="Services Offered (select all that apply)"
            value={services}
            onChange={setServices}
            options={FQHC_SERVICES}
            error={errors.services}
          />

          {/* Patient Demographics */}
          <ServicesSelector
            label="Patient Demographics (select all that apply)"
            value={patientDemographics}
            onChange={setPatientDemographics}
            options={PATIENT_DEMOGRAPHICS}
            error={errors.patientDemographics}
          />

          {/* Active Grants */}
          <Input
            label="Current Active Grants (comma-separated)"
            value={activeGrants}
            onChange={(e) => setActiveGrants(e.target.value)}
            placeholder="Ryan White, HRSA 330, Healthcare for Homeless"
            helperText="List your current grants to help us avoid conflicts and find complementary opportunities"
          />
        </CardContent>

        <CardFooter>
          <div className="flex justify-end">
            <Button type="submit" loading={isSaving}>
              Save Profile
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
