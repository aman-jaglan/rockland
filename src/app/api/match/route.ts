import { NextRequest, NextResponse } from 'next/server';
import type { Grant, FQHCProfile, GrantMatch, ApiResponse } from '@/lib/types';
import {
  calculateGrantMatch,
  calculateBatchMatches,
  isAIMatchingAvailable,
} from '@/lib/api/ai-matching';

/**
 * Grant Match API Route
 *
 * Calculates AI-powered eligibility matching between grants and FQHC profiles.
 * Returns fit scores, explanations, and matched criteria to help CFOs
 * quickly evaluate grant opportunities.
 *
 * POST /api/match
 * Body: { grantId: string } or { grant: Grant } or { grants: Grant[] }
 *
 * The profile is read from the server-side storage.
 * For batch requests, grants array is processed in parallel.
 */

// In-memory profile storage (shared with /api/profile)
// In production, this would be a database query
let serverProfile: FQHCProfile | null = null;

/**
 * Helper to get the current FQHC profile
 * In production, this would query the database
 */
async function getProfile(): Promise<FQHCProfile | null> {
  // Try to fetch from the profile API
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/profile`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data as FQHCProfile;
      }
    }
  } catch (error) {
    // Fall through to return null
    console.error('Failed to fetch profile:', error);
  }

  return serverProfile;
}

/**
 * Helper to fetch grant details by ID
 * In production, this would query the database or grants API
 */
async function getGrantById(grantId: string): Promise<Grant | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/grants?id=${encodeURIComponent(grantId)}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data as Grant;
      }
    }
  } catch (error) {
    console.error('Failed to fetch grant:', error);
  }

  return null;
}

/**
 * POST /api/match
 *
 * Calculate grant match(es) for the current FQHC profile.
 *
 * Request body options:
 * - { grantId: string } - Fetch and match a single grant by ID
 * - { grant: Grant } - Match a single grant object
 * - { grants: Grant[] } - Match multiple grants in parallel
 *
 * Response:
 * - Single grant: { success: true, data: GrantMatch }
 * - Multiple grants: { success: true, data: GrantMatch[] }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GrantMatch | GrantMatch[]>>> {
  try {
    const body = await request.json();

    // Validate request has grant data
    const hasGrantId = typeof body.grantId === 'string' && body.grantId.length > 0;
    const hasGrant = body.grant && typeof body.grant === 'object';
    const hasGrants = Array.isArray(body.grants) && body.grants.length > 0;

    if (!hasGrantId && !hasGrant && !hasGrants) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request must include grantId, grant, or grants',
        },
        { status: 400 }
      );
    }

    // Get the FQHC profile
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: 'No FQHC profile found. Please complete your organization profile first.',
        },
        { status: 400 }
      );
    }

    // Handle batch matching
    if (hasGrants) {
      const grants = body.grants as Grant[];
      const matches = await calculateBatchMatches(grants, profile);

      return NextResponse.json({
        success: true,
        data: matches,
      });
    }

    // Handle single grant matching
    let grant: Grant | null = null;

    if (hasGrant) {
      grant = body.grant as Grant;
    } else if (hasGrantId) {
      grant = await getGrantById(body.grantId);

      if (!grant) {
        return NextResponse.json(
          {
            success: false,
            error: `Grant not found: ${body.grantId}`,
          },
          { status: 404 }
        );
      }
    }

    if (!grant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not resolve grant data',
        },
        { status: 400 }
      );
    }

    // Calculate the match
    const match = await calculateGrantMatch(grant, profile);

    return NextResponse.json({
      success: true,
      data: match,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to calculate grant match';

    console.error('Match API error:', error);

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
 * GET /api/match
 *
 * Returns information about the matching service.
 */
export async function GET(): Promise<NextResponse<ApiResponse<{
  aiAvailable: boolean;
  message: string;
}>>> {
  const aiAvailable = isAIMatchingAvailable();

  return NextResponse.json({
    success: true,
    data: {
      aiAvailable,
      message: aiAvailable
        ? 'AI-powered matching is available. Matches use Gemini for intelligent analysis.'
        : 'AI matching unavailable. Using rule-based matching (no API key configured).',
    },
  });
}
