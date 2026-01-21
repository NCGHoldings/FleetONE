import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Clock, 
  CheckCheck,
  Trash2,
  Eye
} from "lucide-react";

type Notification = {
  id: string;
  notification_type: string;
  title: string;
  message: string | null;
  reference_type: string | null;
  reference_id: string | null;
  severity: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  module: string | null;
  expires_at: string | null;
  user_id: string | null;
};

export const NotificationsView = () => {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["system-notifications", filter],
    queryFn: async () => {
      let query = supabase
        .from("system_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (filter === "unread") {
        query = query.eq("is_read", false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("system_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-notifications"] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("system_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["system-notifications"] });
    },
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("system_notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-notifications"] });
    },
  });

  const getNotificationIcon = (type: string, severity: string | null) => {
    if (severity === "error") {
      return <AlertTriangle className="w-5 h-5 text-destructive" />;
    }
    switch (type) {
      case "approval_pending":
        return <Clock className="w-5 h-5 text-orange-500" />;
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "overdue":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "reminder":
        return <Bell className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSeverityBadge = (severity: string | null) => {
    switch (severity) {
      case "error":
        return <Badge variant="destructive">High</Badge>;
      case "warning":
        return <Badge variant="secondary">Medium</Badge>;
      case "info":
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">
            System alerts and updates
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllAsRead.mutate()}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unread</CardDescription>
            <CardTitle className="text-2xl text-orange-600">
              {unreadCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Priority</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {notifications?.filter(n => n.severity === "error" && !n.is_read).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Approvals</CardDescription>
            <CardTitle className="text-2xl">
              {notifications?.filter(n => n.notification_type === "approval_pending" && !n.is_read).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total This Week</CardDescription>
            <CardTitle className="text-2xl">
              {notifications?.filter(n => {
                const created = new Date(n.created_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return created > weekAgo;
              }).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>Click to view details</CardDescription>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : notifications?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Bell className="w-8 h-8 mb-2" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications?.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      !notification.is_read ? "bg-accent/30 border-primary/20" : ""
                    }`}
                    onClick={() => !notification.is_read && markAsRead.mutate(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.notification_type, notification.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium ${!notification.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </span>
                          {getSeverityBadge(notification.severity)}
                          {!notification.is_read && (
                            <Badge variant="outline" className="text-xs">New</Badge>
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          {notification.reference_type && (
                            <Badge variant="outline" className="text-xs">
                              {notification.reference_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!notification.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead.mutate(notification.id);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification.mutate(notification.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
