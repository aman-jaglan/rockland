import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  children: React.ReactNode;
}

function SummaryCard({ title, children }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function DashboardHomePage() {
  // Placeholder data - will be replaced with real data later
  const newMatchesCount = 12;
  const pipelineStatus = {
    evaluating: 3,
    applying: 2,
    submitted: 1,
  };
  const nextDeadline = "March 28, 2026";

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Your grant discovery and pipeline overview
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* New Matches This Week */}
        <SummaryCard title="New Matches This Week">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {newMatchesCount}
            </span>
            <span className="text-sm text-gray-500">grants</span>
          </div>
        </SummaryCard>

        {/* Pipeline Status */}
        <SummaryCard title="Pipeline Status">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold text-amber-600">
                {pipelineStatus.evaluating}
              </span>
              <span className="text-sm text-gray-500">Evaluating</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold text-blue-600">
                {pipelineStatus.applying}
              </span>
              <span className="text-sm text-gray-500">Applying</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold text-green-600">
                {pipelineStatus.submitted}
              </span>
              <span className="text-sm text-gray-500">Submitted</span>
            </div>
          </div>
        </SummaryCard>

        {/* Upcoming Deadlines */}
        <SummaryCard title="Upcoming Deadlines">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-gray-900">
              {nextDeadline}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">Next deadline</p>
        </SummaryCard>
      </div>

      {/* Top Matching Grants */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Top Matching Grants
        </h2>
        <Card>
          <CardContent>
            <p className="text-gray-500">Loading grants...</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
