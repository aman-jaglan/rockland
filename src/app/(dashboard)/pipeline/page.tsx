import { PipelineBoard } from "@/components/features/pipeline/pipeline-board";

export const metadata = {
  title: "Grant Pipeline - Rockland",
  description: "Manage your grant applications from interest to award",
};

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      {/* Pipeline Board */}
      <PipelineBoard />
    </div>
  );
}
