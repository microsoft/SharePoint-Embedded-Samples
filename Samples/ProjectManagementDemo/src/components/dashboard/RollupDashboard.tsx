
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
  Cell,
  Legend,
  CartesianGrid
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

const mockRollupData = {
  summary: {
    totalProjects: 25,
    totalWorkItems: 272,
    totalTasksDue: 125,
    issuesDue: 54,
    issuesLate: 51,
    tasksLate: 70
  },
  statusData: [
    { name: 'In Progress', value: 35, count: 9 },
    { name: 'Not Started', value: 25, count: 6 },
    { name: 'Completed', value: 40, count: 10 }
  ],
  tasksByType: [
    { name: 'Project', tasks: 8, color: '#8B5CF6' },
    { name: 'Tracker', tasks: 12, color: '#06B6D4' },
    { name: 'Enhancement', tasks: 5, color: '#10B981' }
  ]
};

const COLORS = ['#00C49F', '#FFBB28', '#FF8042'];
const TASK_COLORS = ['#8B5CF6', '#06B6D4', '#10B981'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold">{data.name}</p>
        <p className="text-sm text-gray-600">
          Projects: {data.payload.count}
        </p>
        <p className="text-sm text-gray-600">
          Percentage: {data.value}%
        </p>
      </div>
    );
  }
  return null;
};

const TaskTypeTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800">{label}</p>
        <div className="flex items-center gap-2 mt-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.payload.color }}
          />
          <p className="text-sm text-gray-600">
            Tasks: {data.value}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function RollupDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Project Sites Rollup</h2>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockRollupData.summary.totalProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Work Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockRollupData.summary.totalWorkItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasks Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockRollupData.summary.totalTasksDue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Issues Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockRollupData.summary.issuesDue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Issues Late
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{mockRollupData.summary.issuesLate}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasks Late
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{mockRollupData.summary.tasksLate}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[450px]">
              <ChartContainer config={{
                status: {
                  color: "#00C49F",
                  label: "Status Distribution"
                }
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockRollupData.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockRollupData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry: any) => (
                        <span style={{ color: entry.color }}>
                          {value} ({entry.payload.count} projects)
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"></div>
              Tasks by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[450px]">
              {/* Removed the ChartContainer wrapper that might be interfering with bar rendering */}
              <ResponsiveContainer width="100%" height={350}>
                <BarChart 
                  data={mockRollupData.tasksByType} 
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    type="number"
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => `${value}`}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <Tooltip content={<TaskTypeTooltip />} />
                  <Bar 
                    dataKey="tasks" 
                    radius={[0, 4, 4, 0]}
                    minPointSize={5}
                    barSize={30}
                  >
                    {mockRollupData.tasksByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              {/* Custom Legend */}
              <div className="flex justify-center gap-6 mt-4">
                {mockRollupData.tasksByType.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full shadow-sm" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600 font-medium">
                      {item.name} ({item.tasks})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
