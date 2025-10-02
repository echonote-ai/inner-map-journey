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
                onClick={() => navigate("/billing")}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage Billing
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
