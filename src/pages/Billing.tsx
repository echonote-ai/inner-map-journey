import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  CreditCard, 
  ExternalLink, 
  Download, 
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  XCircle,
  CheckCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BillingStatus {
  subscribed: boolean;
  subscription: {
    id: string;
    status: string;
    plan: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
    amount: number;
    currency: string;
    interval: string;
  } | null;
  customerId: string;
  invoices: Array<{
    id: string;
    date: string;
    amount: number;
    currency: string;
    status: string;
    hostedInvoiceUrl: string | null;
    invoicePdf: string | null;
    number: string | null;
  }>;
}

const Billing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchBillingStatus();
  }, [user, navigate]);

  const fetchBillingStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("billing-status");
      
      if (error) throw error;
      setBillingStatus(data);
    } catch (error: any) {
      console.error("Error fetching billing status:", error);
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error || !data?.url) {
        if (data?.error === "portal_not_configured") {
          toast.error("Billing portal setup required", {
            description: "Please contact support to set up your billing portal.",
          });
        } else {
          throw error || new Error("No portal URL returned");
        }
        return;
      }

      const newWindow = window.open(data.url, "_blank");
      if (!newWindow) {
        toast.info("Pop-up blocked", {
          description: "Please allow pop-ups and try again.",
          action: {
            label: "Open in new tab",
            onClick: () => window.open(data.url, "_blank"),
          },
        });
      } else {
        toast.success("Opening billing portal...");
      }
    } catch (error: any) {
      console.error("Error opening portal:", error);
      toast.error("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCanceling(true);
      const { error } = await supabase.functions.invoke("billing-cancel", {
        body: { cancelAtPeriodEnd: true },
      });
      
      if (error) throw error;
      
      toast.success("Subscription cancelled", {
        description: "Your subscription will end at the current period.",
      });
      setCancelDialogOpen(false);
      fetchBillingStatus();
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      toast.error("Failed to cancel subscription");
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setReactivating(true);
      const { error } = await supabase.functions.invoke("billing-reactivate");
      
      if (error) throw error;
      
      toast.success("Subscription reactivated", {
        description: "Your subscription will continue after the current period.",
      });
      fetchBillingStatus();
    } catch (error: any) {
      console.error("Error reactivating subscription:", error);
      toast.error("Failed to reactivate subscription");
    } finally {
      setReactivating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Active", variant: "default" as const },
      trialing: { label: "Trial", variant: "secondary" as const },
      past_due: { label: "Past Due", variant: "destructive" as const },
      canceled: { label: "Canceled", variant: "outline" as const },
      incomplete: { label: "Incomplete", variant: "outline" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Subscription & Billing</h1>
          <p className="text-muted-foreground">Manage your subscription and billing information</p>
        </div>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Plan</span>
              {billingStatus?.subscription && getStatusBadge(billingStatus.subscription.status)}
            </CardTitle>
            <CardDescription>Your current subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {billingStatus?.subscription ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Inner Explorer</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAmount(billingStatus.subscription.amount, billingStatus.subscription.currency)} / {billingStatus.subscription.interval}
                    </p>
                  </div>
                  {billingStatus.subscription.cancelAtPeriodEnd ? (
                    <Badge variant="outline" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Cancels {formatDate(billingStatus.subscription.currentPeriodEnd)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Renews {formatDate(billingStatus.subscription.currentPeriodEnd)}
                    </Badge>
                  )}
                </div>

                {billingStatus.subscription.trialEnd && (
                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      Your trial ends on {formatDate(billingStatus.subscription.trialEnd)}
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={handleOpenPortal} disabled={portalLoading} className="gap-2">
                    {portalLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    Manage Billing
                  </Button>
                  
                  {billingStatus.subscription.cancelAtPeriodEnd ? (
                    <Button onClick={handleReactivateSubscription} disabled={reactivating} variant="outline">
                      {reactivating ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Reactivate Subscription
                    </Button>
                  ) : (
                    <Button onClick={() => setCancelDialogOpen(true)} variant="outline">
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">No active subscription</p>
                <Button onClick={() => navigate("/subscription")} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Upgrade Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade CTA (only show if not subscribed or on trial) */}
        {(!billingStatus?.subscribed || billingStatus?.subscription?.status === "trialing") && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Unlock Premium Features
              </CardTitle>
              <CardDescription>
                Get unlimited journals, advanced insights, and priority support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/subscription")} className="gap-2">
                View Plans
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Your recent invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {billingStatus?.invoices && billingStatus.invoices.length > 0 ? (
              <div className="space-y-3">
                {billingStatus.invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{invoice.number || invoice.id}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(invoice.date)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{formatAmount(invoice.amount, invoice.currency)}</p>
                        <Badge variant={invoice.status === "paid" ? "default" : "outline"} className="text-xs">
                          {invoice.status}
                        </Badge>
                      </div>
                      {invoice.hostedInvoiceUrl && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => window.open(invoice.hostedInvoiceUrl!, "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No invoices yet</p>
            )}
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you have any questions about your subscription or billing, our support team is here to help.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "mailto:support@example.com"}>
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You'll retain access until{" "}
              {billingStatus?.subscription?.currentPeriodEnd && formatDate(billingStatus.subscription.currentPeriodEnd)}.
              You can reactivate anytime before then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubscription} disabled={canceling}>
              {canceling ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Billing;
