import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  FileBarChart,
  Download,
  Clock,
  DollarSign,
  Users
} from "lucide-react";

export default function ReportsPanel() {
  const reports = [
    { icon: Clock, label: "Time Summary", description: "Hours logged by team member" },
    { icon: DollarSign, label: "Billing Report", description: "Revenue and expenses" },
    { icon: FileBarChart, label: "Document Activity", description: "File access and changes" },
    { icon: Users, label: "Team Productivity", description: "Work distribution analysis" },
    { icon: TrendingUp, label: "Case Progress", description: "Milestone tracking" },
    { icon: PieChart, label: "Budget Analysis", description: "Budget vs actual spending" },
  ];

  return (
    <div className="space-y-4 p-4 overflow-auto h-full">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">127</p>
            <p className="text-xs text-muted-foreground">Documents</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">48.5</p>
            <p className="text-xs text-muted-foreground">Hours Logged</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">$12.4K</p>
            <p className="text-xs text-muted-foreground">Billed</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">5</p>
            <p className="text-xs text-muted-foreground">Active Tasks</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Available Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {reports.map((report) => (
            <div
              key={report.label}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <report.icon className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">{report.label}</p>
                  <p className="text-xs text-muted-foreground">{report.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Generate Custom Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            <FileBarChart className="h-4 w-4 mr-2" />
            Create New Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
