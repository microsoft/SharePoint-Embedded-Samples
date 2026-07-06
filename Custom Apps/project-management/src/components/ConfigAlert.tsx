
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useConfig } from '../context/ConfigContext';
import { appConfig } from '../config/appConfig';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function ConfigAlert() {
  const { showConfig, setShowConfig } = useConfig();

  return (
    <div className="relative">
      <Collapsible open={showConfig} onOpenChange={setShowConfig}>
        <CollapsibleTrigger className="absolute top-2 right-2 p-1 hover:bg-blue-100 rounded-full z-10">
          {showConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Alert className="bg-blue-50 border-blue-200 text-blue-700">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Information</AlertTitle>
            <AlertDescription>
              <p>You must configure these values in the app configuration:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>CLIENT_ID:</strong> {appConfig.clientId}</li>
                <li><strong>TENANT_ID:</strong> {appConfig.tenantId}</li>
                <li><strong>CONTAINER_TYPE_ID:</strong> {appConfig.containerTypeId}</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
