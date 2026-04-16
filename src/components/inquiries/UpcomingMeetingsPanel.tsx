import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, Phone, AlertCircle } from "lucide-react";
import { format, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import { useState } from "react";
import { InquiryDetailsModal } from "./InquiryDetailsModal";
import { FollowUpStatusUpdateModal } from "./FollowUpStatusUpdateModal";

export const UpcomingMeetingsPanel = () => {
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(null);

  const { data: upcomingMeetings, isLoading } = useQuery({
    queryKey: ["upcoming-meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiry_follow_ups")
        .select(`
          *,
          inquiry:vehicle_inquiries(
            id,
            inquiry_number,
            customer_name,
            product_type,
            status
          )
        `)
        .eq("completion_status", "pending")
        .not("planned_date", "is", null)
        .order("planned_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const getUrgencyBadge = (plannedDate: string) => {
    const date = new Date(plannedDate);
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-red-500">Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-yellow-500">Tomorrow</Badge>;
    }
    const daysUntil = differenceInDays(date, new Date());
    if (daysUntil <= 7) {
      return <Badge className="bg-yellow-500">This Week</Badge>;
    }
    return <Badge variant="secondary">Upcoming</Badge>;
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return format(date, "MMM dd, yyyy 'at' hh:mm a");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Meetings & Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const overdueMeetings = upcomingMeetings?.filter(
    (m) => isPast(new Date(m.planned_date!)) && !isToday(new Date(m.planned_date!))
  );
  const todayMeetings = upcomingMeetings?.filter((m) => isToday(new Date(m.planned_date!)));
  const futureMeetings = upcomingMeetings?.filter(
    (m) => !isPast(new Date(m.planned_date!)) && !isToday(new Date(m.planned_date!))
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Overdue Follow-ups */}
        {overdueMeetings && overdueMeetings.length > 0 && (
          <Card className="border-red-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Overdue Follow-ups ({overdueMeetings.length})
              </CardTitle>
              <CardDescription>Requires immediate attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {overdueMeetings.map((meeting) => (
                <div key={meeting.id} className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 dark:bg-red-950/20">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{meeting.inquiry.product_type}</Badge>
                        {getUrgencyBadge(meeting.planned_date!)}
                      </div>
                      <p className="font-semibold">{meeting.inquiry.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{meeting.inquiry.inquiry_number}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateTime(meeting.planned_date!)}</span>
                    </div>
                    {meeting.follow_up_type && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span className="capitalize">{meeting.follow_up_type.replace("_", " ")}</span>
                      </div>
                    )}
                    {meeting.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                    {meeting.notes && (
                      <p className="text-muted-foreground text-xs mt-2">{meeting.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedInquiryId(meeting.inquiry.id)}
                    >
                      View Inquiry
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSelectedFollowUpId(meeting.id)}
                    >
                      Mark Complete
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Today's Meetings */}
        {todayMeetings && todayMeetings.length > 0 && (
          <Card className="border-yellow-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Schedule ({todayMeetings.length})
              </CardTitle>
              <CardDescription>Meetings and calls scheduled for today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayMeetings.map((meeting) => (
                <div key={meeting.id} className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{meeting.inquiry.product_type}</Badge>
                        {getUrgencyBadge(meeting.planned_date!)}
                      </div>
                      <p className="font-semibold">{meeting.inquiry.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{meeting.inquiry.inquiry_number}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(meeting.planned_date!), "hh:mm a")}</span>
                    </div>
                    {meeting.follow_up_type && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span className="capitalize">{meeting.follow_up_type.replace("_", " ")}</span>
                      </div>
                    )}
                    {meeting.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                    {meeting.notes && (
                      <p className="text-muted-foreground text-xs mt-2">{meeting.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedInquiryId(meeting.inquiry.id)}
                    >
                      View Inquiry
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSelectedFollowUpId(meeting.id)}
                    >
                      Mark Complete
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Future Meetings */}
      {futureMeetings && futureMeetings.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Upcoming Meetings & Calls ({futureMeetings.length})</CardTitle>
            <CardDescription>Scheduled for later this week and beyond</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {futureMeetings.map((meeting) => (
              <div key={meeting.id} className="border-l-4 border-primary pl-4 py-2">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{meeting.inquiry.product_type}</Badge>
                      {getUrgencyBadge(meeting.planned_date!)}
                    </div>
                    <p className="font-semibold">{meeting.inquiry.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{meeting.inquiry.inquiry_number}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDateTime(meeting.planned_date!)}</span>
                  </div>
                  {meeting.follow_up_type && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span className="capitalize">{meeting.follow_up_type.replace("_", " ")}</span>
                    </div>
                  )}
                  {meeting.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{meeting.location}</span>
                    </div>
                  )}
                  {meeting.notes && (
                    <p className="text-muted-foreground text-sm mt-2">{meeting.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedInquiryId(meeting.inquiry.id)}
                  >
                    View Inquiry
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedFollowUpId(meeting.id)}
                  >
                    Mark Complete
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!upcomingMeetings?.length && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No scheduled meetings or calls</p>
            <p className="text-sm text-muted-foreground mt-2">
              Schedule follow-ups with your customers to track your pipeline
            </p>
          </CardContent>
        </Card>
      )}

      {selectedInquiryId && (
        <InquiryDetailsModal
          inquiryId={selectedInquiryId}
          open={!!selectedInquiryId}
          onClose={() => setSelectedInquiryId(null)}
          onRefresh={() => {}}
        />
      )}

      {selectedFollowUpId && upcomingMeetings && (
        <FollowUpStatusUpdateModal
          followUpId={selectedFollowUpId}
          inquiryId={upcomingMeetings.find(m => m.id === selectedFollowUpId)?.inquiry_id || ""}
          inquiry={upcomingMeetings.find(m => m.id === selectedFollowUpId)?.inquiry as any}
          open={!!selectedFollowUpId}
          onClose={() => {
            setSelectedFollowUpId(null);
          }}
        />
      )}
    </>
  );
};
