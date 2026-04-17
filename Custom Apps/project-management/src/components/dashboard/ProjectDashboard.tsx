
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip,
  Cell
} from 'recharts';
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

interface ProjectDashboardProps {
  projectName: string;
}

const mockData = {
  stats: {
    totalProjects: 20,
    totalEffort: '18K',
    completedEffort: '6,596',
    remainingEffort: '11K'
  },
  progressData: [
    { name: 'Completed', value: 65 },
    { name: 'In Progress', value: 35 }
  ],
  effortByProject: [
    { name: 'Project A', effort: 120 },
    { name: 'Project B', effort: 100 },
    { name: 'Project C', effort: 80 },
    { name: 'Project D', effort: 60 },
    { name: 'Project E', effort: 40 },
    { name: 'Project F', effort: 30 }
  ],
  managerDistribution: [
    { name: 'Manager 1', value: 45 },
    { name: 'Manager 2', value: 25 },
    { name: 'Manager 3', value: 15 },
    { name: 'Manager 4', value: 15 }
  ]
};

const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042'];

export function ProjectDashboard({ projectName }: ProjectDashboardProps) {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">{projectName} Dashboard</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.stats.totalProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Effort
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.stats.totalEffort}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Effort Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.stats.completedEffort}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Effort Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.stats.remainingEffort}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Projects by Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ChartContainer config={{
                completedStatus: {
                  color: "#00C49F",
                  label: "Completed"
                },
                inProgressStatus: {
                  color: "#0088FE",
                  label: "In Progress"
                }
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockData.progressData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {mockData.progressData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Effort by Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ChartContainer config={{
                effortMetric: {
                  color: "#0088FE",
                  label: "Effort"
                }
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockData.effortByProject}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip />
                    <Bar dataKey="effort" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects by Project Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ChartContainer config={{
                managerDistribution: {
                  color: "#00C49F",
                  label: "Manager Distribution"
                }
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockData.managerDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                    >
                      {mockData.managerDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
