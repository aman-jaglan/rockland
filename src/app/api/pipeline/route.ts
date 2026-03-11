import { NextRequest, NextResponse } from "next/server";
import type {
  PipelineItemWithGrant,
  PipelineStatus,
  Grant,
  PipelineItem,
  CreatePipelineItemInput,
  UpdatePipelineItemInput,
} from "@/lib/types";

// ============================================================================
// Mock Data for Prototype
// ============================================================================

// In-memory store for prototype (would use DB in production)
const mockGrants: Grant[] = [
  {
    id: "hrsa-24-001",
    title: "Health Center Program Service Area Competition",
    agency: "HRSA",
    description: "Funding for new access points in underserved areas",
    eligibilityDescription: "FQHCs and FQHC Look-Alikes",
    fundingAmount: { min: 650000, max: 650000 },
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    postedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    grantType: "Competitive",
    cfdaNumber: "93.224",
    status: "posted",
    applicationUrl: "https://grants.gov/apply",
    sourceUrl: "https://grants.gov/hrsa-24-001",
  },
  {
    id: "cdc-24-015",
    title: "Community Health Worker Training Initiative",
    agency: "CDC",
    description: "Training and deployment of community health workers",
    eligibilityDescription: "Healthcare organizations serving underserved populations",
    fundingAmount: { min: 250000, max: 500000 },
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    postedDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    grantType: "Cooperative Agreement",
    cfdaNumber: "93.421",
    status: "posted",
    applicationUrl: "https://grants.gov/apply",
    sourceUrl: "https://grants.gov/cdc-24-015",
  },
  {
    id: "samhsa-24-008",
    title: "Behavioral Health Integration in Primary Care",
    agency: "SAMHSA",
    description: "Integration of behavioral health services in primary care settings",
    eligibilityDescription: "FQHCs, community health centers, primary care clinics",
    fundingAmount: { min: 400000, max: 750000 },
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    postedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    grantType: "Discretionary",
    cfdaNumber: "93.243",
    status: "posted",
    applicationUrl: "https://grants.gov/apply",
    sourceUrl: "https://grants.gov/samhsa-24-008",
  },
  {
    id: "hrsa-24-012",
    title: "Ryan White HIV/AIDS Program Part C Early Intervention Services",
    agency: "HRSA",
    description: "Early intervention services and primary care for persons living with HIV",
    eligibilityDescription: "FQHCs with HIV/AIDS services",
    fundingAmount: { min: 300000, max: 500000 },
    deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
    postedDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
    grantType: "Competitive",
    cfdaNumber: "93.918",
    status: "posted",
    applicationUrl: "https://grants.gov/apply",
    sourceUrl: "https://grants.gov/hrsa-24-012",
  },
  {
    id: "acl-24-003",
    title: "Chronic Disease Self-Management Education Programs",
    agency: "ACL",
    description: "Evidence-based self-management programs for chronic conditions",
    eligibilityDescription: "Community organizations, healthcare providers",
    fundingAmount: { min: 100000, max: 200000 },
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
    postedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    grantType: "Discretionary",
    cfdaNumber: "93.734",
    status: "posted",
    applicationUrl: "https://grants.gov/apply",
    sourceUrl: "https://grants.gov/acl-24-003",
  },
];

let mockPipelineItems: PipelineItem[] = [
  {
    id: "pipeline-1",
    grantId: "hrsa-24-001",
    fqhcProfileId: "fqhc-001",
    status: "interested",
    fitScore: 9,
    fitExplanation: "Strong match for FQHC with expansion plans in underserved areas",
    notes: "",
    assignedTo: null,
    addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "pipeline-2",
    grantId: "cdc-24-015",
    fqhcProfileId: "fqhc-001",
    status: "evaluating",
    fitScore: 7,
    fitExplanation: "Good fit - organization has community health worker program",
    notes: "Need to review staffing capacity",
    assignedTo: "Sarah",
    addedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  },
  {
    id: "pipeline-3",
    grantId: "samhsa-24-008",
    fqhcProfileId: "fqhc-001",
    status: "applying",
    fitScore: 8,
    fitExplanation: "Excellent match - existing behavioral health services to expand",
    notes: "Application 55% complete",
    assignedTo: "Michael",
    addedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: "pipeline-4",
    grantId: "hrsa-24-012",
    fqhcProfileId: "fqhc-001",
    status: "submitted",
    fitScore: 9,
    fitExplanation: "Perfect fit - currently operating HIV services program",
    notes: "Submitted on time, awaiting review",
    assignedTo: "Sarah",
    addedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
  },
  {
    id: "pipeline-5",
    grantId: "acl-24-003",
    fqhcProfileId: "fqhc-001",
    status: "interested",
    fitScore: 6,
    fitExplanation: "Moderate fit - could complement existing chronic disease programs",
    notes: "",
    assignedTo: null,
    addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getGrantById(grantId: string): Grant | undefined {
  return mockGrants.find((g) => g.id === grantId);
}

function getPipelineItemsWithGrants(): PipelineItemWithGrant[] {
  return mockPipelineItems
    .filter((item) => item.status !== "rejected") // Exclude rejected from main view
    .map((item) => {
      const grant = getGrantById(item.grantId);
      if (!grant) {
        throw new Error(`Grant not found: ${item.grantId}`);
      }
      return { ...item, grant };
    });
}

function generateId(): string {
  return `pipeline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// API Route Handlers
// ============================================================================

/**
 * GET /api/pipeline
 * Returns all pipeline items with grant details
 */
export async function GET() {
  try {
    const items = getPipelineItemsWithGrants();
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("Error fetching pipeline:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pipeline data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pipeline
 * Add a new item to the pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreatePipelineItemInput = await request.json();

    // Validate required fields
    if (!body.grantId || !body.fqhcProfileId) {
      return NextResponse.json(
        { success: false, error: "grantId and fqhcProfileId are required" },
        { status: 400 }
      );
    }

    // Check if grant exists
    const grant = getGrantById(body.grantId);
    if (!grant) {
      return NextResponse.json(
        { success: false, error: "Grant not found" },
        { status: 404 }
      );
    }

    // Create new pipeline item
    const newItem: PipelineItem = {
      id: generateId(),
      grantId: body.grantId,
      fqhcProfileId: body.fqhcProfileId,
      status: body.status || "interested",
      fitScore: body.fitScore,
      fitExplanation: body.fitExplanation,
      notes: body.notes || "",
      assignedTo: body.assignedTo || null,
      addedAt: new Date(),
      updatedAt: new Date(),
      deadline: new Date(body.deadline),
    };

    mockPipelineItems.push(newItem);

    const itemWithGrant: PipelineItemWithGrant = { ...newItem, grant };

    return NextResponse.json({ success: true, data: itemWithGrant }, { status: 201 });
  } catch (error) {
    console.error("Error creating pipeline item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create pipeline item" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pipeline
 * Update a pipeline item (status change, notes, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body: UpdatePipelineItemInput & { id: string } = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "Pipeline item id is required" },
        { status: 400 }
      );
    }

    // Find the item
    const itemIndex = mockPipelineItems.findIndex((item) => item.id === body.id);
    if (itemIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Pipeline item not found" },
        { status: 404 }
      );
    }

    // Validate status if provided
    const validStatuses: PipelineStatus[] = [
      "interested",
      "evaluating",
      "applying",
      "submitted",
      "awarded",
      "rejected",
    ];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Update the item
    const updatedItem: PipelineItem = {
      ...mockPipelineItems[itemIndex],
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo }),
      ...(body.fitScore !== undefined && { fitScore: body.fitScore }),
      ...(body.fitExplanation !== undefined && { fitExplanation: body.fitExplanation }),
      updatedAt: new Date(),
    };

    mockPipelineItems[itemIndex] = updatedItem;

    const grant = getGrantById(updatedItem.grantId);
    if (!grant) {
      return NextResponse.json(
        { success: false, error: "Associated grant not found" },
        { status: 500 }
      );
    }

    const itemWithGrant: PipelineItemWithGrant = { ...updatedItem, grant };

    return NextResponse.json({ success: true, data: itemWithGrant });
  } catch (error) {
    console.error("Error updating pipeline item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update pipeline item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pipeline
 * Remove a pipeline item (or move to rejected)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Pipeline item id is required" },
        { status: 400 }
      );
    }

    const itemIndex = mockPipelineItems.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Pipeline item not found" },
        { status: 404 }
      );
    }

    // Remove the item
    mockPipelineItems.splice(itemIndex, 1);

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Error deleting pipeline item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete pipeline item" },
      { status: 500 }
    );
  }
}
