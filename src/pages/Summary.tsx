import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Summary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [titleSource, setTitleSource] = useState<string | null>(null);
  const [reflectionId, setReflectionId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [regeneratingTitle, setRegeneratingTitle] = useState(false);

  useEffect(() => {
    const loadReflection = () => {
      // Check if viewing a saved journal
      const viewReflection = localStorage.getItem('viewReflection');
      const viewReflectionId = localStorage.getItem('viewReflectionId');
      
      if (viewReflection) {
        setSummary(viewReflection);
        setReflectionId(viewReflectionId);
        
        // Fetch title if we have reflection ID
        if (viewReflectionId) {
          (async () => {
            const { data } = await (await import("@/integrations/supabase/client")).supabase
              .from('reflections')
              .select('title, title_source')
              .eq('id', viewReflectionId)
              .single();
            
            if (data) {
              const displayTitle = data.title || 'Journal Entry';
              setTitle(displayTitle);
              setEditedTitle(displayTitle);
              setTitleSource(data.title_source || null);
            }
          })();
        }
        
        setLoading(false);
        return;
      }

      // Load messages from localStorage for new reflections
      const messagesStr = localStorage.getItem('pendingReflectionMessages');
      
      if (!messagesStr) {
        navigate("/choice");
        return;
      }

      try {
        const messages = JSON.parse(messagesStr);
        
        if (!messages || messages.length === 0) {
          navigate("/choice");
          return;
        }

        // Generate summary from messages
        const userMessages = messages
          .filter((m: any) => m.role === "user")
          .map((m: any) => m.content);

        const generatedSummary = `Today I took time to reflect on my thoughts and feelings. ${userMessages.join(" ")} 

Through this reflection, I'm recognizing patterns in how I respond to situations and what truly matters to me. It's becoming clearer that I need to honor these insights and carry them forward with intention.

This moment of pause reminded me that self-awareness is an ongoing practice, and I'm grateful for this space to process and understand myself better.`;

        setSummary(generatedSummary);
        
        // Store as pending journal and redirect to auth if not logged in
        if (!user) {
          const reflectionType = localStorage.getItem('pendingReflectionType') || 'daily';
          localStorage.setItem('pendingJournalSummary', generatedSummary);
          localStorage.setItem('pendingJournalType', reflectionType);
          setLoading(false);
          navigate("/auth");
          return;
        }
      } catch (error) {
        console.error("Error loading reflection:", error);
        toast({
          title: "Error",
          description: "Failed to load reflection",
          variant: "destructive",
        });
        navigate("/choice");
      } finally {
        setLoading(false);
      }
    };

    loadReflection();
  }, [navigate, toast, user]);

  const [saving, setSaving] = useState(false);

  const handleSaveJournal = async () => {
    // Check if user is authenticated first
    if (!user) {
      // Store pending data to complete save after signup
      localStorage.setItem("pendingSaveSummary", summary);
      const reflectionType = localStorage.getItem('pendingReflectionType') || 'daily';
      localStorage.setItem("pendingSaveReflectionType", reflectionType);
      navigate("/join");
      return;
    }

    setSaving(true);
    try {
      // 1) Check entitlement
      const { data: entitlement } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke('entitlement');

      if (!entitlement?.entitled) {
        // metric tracked in backend, show toast and redirect
        toast({
          title: "Subscription Required",
          description: "Upgrade to save your journal and access it later.",
          variant: "destructive",
        });
        navigate(`/subscription?save=true`);
        return;
      }

      // 2) Save journal
      const reflectionType = localStorage.getItem('pendingReflectionType') || 'daily';
      const { data, error } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke('save-journal', {
        body: { summary, reflection_type: reflectionType },
      });

      if (error) {
        throw error;
      }

      const savedReflection = data.reflection;
      
      toast({ 
        title: "Saved", 
        description: data.titleGenerated 
          ? "Your journal has been saved with an AI-generated title." 
          : "Your journal has been saved."
      });
      
      // Clean up local storage
      localStorage.removeItem('pendingReflectionMessages');
      localStorage.removeItem('pendingReflectionType');
      localStorage.removeItem('viewReflection');
      localStorage.removeItem('viewReflectionId');
      localStorage.removeItem('pendingSaveSummary');
      localStorage.removeItem('pendingSaveReflectionType');
      
      navigate('/dashboard');
    } catch (err) {
      console.error('Save journal error:', err);
      toast({ title: "Error", description: "Could not save journal.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleNewReflection = () => {
    localStorage.removeItem('pendingReflectionMessages');
    localStorage.removeItem('pendingReflectionType');
    localStorage.removeItem('viewReflection');
    localStorage.removeItem('viewReflectionId');
    navigate("/choice");
  };

  const handleSaveTitle = async () => {
    if (!reflectionId || !editedTitle.trim()) return;

    setSavingTitle(true);
    try {
      const { error } = await (await import("@/integrations/supabase/client")).supabase
        .from('reflections')
        .update({
          title: editedTitle.trim(),
          title_manual_override: true,
        })
        .eq('id', reflectionId);

      if (error) throw error;

      setTitle(editedTitle.trim());
      setTitleSource('manual');
      setIsEditingTitle(false);
      toast({ title: "Title updated", description: "Your journal title has been saved." });
    } catch (err) {
      console.error('Save title error:', err);
      toast({ title: "Error", description: "Could not update title.", variant: "destructive" });
    } finally {
      setSavingTitle(false);
    }
  };

  const handleRegenerateTitle = async () => {
    if (!reflectionId) return;

    setRegeneratingTitle(true);
    try {
      const { data, error } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke(
        'generate-journal-titles',
        {
          body: { 
            dryRun: false,
            reflectionId,
          },
        }
      );

      if (error) throw error;

      // Fetch updated reflection
      const { data: reflection } = await (await import("@/integrations/supabase/client")).supabase
        .from('reflections')
        .select('title, title_source')
        .eq('id', reflectionId)
        .single();

      if (reflection?.title) {
        setTitle(reflection.title);
        setEditedTitle(reflection.title);
        setTitleSource(reflection.title_source || 'ai');
        toast({ title: "Title regenerated", description: "A new title has been generated for your journal." });
      }
    } catch (err) {
      console.error('Regenerate title error:', err);
      toast({ title: "Error", description: "Could not regenerate title.", variant: "destructive" });
    } finally {
      setRegeneratingTitle(false);
    }
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
          
          {title && (
            <div className="space-y-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 justify-center">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-2xl md:text-3xl font-serif font-bold bg-background border-2 border-primary rounded-lg px-3 py-1 text-center max-w-xl"
                    maxLength={60}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveTitle}
                    disabled={savingTitle || !editedTitle.trim()}
                  >
                    {savingTitle ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingTitle(false);
                      setEditedTitle(title);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center flex-wrap">
                  <h1 
                    className="text-2xl md:text-3xl font-serif font-bold cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setIsEditingTitle(true)}
                    title="Click to edit"
                  >
                    {title}
                  </h1>
                  {titleSource === 'ai' && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      AI
                    </span>
                  )}
                </div>
              )}
              
              {!isEditingTitle && reflectionId && (
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    Edit Title
                  </Button>
                  {titleSource !== 'manual' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRegenerateTitle}
                      disabled={regeneratingTitle}
                    >
                      {regeneratingTitle ? 'Generating...' : 'Regenerate'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {!title && (
            <>
              <h1 className="text-3xl md:text-4xl font-serif font-bold">Your Journal Entry</h1>
              <p className="text-muted-foreground">Here's your reflection, captured in your own voice</p>
            </>
          )}
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
            onClick={handleSaveJournal} 
            size="lg"
            disabled={saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? 'Saving...' : 'Save Journal'}
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
