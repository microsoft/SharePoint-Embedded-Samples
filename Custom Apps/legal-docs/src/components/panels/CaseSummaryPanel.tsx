import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Calendar, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchCaseSummary, fetchKeyDates, fetchJurisdiction, fetchCasePersonnel, KeyDate, CasePersonnel } from "@/services/sharepoint";

interface CaseSummaryPanelProps {
  containerName?: string;
}

const MAX_LINES = 10;
const APPROX_CHARS_PER_LINE = 60;

export default function CaseSummaryPanel({ containerName }: CaseSummaryPanelProps) {
  const { getAccessToken } = useAuth();
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [keyDates, setKeyDates] = useState<KeyDate[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [jurisdiction, setJurisdiction] = useState<string | null>(null);
  const [casePersonnel, setCasePersonnel] = useState<CasePersonnel[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!containerName) {
        setSummary(null);
        setKeyDates([]);
        setJurisdiction(null);
        setCasePersonnel([]);
        return;
      }

      setIsLoading(true);
      setIsLoadingDates(true);
      setIsLoadingPersonnel(true);
      setError(null);
      setIsExpanded(false);

      try {
        const token = await getAccessToken([
          "https://graph.microsoft.com/.default"
        ]);
        
        if (token) {
          // Fetch all data in parallel
          const [summaryResult, datesResult, jurisdictionResult, personnelResult] = await Promise.all([
            fetchCaseSummary(token, containerName),
            fetchKeyDates(token, containerName),
            fetchJurisdiction(token, containerName),
            fetchCasePersonnel(token, containerName)
          ]);
          setSummary(summaryResult);
          setKeyDates(datesResult);
          setJurisdiction(jurisdictionResult);
          setCasePersonnel(personnelResult);
        }
      } catch (err) {
        console.error("Error loading case data:", err);
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
        setIsLoadingDates(false);
        setIsLoadingPersonnel(false);
      }
    };

    loadData();
  }, [containerName, getAccessToken]);

  const { truncatedSummary, needsTruncation } = useMemo(() => {
    if (!summary) return { truncatedSummary: null, needsTruncation: false };
    
    const maxChars = MAX_LINES * APPROX_CHARS_PER_LINE;
    if (summary.length <= maxChars) {
      return { truncatedSummary: summary, needsTruncation: false };
    }
    
    // Find a good break point (end of sentence or word)
    let breakPoint = maxChars;
    const sentenceEnd = summary.lastIndexOf('. ', maxChars);
    if (sentenceEnd > maxChars * 0.7) {
      breakPoint = sentenceEnd + 1;
    } else {
      const wordEnd = summary.lastIndexOf(' ', maxChars);
      if (wordEnd > maxChars * 0.8) {
        breakPoint = wordEnd;
      }
    }
    
    return { 
      truncatedSummary: summary.substring(0, breakPoint) + '...', 
      needsTruncation: true 
    };
  }, [summary]);

  const displayText = isExpanded ? summary : truncatedSummary;

  return (
    <div className="space-y-4 p-4 overflow-auto h-full">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Case Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Case Name</p>
            <p className="font-medium">{containerName || "No case selected"}</p>
          </div>
          {jurisdiction && (
            <div>
              <p className="text-sm text-muted-foreground">Jurisdiction</p>
              <p className="font-medium">{jurisdiction}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Summary</p>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating summary...</span>
              </div>
            ) : error ? (
              <p className="text-sm text-destructive mt-1">{error}</p>
            ) : displayText ? (
              <div className="mt-1">
                <p className="text-sm leading-relaxed">{displayText}</p>
                {needsTruncation && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-2 text-primary"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show more
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1 italic">
                {containerName ? "No summary available" : "Select a case to view summary"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Case Personnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPersonnel ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading personnel...</span>
            </div>
          ) : casePersonnel.length > 0 ? (
            <div className="space-y-2 text-sm">
              {casePersonnel.map((person, index) => (
                <div key={index} className="flex justify-between">
                  <span>{person.role}</span>
                  <span className="text-muted-foreground">{person.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {containerName ? "No personnel found" : "Select a case to view personnel"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Key Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDates ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading dates...</span>
            </div>
          ) : keyDates.length > 0 ? (
            <div className="space-y-2 text-sm">
              {keyDates.map((keyDate, index) => (
                <div key={index} className="flex justify-between">
                  <span>{keyDate.description}</span>
                  <span className="text-muted-foreground">{keyDate.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {containerName ? "No key dates found" : "Select a case to view dates"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="border-l-2 border-primary pl-3">
              <p className="font-medium">Document uploaded</p>
              <p className="text-muted-foreground text-xs">2 hours ago</p>
            </div>
            <div className="border-l-2 border-muted pl-3">
              <p className="font-medium">Note added</p>
              <p className="text-muted-foreground text-xs">Yesterday</p>
            </div>
            <div className="border-l-2 border-muted pl-3">
              <p className="font-medium">Status updated</p>
              <p className="text-muted-foreground text-xs">3 days ago</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
