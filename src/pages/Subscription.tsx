import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Crown, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { NavBar } from "@/components/NavBar";

const Subscription = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { subscribed, subscriptionDetails, checkSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  
  const reflectionId = searchParams.get("id");
  const shouldSave = searchParams.get("save") === "true";

  // Initial check on mount only
  useEffect(() => {
    const initialCheck = async () => {
      setCheckingSubscription(true);
      await checkSubscription();
      setCheckingSubscription(false);
    };
    initialCheck();
  }, []); // Run only once on mount

  if (checkingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  const tiers = [
    {
      name: "Free Spirit",
      price: "$0",
      period: "forever",
      description: "Begin your journey",
      icon: Sparkles,
      features: [
        "Unlimited reflections",
        "AI-guided conversations",
        "Beautiful journal summaries",
        "Save up to 3 journals"
      ],
      cta: "Continue Free",
      highlighted: false,
      priceId: null,
    },
    {
      name: "Inner Explorer",
      price: "$9.99",
      period: "per month",
      description: "Deepen your practice",
      icon: Sparkles,
      features: [
        "Everything in Free",
        "Save unlimited journals",
        "Search your reflections",
        "Export your journals",
        "Priority support"
      ],
      cta: "Start 7-Day Free Trial",
      highlighted: true,
      priceId: "price_1SDds0Jaf5VF0aw32AdFJvNb",
      hasTrial: true,
    },
    {
      name: "Soul Cartographer",
      price: "$29.99",
      period: "per month",
      description: "Master your inner world",
      icon: Crown,
      features: [
        "Everything in Explorer",
        "Advanced pattern recognition",
        "Personalized insights",
        "Monthly reflection reports",
        "1-on-1 guidance sessions",
        "Early access to features"
      ],
      cta: "Coming Soon",
      highlighted: false,
      priceId: null,
      comingSoon: true,
      hasTrial: true,
    },
  ];

  const handleSelectTier = async (priceId: string | null, comingSoon?: boolean) => {
    if (comingSoon) {
      toast({
        title: "Coming Soon!",
        description: "This premium tier will be available soon. Stay tuned!",
      });
      return;
    }

    if (!priceId) {
      // Free tier - try to save pending journal if exists and within limit
      const pendingJournalSummary = localStorage.getItem('pendingJournalSummary');
      
      if (pendingJournalSummary) {
        setLoading(true);
        try {
          // Try to save - backend will check free tier limit
          const pendingJournalType = localStorage.getItem('pendingJournalType');
          const { data, error } = await supabase.functions.invoke('save-journal', {
            body: { 
              summary: pendingJournalSummary, 
              reflection_type: pendingJournalType || 'daily' 
            },
          });

          if (error) {
            // Check if it's a free tier limit error
            if (error.message?.includes('not_entitled') || error.message?.includes('free_tier_limit')) {
              toast({
                title: "Free Limit Reached",
                description: "You've used all 3 free journal saves. Upgrade to save unlimited journals!",
                variant: "destructive",
              });
              setLoading(false);
              return;
            }
            throw error;
          }

          // Success - saved within free tier
          const entitlementData = data;
          const remaining = entitlementData?.journals_remaining ?? 0;
          
          toast({
            title: "Journal Saved!",
            description: remaining > 0 ? `You have ${remaining} free saves remaining.` : "This was your last free save. Upgrade for unlimited!",
          });
          
          // Clean up
          localStorage.removeItem('pendingJournalSummary');
          localStorage.removeItem('pendingJournalType');
          localStorage.removeItem('pendingReflectionMessages');
          localStorage.removeItem('pendingReflectionType');
          
          navigate('/dashboard');
          return;
        } catch (err) {
          console.error('Error saving free journal:', err);
          toast({
            title: "Error",
            description: "Could not save your journal. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
      
      navigate("/");
      return;
    }

    // Paid tier - create checkout
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Redirecting to checkout",
          description: "Complete your subscription to unlock all features",
        });
        
        // If they wanted to save, we'll save after checkout
        if (shouldSave && reflectionId) {
          localStorage.setItem('pendingSave', reflectionId);
        }
        
        // Check subscription status after a delay
        setTimeout(() => {
          checkSubscription();
        }, 5000);
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Error",
        description: "Failed to start checkout process",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="flex items-center justify-center p-4 py-24">
        <div className="max-w-7xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold">
            Choose Your Path
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every journey is unique. Select the level of support that resonates with you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isCurrentPlan = subscribed && tier.priceId === "price_1SDds0Jaf5VF0aw32AdFJvNb";
            
            return (
              <Card 
                key={tier.name}
                className={`relative overflow-hidden transition-all duration-300 ${
                  tier.highlighted 
                    ? 'border-2 border-primary shadow-[var(--shadow-warm)] scale-105' 
                    : 'border-2 hover:border-primary/50'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-br-lg">
                    Your Plan
                  </div>
                )}
                
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      tier.highlighted ? 'bg-primary/10' : 'bg-secondary/10'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        tier.highlighted ? 'text-primary' : 'text-secondary-foreground'
                      }`} />
                    </div>
                    <h3 className="text-2xl font-serif font-bold">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  </div>

                  <div className="space-y-1">
                    {tier.hasTrial ? (
                      <>
                        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-semibold inline-block mb-2">
                          🎉 7-Day Free Trial
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-muted-foreground line-through">{tier.price}</span>
                          <span className="text-4xl font-bold">$0</span>
                          <span className="text-muted-foreground text-sm">for 7 days</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Then {tier.price}/{tier.period}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">{tier.price}</span>
                        <span className="text-muted-foreground text-sm">/{tier.period}</span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleSelectTier(tier.priceId, tier.comingSoon)}
                    disabled={loading || isCurrentPlan || tier.comingSoon}
                  >
                    {isCurrentPlan ? "Current Plan" : tier.cta}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-center space-y-4 pt-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
          <p className="text-sm text-muted-foreground italic">
            All plans include our core reflection features. Upgrade anytime to unlock more.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Subscription;
