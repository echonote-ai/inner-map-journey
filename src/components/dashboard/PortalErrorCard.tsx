import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink, Mail, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PortalErrorCardProps {
  error: {
    code: string;
    message: string;
    action: string;
    stripeError?: string;
    requestId?: string;
  } | null;
  onRetry: () => void;
  onOpenInNewTab: () => void;
  isRetrying: boolean;
  portalUrl?: string;
}

export function PortalErrorCard({ 
  error, 
  onRetry, 
  onOpenInNewTab, 
  isRetrying,
  portalUrl 
}: PortalErrorCardProps) {
  if (!error) return null;

  const isDev = import.meta.env.DEV;

  const getErrorTitle = () => {
    switch (error.code) {
      case 'no_customer':
        return 'Billing Account Setup';
      case 'portal_not_configured':
        return 'Portal Configuration Needed';
      default:
        return 'Billing Portal Unavailable';
    }
  };

  const getErrorDescription = () => {
    switch (error.code) {
      case 'no_customer':
        return "We're linking your billing account. This usually takes just a few seconds. Please try again.";
      case 'portal_not_configured':
        return "The billing portal is being set up. Our team has been notified. Please contact support for immediate assistance.";
      default:
        return "We couldn't open your billing portal right now. Please try again or contact support if the issue persists.";
    }
  };

  return (
    <Card className="p-6 border-destructive/50 bg-destructive/5">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-lg">{getErrorTitle()}</h3>
            <p className="text-sm text-muted-foreground">
              {getErrorDescription()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={onRetry}
            disabled={isRetrying}
            className="gap-2"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>

          {portalUrl && (
            <Button 
              onClick={onOpenInNewTab}
              variant="outline"
              className="gap-2"
              size="sm"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </Button>
          )}

          <Button 
            onClick={() => window.location.href = 'mailto:support@example.com'}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </Button>
        </div>

        {/* Dev Diagnostics */}
        {isDev && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Badge variant="outline" className="mb-2">Dev Diagnostics</Badge>
            <div className="space-y-1 text-xs font-mono text-muted-foreground">
              <div><span className="text-foreground">Error Code:</span> {error.code}</div>
              {error.requestId && (
                <div><span className="text-foreground">Request ID:</span> {error.requestId}</div>
              )}
              {error.stripeError && (
                <div className="mt-2">
                  <span className="text-foreground">Stripe Error:</span>
                  <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] overflow-x-auto">
                    {error.stripeError}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
