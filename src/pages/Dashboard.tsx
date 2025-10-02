import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, LogOut } from "lucide-react";
import { UserInfoCard } from "@/components/dashboard/UserInfoCard";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { JournalsList } from "@/components/dashboard/JournalsList";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, subscribed, checkSubscription, signOut } = useAuth();
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    const checkSub = async () => {
      console.log('[Dashboard] Checking subscription...');
      await checkSubscription();
      setCheckingSubscription(false);
      console.log('[Dashboard] Subscription check complete');
    };
    checkSub();
  }, []);

  useEffect(() => {
    console.log('[Dashboard] State - user:', !!user, 'subscribed:', subscribed, 'checking:', checkingSubscription);
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Don't redirect until we've checked subscription
    if (checkingSubscription) {
      return;
    }

    if (!subscribed) {
      console.log('[Dashboard] Not subscribed, redirecting to subscription page');
      navigate("/subscription");
      return;
    }
  }, [user, subscribed, checkingSubscription, navigate]);

  if (checkingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
              My Account
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Manage your profile, subscription, and journal entries
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back Home
            </Button>
            <Button
              variant="outline"
              onClick={signOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
          </div>
        </div>

        {/* User Info & Subscription Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <UserInfoCard />
          <SubscriptionCard />
        </div>

        {/* Journals List */}
        <JournalsList />
      </div>
    </div>
  );
};

export default Dashboard;
