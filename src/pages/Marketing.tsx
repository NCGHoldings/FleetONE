import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, 
  FileText, 
  CheckSquare, 
  FolderKanban, 
  Users, 
  Share2,
  TrendingUp,
  Clock,
  Star,
  Target
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketingDashboard } from "@/components/marketing/MarketingDashboard";
import { JobRequestsTab } from "@/components/marketing/JobRequestsTab";
import { TasksTab } from "@/components/marketing/TasksTab";
import { ProjectsTab } from "@/components/marketing/ProjectsTab";
import { TeamTab } from "@/components/marketing/TeamTab";
import { SocialMediaTab } from "@/components/marketing/SocialMediaTab";

const Marketing = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['marketing-stats'],
    queryFn: async () => {
      const [tasksResult, requestsResult, projectsResult, teamResult] = await Promise.all([
        supabase.from('marketing_tasks').select('status', { count: 'exact' }),
        supabase.from('marketing_job_requests').select('status', { count: 'exact' }),
        supabase.from('marketing_projects').select('status', { count: 'exact' }),
        supabase.from('marketing_team_members').select('id', { count: 'exact' }).eq('is_active', true),
      ]);

      return {
        totalTasks: tasksResult.count || 0,
        pendingRequests: requestsResult.data?.filter(r => r.status === 'pending').length || 0,
        activeProjects: projectsResult.data?.filter(p => p.status === 'in_progress').length || 0,
        teamMembers: teamResult.count || 0,
      };
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
              <Megaphone className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Marketing Hub
              </h1>
              <p className="text-muted-foreground">Manage tasks, projects, and team performance</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <CheckSquare className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">Total Tasks</p>
                <p className="text-2xl font-bold">{stats?.totalTasks || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 shadow-lg">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">Pending Requests</p>
                <p className="text-2xl font-bold">{stats?.pendingRequests || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-0 shadow-lg">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">Active Projects</p>
                <p className="text-2xl font-bold">{stats?.activeProjects || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0 shadow-lg">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">Team Members</p>
                <p className="text-2xl font-bold">{stats?.teamMembers || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-1 rounded-xl shadow-sm">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg">
              <TrendingUp className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="job-requests" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg">
              <FileText className="h-4 w-4 mr-2" />
              Job Requests
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg">
              <CheckSquare className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg">
              <FolderKanban className="h-4 w-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg">
              <Users className="h-4 w-4 mr-2" />
              Team
            </TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg">
              <Share2 className="h-4 w-4 mr-2" />
              Social Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <MarketingDashboard />
          </TabsContent>

          <TabsContent value="job-requests" className="mt-4">
            <JobRequestsTab />
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <TasksTab />
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <ProjectsTab />
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <TeamTab />
          </TabsContent>

          <TabsContent value="social" className="mt-4">
            <SocialMediaTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Marketing;
