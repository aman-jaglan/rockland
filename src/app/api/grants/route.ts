/**
 * Grants API Route
 *
 * Provides endpoints for fetching grant opportunities from Grants.gov.
 * Supports filtering by keyword, agency, status, and FQHC relevance.
 *
 * GET /api/grants
 *   Query parameters:
 *   - keyword: Search term (optional)
 *   - agency: Filter by agency (optional)
 *   - status: 'posted' | 'forecasted' | 'all' (default: 'all')
 *   - limit: Number of results (default: 25, max: 100)
 *   - fqhcOnly: 'true' to filter for FQHC-relevant grants (default: 'false')
 *
 * Returns:
 *   - 200: { success: true, data: Grant[], total: number }
 *   - 400: { success: false, error: string } for invalid parameters
 *   - 500: { success: false, error: string } for server/API errors
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  searchGrants,
  filterGrantsForFQHC,
  type GrantSearchParams,
} from '@/lib/api/grants-gov';
import type { Grant, ApiResponse } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

interface GrantsApiResponse extends ApiResponse<Grant[]> {
  total?: number;
  cached?: boolean;
}

// ============================================================================
// Validation Helpers
// ============================================================================

function validateLimit(limitParam: string | null): number {
  if (!limitParam) {
    return 25;
  }

  const limit = parseInt(limitParam, 10);

  if (isNaN(limit) || limit < 1) {
    return 25;
  }

  if (limit > 100) {
    return 100;
  }

  return limit;
}

function validateStatus(statusParam: string | null): 'posted' | 'forecasted' | 'all' {
  if (!statusParam) {
    return 'all';
  }

  const normalizedStatus = statusParam.toLowerCase();

  if (normalizedStatus === 'posted') {
    return 'posted';
  }

  if (normalizedStatus === 'forecasted') {
    return 'forecasted';
  }

  return 'all';
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<GrantsApiResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse and validate query parameters
    const keyword = searchParams.get('keyword') || undefined;
    const agency = searchParams.get('agency') || undefined;
    const fundingCategory = searchParams.get('category') || 'HL';
    const status = validateStatus(searchParams.get('status'));
    const limit = validateLimit(searchParams.get('limit'));
    const fqhcOnly = searchParams.get('fqhcOnly') === 'true';

    // Build search parameters
    const searchOptions: GrantSearchParams = {
      keyword,
      agency,
      fundingCategory,
      status,
      limit,
    };

    // Fetch grants from Grants.gov API (with caching)
    let grants = await searchGrants(searchOptions);

    // Apply FQHC filtering if requested
    if (fqhcOnly) {
      grants = filterGrantsForFQHC(grants);
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      data: grants,
      total: grants.length,
    });
  } catch (error) {
    // Log error for debugging (server-side only)
    console.error('Error fetching grants:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch grants';

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
