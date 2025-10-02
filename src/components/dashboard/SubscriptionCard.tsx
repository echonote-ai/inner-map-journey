import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, ExternalLink, Sparkles, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { PortalErrorCard } from "./PortalErrorCard";

export function SubscriptionCard() {
  const { subscriptionDetails, checkSubscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [portalError, setPortalError] = useState<{
    code: string;
    message: string;
    action: string;
    stripeError?: string;
    requestId?: string;
  } | null>(null);
  const [cachedPortalUrl, setCachedPortalUrl] = useState<string | null>(null);

  const handleManageSubscription = async () => {
    setLoading(true);
    setPortalError(null);
    
    try {
      console.log('[SubscriptionCard] Opening customer portal...');
      
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        console.error('[SubscriptionCard] Portal invocation error:', error);
        throw error;
      }
      
      if (data?.error) {
        console.error('[SubscriptionCard] Portal error response:', data);
        
        // Store error for display in error card
        setPortalError({
          code: data.error,
          message: data.message,
          action: data.action,
          stripeError: data.stripeError,
          requestId: data.requestId,
        });
        
        // Cache the portal URL if available (for "Open in New Tab" fallback)
        if (data.url) {
          setCachedPortalUrl(data.url);
        }
        
        return;
      }
      
      if (data?.url) {
        console.log('[SubscriptionCard] Opening portal URL:', data.url);
        setCachedPortalUrl(data.url);
        
        // Try to open in new tab
        const newWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
        
        // Handle popup blockers
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          console.warn('[SubscriptionCard] Popup blocked');
          setPortalError({
            code: 'popup_blocked',
            message: 'Popup blocked by browser. Use "Open in New Tab" button below.',
            action: 'open_in_tab',
            requestId: data.requestId,
          });
          return;
        }
        
        toast({
          title: "Portal Opened",
          description: "Manage your subscription in the new window.",
        });
        
        // Clear any previous errors
        setPortalError(null);
        
        // Refresh subscription status after a delay
        setTimeout(async () => {
          await checkSubscription();
        }, 2000);
      }
    } catch (error: any) {
      console.error('[SubscriptionCard] Error opening customer portal:', error);
      
      setPortalError({
        code: 'unknown',
        message: "We couldn't open your billing portal right now. Please try again or contact support.",
        action: 'retry',
        stripeError: import.meta.env.DEV ? error?.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (cachedPortalUrl) {
      window.open(cachedPortalUrl, '_blank', 'noopener,noreferrer');
      setPortalError(null);
      toast({
        title: "Portal Opened",
        description: "Manage your subscription in the new window.",
      });
    }
  };

  const getStatusBadge = () => {
    if (!subscriptionDetails?.subscribed) {
      return <Badge variant="secondary">Free</Badge>;
    }
    
    if (subscriptionDetails.subscription_status === "trialing") {
      return <Badge className="bg-primary/20 text-primary">Trial</Badge>;
    }
    
    return <Badge className="bg-primary">Active</Badge>;
  };

  const getPlanIcon = () => {
    if (subscriptionDetails?.plan_name === "Inner Explorer") {
      return <Crown className="w-5 h-5 text-primary" />;
    }
    return <Sparkles className="w-5 h-5 text-muted-foreground" />;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {getPlanIcon()}
                <h3 className="text-xl font-serif font-semibold">
                  {subscriptionDetails?.plan_name || "Free Spirit"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
              </div>
            </div>
          </div>

          {subscriptionDetails?.subscription_end && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {subscriptionDetails.subscription_status === "trialing" 
                  ? `Trial ends ${formatDate(subscriptionDetails.subscription_end)}`
                  : `Renews ${formatDate(subscriptionDetails.subscription_end)}`
                }
              </span>
            </div>
          )}

          <div className="flex gap-2">
            {subscriptionDetails?.subscribed ? (
              <Button 
                onClick={() => handleManageSubscription()}
                disabled={loading}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Manage Subscription
              </Button>
            ) : (
              <Button 
                onClick={() => navigate("/subscription")}
                className="gap-2"
              >
                <Crown className="w-4 h-4" />
                Upgrade Plan
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Error Card - shown below subscription card when error occurs */}
      {portalError && (
        <PortalErrorCard
          error={portalError}
          onRetry={handleManageSubscription}
          onOpenInNewTab={handleOpenInNewTab}
          isRetrying={loading}
          portalUrl={cachedPortalUrl || undefined}
        />
      )}
    </>
  );
}
