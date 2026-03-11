import { PipelineBoard } from "@/components/features/pipeline/pipeline-board";

export const metadata = {
  title: "Grant Pipeline - Rockland",
  description: "Manage your grant applications from discovery to award",
};

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grant Pipeline</h1>
        <p className="mt-1 text-gray-500">
          Track your grants from discovery to award. Move cards between stages
          to update status.
        </p>
      </div>

      {/* Pipeline Board */}
      <PipelineBoard />
    </div>
  );
}
