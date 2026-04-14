import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { UpcomingMeetingsPanel } from "./UpcomingMeetingsPanel";
import { FuturePlanningModal } from "./FuturePlanningModal";

export const InquiryPlanningTab = () => {
  const [showPlanningModal, setShowPlanningModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Planning Dashboard</h2>
          <p className="text-muted-foreground">
            Manage scheduled meetings, calls, and follow-ups with customers
          </p>
        </div>
        <Button onClick={() => setShowPlanningModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">This Week</h3>
          </div>
          <p className="text-2xl font-bold">-</p>
          <p className="text-sm text-muted-foreground">Scheduled activities</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Today</h3>
          </div>
          <p className="text-2xl font-bold">-</p>
          <p className="text-sm text-muted-foreground">Meetings & calls</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold">Overdue</h3>
          </div>
          <p className="text-2xl font-bold text-destructive">-</p>
          <p className="text-sm text-muted-foreground">Needs attention</p>
        </div>
      </div>

      {/* Upcoming Meetings Panel */}
      <UpcomingMeetingsPanel />

      {/* Planning Modal */}
      <FuturePlanningModal
        open={showPlanningModal}
        onClose={() => setShowPlanningModal(false)}
        inquiryId={null}
      />
    </div>
  );
};
