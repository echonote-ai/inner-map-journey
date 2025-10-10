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
    currentPeriodEnd: string | null;
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

interface UpcomingInvoice {
  amount: number;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  lines: Array<{
    description: string;
    amount: number;
    currency: string;
    quantity: number;
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
  const [upcomingInvoice, setUpcomingInvoice] = useState<UpcomingInvoice | null>(null);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

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

      // Fetch upcoming invoice if no invoices exist but subscription is active
      if (data?.subscription && (!data?.invoices || data.invoices.length === 0)) {
        fetchUpcomingInvoice();
      }
    } catch (error: any) {
      console.error("Error fetching billing status:", error);
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingInvoice = async () => {
    try {
      setLoadingUpcoming(true);
      const { data, error } = await supabase.functions.invoke("billing-upcoming");
      
      if (error && error.message !== "No upcoming invoice available") {
        throw error;
      }
      
      if (data && !data.error) {
        setUpcomingInvoice(data);
      }
    } catch (error: any) {
      console.error("Error fetching upcoming invoice:", error);
    } finally {
      setLoadingUpcoming(false);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTrialDaysLeft = () => {
    if (!billingStatus?.subscription?.trialEnd) return null;
    const trialEnd = new Date(billingStatus.subscription.trialEnd);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  const getTrialProgress = () => {
    if (!billingStatus?.subscription?.trialEnd) return 0;
    const trialEnd = new Date(billingStatus.subscription.trialEnd);
    const now = new Date();
    const totalDays = 14; // Assuming 14-day trial
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const progress = ((totalDays - daysLeft) / totalDays) * 100;
    return Math.min(Math.max(progress, 0), 100);
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

        {/* Alert for canceled subscriptions */}
        {billingStatus?.subscription?.status === "canceled" && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your subscription has been canceled. You can still view all your saved journals, but you'll need to reactivate your subscription to create new ones.
            </AlertDescription>
          </Alert>
        )}

        {/* Alert for past due subscriptions */}
        {(billingStatus?.subscription?.status === "past_due" || billingStatus?.subscription?.status === "unpaid") && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your subscription payment is past due. Please update your payment method to continue creating new journals.
            </AlertDescription>
          </Alert>
        )}

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Plan</span>
              {billingStatus?.subscription && getStatusBadge(billingStatus.subscription.status)}
            </CardTitle>
            <CardDescription>Your subscription and billing information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {billingStatus?.subscription ? (
              <>
                {/* Trial Status with Progress */}
                {billingStatus.subscription.status === "trialing" && billingStatus.subscription.trialEnd && (
                  <div className="p-4 border rounded-lg bg-primary/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold">Trial Active</p>
                          <p className="text-sm text-muted-foreground">
                            {getTrialDaysLeft()} days left in your trial
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Trial</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Trial ends {formatDate(billingStatus.subscription.trialEnd)}</span>
                        <span>{Math.round(getTrialProgress())}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${getTrialProgress()}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Plan Details */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Inner Explorer Premium</p>
                    <p className="text-sm text-muted-foreground">
                      Unlimited journals with AI-powered insights and reflections
                    </p>
                    <p className="text-sm font-medium mt-1">
                      {formatAmount(billingStatus.subscription.amount, billingStatus.subscription.currency)} / {billingStatus.subscription.interval}
                    </p>
                  </div>
                  {billingStatus.subscription.currentPeriodEnd && (
                    billingStatus.subscription.cancelAtPeriodEnd ? (
                      <Badge variant="outline" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Cancels {formatDate(billingStatus.subscription.currentPeriodEnd)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Renews {formatDate(billingStatus.subscription.currentPeriodEnd)}
                      </Badge>
                    )
                  )}
                </div>

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
                  
                  {billingStatus.subscription.status === "canceled" ? (
                    <Button onClick={() => navigate("/subscription")} variant="default">
                      Reactivate Subscription
                    </Button>
                  ) : billingStatus.subscription.cancelAtPeriodEnd ? (
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

        {/* Upgrade CTA (only show if not subscribed, on trial, or canceled) */}
        {(!billingStatus?.subscribed || 
          billingStatus?.subscription?.status === "trialing" ||
          billingStatus?.subscription?.status === "canceled") && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {billingStatus?.subscription?.status === "canceled" 
                  ? "Reactivate Your Subscription"
                  : "Unlock Premium Features"}
              </CardTitle>
              <CardDescription>
                {billingStatus?.subscription?.status === "canceled"
                  ? "Resume your subscription to continue creating new journals"
                  : "Get unlimited journals, advanced insights, and priority support"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/subscription")} className="gap-2">
                {billingStatus?.subscription?.status === "canceled" ? "View Plans" : "View Plans"}
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Your invoices and upcoming charges</CardDescription>
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
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">No invoices yet</p>
                {upcomingInvoice && (
                  <div className="p-4 border rounded-lg bg-muted/50 text-left space-y-2">
                    <p className="font-medium text-sm">Upcoming Invoice Preview</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {upcomingInvoice.periodStart && upcomingInvoice.periodEnd 
                          ? `${formatDate(upcomingInvoice.periodStart)} - ${formatDate(upcomingInvoice.periodEnd)}`
                          : "Next billing period"}
                      </span>
                      <span className="font-semibold">{formatAmount(upcomingInvoice.amount, upcomingInvoice.currency)}</span>
                    </div>
                    {upcomingInvoice.lines.map((line, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground">
                        {line.description}
                      </div>
                    ))}
                  </div>
                )}
                {loadingUpcoming && (
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                )}
              </div>
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
