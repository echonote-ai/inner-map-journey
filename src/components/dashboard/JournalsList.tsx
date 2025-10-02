import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
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

interface Reflection {
  id: string;
  reflection_type: string;
  summary: string;
  created_at: string;
  completed_at: string | null;
}

export function JournalsList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchReflections();
  }, []);

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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("reflections")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setReflections(reflections.filter((r) => r.id !== id));
      toast({
        title: "Journal Deleted",
        description: "Your journal entry has been removed.",
      });
    } catch (error) {
      console.error("Error deleting reflection:", error);
      toast({
        title: "Error",
        description: "Failed to delete journal entry.",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
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
      <Card className="p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold">Your Journals</h2>
            <p className="text-muted-foreground">
              {reflections.length} {reflections.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
          <Button onClick={() => navigate("/choice")} className="gap-2">
            <BookOpen className="w-4 h-4" />
            New Reflection
          </Button>
        </div>

        {reflections.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground" />
            <h3 className="text-xl font-serif font-semibold">No journals yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start your first reflection to create meaningful journal entries.
            </p>
            <Button onClick={() => navigate("/choice")} className="mt-4">
              Begin Your First Reflection
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reflections.map((reflection) => (
              <Card
                key={reflection.id}
                className="p-6 space-y-4 hover:shadow-lg transition-all duration-300 border-2 group"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      localStorage.setItem('viewReflection', reflection.summary);
                      navigate('/summary');
                    }}
                  >
                    <div className="space-y-2">
                      <h3 className="text-lg font-serif font-semibold capitalize group-hover:text-primary transition-colors">
                        {reflection.reflection_type.replace('_', ' ')}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(reflection.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {reflection.summary}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(reflection.id);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your journal entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
