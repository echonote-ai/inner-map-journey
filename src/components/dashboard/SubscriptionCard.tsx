import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, ExternalLink, Sparkles, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export function SubscriptionCard() {
  const { subscriptionDetails, checkSubscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async (isRetry = false) => {
    setLoading(true);
    try {
      console.log('[SubscriptionCard] Opening customer portal...', { isRetry });
      
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        console.error('[SubscriptionCard] Portal invocation error:', error);
        throw error;
      }
      
      if (data?.error) {
        console.error('[SubscriptionCard] Portal error response:', data);
        
        // Handle specific error cases
        if (data.error === 'no_customer') {
          toast({
            variant: "destructive",
            title: "No Billing Account",
            description: "Please complete checkout first to manage your subscription.",
            action: (
              <Button variant="outline" size="sm" onClick={() => navigate('/subscription')}>
                Go to Checkout
              </Button>
            ),
          });
          return;
        }
        
        if (data.error === 'portal_not_configured') {
          toast({
            variant: "destructive",
            title: "Portal Not Available",
            description: "The billing portal is being set up. Please contact support for assistance.",
            action: (
              <Button variant="outline" size="sm" onClick={() => window.open('mailto:support@example.com', '_blank')}>
                Contact Support
              </Button>
            ),
          });
          return;
        }
        
        throw new Error(data.message || 'Failed to open portal');
      }
      
      if (data?.url) {
        console.log('[SubscriptionCard] Opening portal URL:', data.url);
        
        // Try to open in new tab
        const newWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
        
        // Handle popup blockers
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          console.warn('[SubscriptionCard] Popup blocked, opening in same tab');
          toast({
            title: "Opening Billing Portal",
            description: "If the portal doesn't open, please allow popups for this site.",
          });
          // Fallback: open in same tab
          window.location.href = data.url;
          return;
        }
        
        toast({
          title: "Portal Opened",
          description: "Manage your subscription in the new window.",
        });
        
        // Refresh subscription status after a delay
        setTimeout(async () => {
          await checkSubscription();
        }, 2000);
      }
    } catch (error: any) {
      console.error('[SubscriptionCard] Error opening customer portal:', error);
      
      const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('network');
      
      toast({
        variant: "destructive",
        title: "Portal Access Error",
        description: isNetworkError 
          ? "Network error. Please check your connection and try again."
          : "We couldn't open your billing portal. Please try again.",
        action: !isRetry ? (
          <Button variant="outline" size="sm" onClick={() => handleManageSubscription(true)}>
            Retry
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => window.open('mailto:support@example.com', '_blank')}>
            Contact Support
          </Button>
        ),
      });
    } finally {
      setLoading(false);
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
  );
}
