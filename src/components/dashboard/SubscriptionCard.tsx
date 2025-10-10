import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Calendar, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export function SubscriptionCard() {
  const { subscriptionDetails } = useAuth();
  const navigate = useNavigate();

  const getStatusBadge = () => {
    const status = subscriptionDetails?.subscription_status;
    
    if (!subscriptionDetails?.subscribed) {
      return <Badge variant="secondary">Free</Badge>;
    }
    
    if (status === "trialing") {
      return <Badge className="bg-primary/20 text-primary">Trial</Badge>;
    }
    
    if (status === "active") {
      return <Badge className="bg-primary">Active</Badge>;
    }
    
    if (status === "canceled") {
      return <Badge variant="destructive">Canceled</Badge>;
    }
    
    if (status === "past_due" || status === "unpaid") {
      return <Badge variant="destructive">Past Due</Badge>;
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
                  : subscriptionDetails.subscription_status === "canceled"
                  ? `Access ends ${formatDate(subscriptionDetails.subscription_end)}`
                  : `Renews ${formatDate(subscriptionDetails.subscription_end)}`
                }
              </span>
            </div>
          )}

          {!subscriptionDetails?.can_create_journals && subscriptionDetails?.total_journals && subscriptionDetails.total_journals > 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <p>You can view your {subscriptionDetails.total_journals} saved journal{subscriptionDetails.total_journals !== 1 ? 's' : ''}, but need an active subscription to create new ones.</p>
            </div>
          )}

          <div className="flex gap-2">
            {subscriptionDetails?.subscribed || subscriptionDetails?.subscription_status === "canceled" || subscriptionDetails?.subscription_status === "past_due" ? (
              <Button 
                onClick={() => navigate("/billing")}
                className="gap-2"
                variant={subscriptionDetails.subscription_status === "canceled" ? "default" : "default"}
              >
                <Settings className="w-4 h-4" />
                {subscriptionDetails.subscription_status === "canceled" ? "Reactivate Subscription" : "Manage Billing"}
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
    </>
  );
}
