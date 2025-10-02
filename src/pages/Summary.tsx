import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Summary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const reflectionId = searchParams.get("id");

  useEffect(() => {
    const loadReflection = async () => {
      const reflectionId = searchParams.get("id");
      
      if (!reflectionId) {
        navigate("/start");
        return;
      }

      try {
        // Load reflection data
        const { data: reflection, error: reflectionError } = await supabase
          .from("reflections")
          .select("*")
          .eq("id", reflectionId)
          .single();

        if (reflectionError) throw reflectionError;

        // Load reflection messages
        const { data: messages, error: messagesError } = await supabase
          .from("reflection_messages")
          .select("*")
          .eq("reflection_id", reflectionId)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;

        if (!messages || messages.length === 0) {
          navigate("/start");
          return;
        }

        // Generate summary from messages
        const userMessages = messages
          .filter((m) => m.role === "user")
          .map((m) => m.content);

        const generatedSummary = `Today I took time to reflect on my thoughts and feelings. ${userMessages.join(" ")} 

Through this reflection, I'm recognizing patterns in how I respond to situations and what truly matters to me. It's becoming clearer that I need to honor these insights and carry them forward with intention.

This moment of pause reminded me that self-awareness is an ongoing practice, and I'm grateful for this space to process and understand myself better.`;

        // Save summary back to reflection
        await supabase
          .from("reflections")
          .update({ summary: generatedSummary })
          .eq("id", reflectionId);

        setSummary(generatedSummary);
      } catch (error) {
        console.error("Error loading reflection:", error);
        toast({
          title: "Error",
          description: "Failed to load reflection",
          variant: "destructive",
        });
        navigate("/start");
      } finally {
        setLoading(false);
      }
    };

    loadReflection();
  }, [navigate, searchParams, toast]);

  const handleNewReflection = () => {
    navigate("/start");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your reflection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold">Your Journal Entry</h1>
          <p className="text-muted-foreground">Here's your reflection, captured in your own voice</p>
        </div>

        <Card className="p-6 md:p-8 bg-card border-2">
          <div className="prose prose-lg max-w-none">
            <p className="text-foreground leading-relaxed whitespace-pre-line font-serif">
              {summary}
            </p>
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => navigate(`/choice?id=${reflectionId}`)} 
            size="lg"
            className="bg-primary hover:bg-primary/90"
          >
            What's Next?
          </Button>
          <Button onClick={handleNewReflection} size="lg" variant="outline">
            Start New Reflection
          </Button>
          <Button onClick={() => navigate("/")} variant="outline" size="lg">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Summary;
