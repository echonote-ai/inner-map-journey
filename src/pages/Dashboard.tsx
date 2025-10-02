import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Reflection {
  id: string;
  reflection_type: string;
  summary: string;
  created_at: string;
  completed_at: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, subscribed, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    const checkSub = async () => {
      console.log('[Dashboard] Checking subscription...');
      await checkSubscription();
      setCheckingSubscription(false);
      console.log('[Dashboard] Subscription check complete, subscribed:', subscribed);
    };
    checkSub();
  }, []);

  useEffect(() => {
    console.log('[Dashboard] State update - user:', !!user, 'subscribed:', subscribed, 'checking:', checkingSubscription);
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Don't check subscription status until we've done the initial check
    if (checkingSubscription) {
      return;
    }

    if (!subscribed) {
      console.log('[Dashboard] Not subscribed, redirecting to subscription page');
      toast({
        title: "Subscription Required",
        description: "Please subscribe to access your saved journals.",
        variant: "destructive",
      });
      navigate("/subscription");
      return;
    }

    console.log('[Dashboard] Subscribed! Fetching reflections...');
    fetchReflections();
  }, [user, subscribed, checkingSubscription, navigate]);

  const fetchReflections = async () => {
    try {
      const { data, error } = await supabase
        .from("reflections")
        .select("id, reflection_type, summary, created_at, completed_at")
        .eq("saved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReflections(data || []);
    } catch (error) {
      console.error("Error fetching reflections:", error);
      toast({
        title: "Error",
        description: "Failed to load your journals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading || checkingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
              Your Saved Journals
            </h1>
            <p className="text-lg text-muted-foreground">
              Reflecting on {reflections.length} {reflections.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back Home
          </Button>
        </div>

        {/* New Reflection Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => navigate("/choice")}
            className="gap-2"
            size="lg"
          >
            <BookOpen className="w-4 h-4" />
            Start New Reflection
          </Button>
        </div>

        {/* Reflections Grid */}
        {reflections.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-serif font-semibold">No saved journals yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start your first reflection to create meaningful journal entries that help you understand yourself better.
            </p>
            <Button
              onClick={() => navigate("/choice")}
              className="mt-4"
            >
              Begin Your First Reflection
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reflections.map((reflection) => (
              <Card
                key={reflection.id}
                className="p-6 space-y-4 hover:shadow-lg transition-all duration-300 border-2 cursor-pointer group"
                onClick={() => {
                  // Store the reflection summary in localStorage to view
                  localStorage.setItem('viewReflection', reflection.summary);
                  navigate('/summary');
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-serif font-semibold capitalize group-hover:text-primary transition-colors">
                      {reflection.reflection_type.replace('_', ' ')}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(reflection.created_at)}</span>
                    </div>
                  </div>
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                
                <p className="text-muted-foreground line-clamp-4 leading-relaxed">
                  {reflection.summary}
                </p>
                
                <div className="pt-2 border-t">
                  <span className="text-sm text-primary font-medium group-hover:underline">
                    Read full entry →
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
