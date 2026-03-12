import { NextRequest, NextResponse } from "next/server";
import type { FQHCProfile, ApiResponse } from "@/lib/types";
import { SYNTHETIC_PROFILE } from "@/lib/data/synthetic-profile";

/**
 * Profile API Route
 *
 * Handles CRUD operations for the FQHC organization profile.
 * Returns the synthetic profile by default for demo mode.
 *
 * For prototype: Profile starts with synthetic data, can be updated
 * For production: Would connect to database (Drizzle + SQLite/PostgreSQL)
 */

// In-memory storage for server-side operations
// Starts with synthetic profile for demo mode
let serverProfile: FQHCProfile | null = { ...SYNTHETIC_PROFILE };

/**
 * GET /api/profile
 *
 * Returns the current organization profile.
 * Returns synthetic profile if no custom profile exists.
 */
export async function GET(): Promise<NextResponse<ApiResponse<FQHCProfile>>> {
  try {
    // Return the current profile (starts with synthetic for demo)
    const profile = serverProfile || { ...SYNTHETIC_PROFILE };

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch profile";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile
 *
 * Creates or updates the organization profile.
 * Accepts profile data without id, createdAt, updatedAt (auto-generated).
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<FQHCProfile>>> {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "name",
      "ein",
      "address",
      "services",
      "patientDemographics",
      "staffCount",
      "annualBudget",
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate address structure
    if (
      !body.address.street ||
      !body.address.city ||
      !body.address.state ||
      !body.address.zip
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Address must include street, city, state, and zip",
        },
        { status: 400 }
      );
    }

    // Create or update profile
    const now = new Date();

    const profile: FQHCProfile = {
      id: serverProfile?.id || generateProfileId(),
      name: body.name,
      ein: body.ein,
      address: body.address,
      services: body.services,
      patientDemographics: body.patientDemographics,
      staffCount: Number(body.staffCount),
      annualBudget: Number(body.annualBudget),
      activeGrants: body.activeGrants || [],
      fqhcDesignation: body.fqhcDesignation ?? true,
      createdAt: serverProfile?.createdAt || now,
      updatedAt: now,
    };

    // Store in memory (would be database in production)
    serverProfile = profile;

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save profile";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile
 *
 * Alias for POST - updates the profile.
 * Included for REST convention.
 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<FQHCProfile>>> {
  return POST(request);
}

/**
 * Generate a simple unique ID for the profile
 */
function generateProfileId(): string {
  return `fqhc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
