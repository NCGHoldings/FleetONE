import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Bus, Users, FileText, DollarSign, Wrench, GraduationCap, Truck, Calendar } from "lucide-react";

interface ModuleStats {
  name: string;
  icon: React.ReactNode;
  count: number;
  activeCount?: number;
  path: string;
  color: string;
}

interface RealDataSummaryProps {
  modules: ModuleStats[];
}

export const RealDataSummary = ({ modules }: RealDataSummaryProps) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {modules.map((module) => (
        <Card
          key={module.name}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate(module.path)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${module.color}`}>
                {module.icon}
              </div>
              <Badge variant="secondary" className="text-lg font-bold">
                {module.count}
              </Badge>
            </div>
            <p className="mt-2 font-medium text-sm">{module.name}</p>
            {module.activeCount !== undefined && (
              <p className="text-xs text-muted-foreground">
                {module.activeCount} active
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const defaultModules: ModuleStats[] = [
  { name: 'Fleet', icon: <Bus className="h-5 w-5 text-blue-600" />, count: 0, path: '/fleet-management', color: 'bg-blue-100' },
  { name: 'Staff', icon: <Users className="h-5 w-5 text-green-600" />, count: 0, path: '/staff-management', color: 'bg-green-100' },
  { name: 'Special Hire', icon: <FileText className="h-5 w-5 text-purple-600" />, count: 0, path: '/special-hire', color: 'bg-purple-100' },
  { name: 'Yutong', icon: <Truck className="h-5 w-5 text-orange-600" />, count: 0, path: '/yutong-quotations', color: 'bg-orange-100' },
  { name: 'School Bus', icon: <GraduationCap className="h-5 w-5 text-cyan-600" />, count: 0, path: '/school-bus-service', color: 'bg-cyan-100' },
  { name: 'Maintenance', icon: <Wrench className="h-5 w-5 text-amber-600" />, count: 0, path: '/maintenance', color: 'bg-amber-100' },
  { name: 'Accounting', icon: <DollarSign className="h-5 w-5 text-emerald-600" />, count: 0, path: '/accounting', color: 'bg-emerald-100' },
  { name: 'Daily Trips', icon: <Calendar className="h-5 w-5 text-indigo-600" />, count: 0, path: '/daily-trips', color: 'bg-indigo-100' },
];
