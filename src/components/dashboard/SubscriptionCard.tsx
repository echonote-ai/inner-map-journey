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

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Opening Stripe Portal",
          description: "Manage your subscription in the new tab",
        });
        
        // Refresh subscription status after a delay
        setTimeout(() => {
          checkSubscription();
        }, 3000);
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "Error",
        description: "Failed to open subscription management portal",
        variant: "destructive",
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
              onClick={handleManageSubscription}
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
