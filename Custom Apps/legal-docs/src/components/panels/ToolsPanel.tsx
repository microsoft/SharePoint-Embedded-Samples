import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  FileSearch, 
  Calculator, 
  Calendar, 
  BookOpen, 
  Scale,
  FileText,
  MessageSquare
} from "lucide-react";

export default function ToolsPanel() {
  const tools = [
    { icon: Search, label: "Document Search", description: "Search across all case documents" },
    { icon: FileSearch, label: "E-Discovery", description: "Advanced discovery tools" },
    { icon: Calculator, label: "Billing Calculator", description: "Calculate time and expenses" },
    { icon: Calendar, label: "Deadline Tracker", description: "Manage case deadlines" },
    { icon: BookOpen, label: "Legal Research", description: "Access legal databases" },
    { icon: Scale, label: "Case Analysis", description: "AI-powered case analysis" },
    { icon: FileText, label: "Document Generator", description: "Generate legal documents" },
    { icon: MessageSquare, label: "Client Portal", description: "Communicate with clients" },
  ];

  return (
    <div className="space-y-4 p-4 overflow-auto h-full">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Tools</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {tools.slice(0, 4).map((tool) => (
            <Button
              key={tool.label}
              variant="outline"
              className="h-auto flex-col items-center gap-2 p-4"
            >
              <tool.icon className="h-5 w-5" />
              <span className="text-xs text-center">{tool.label}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tools.map((tool) => (
            <Button
              key={tool.label}
              variant="ghost"
              className="w-full justify-start h-auto py-3"
            >
              <tool.icon className="h-4 w-4 mr-3" />
              <div className="text-left">
                <p className="font-medium text-sm">{tool.label}</p>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
