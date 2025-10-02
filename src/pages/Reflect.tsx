import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const reflectionInputSchema = z.object({
  content: z.string().trim().min(1, { message: "Message cannot be empty" }).max(5000, { message: "Message must be less than 5000 characters" })
});

const Reflect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reflectionId, setReflectionId] = useState<string | null>(null);

  const reflectionType = searchParams.get("type") || "daily";

  useEffect(() => {
    // Create reflection session when component mounts
    const createReflection = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("reflections")
        .insert({
          user_id: user.id,
          reflection_type: reflectionType,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating reflection:", error);
        toast({
          title: "Error",
          description: "Failed to create reflection session",
          variant: "destructive",
        });
        return;
      }

      setReflectionId(data.id);
    };

    createReflection();
  }, [user, reflectionType, toast]);

  const startReflection = () => {
    const initialPrompt = reflectionType === "daily"
      ? "Tell me, how are you feeling right now in this moment?"
      : "What happened that you'd like to reflect on?";
    
    setMessages([{ role: "assistant", content: initialPrompt }]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !reflectionId) return;

    // Validate input
    const validation = reflectionInputSchema.safeParse({ content: input });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }

    const userMessage = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMessage];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    // Save user message to database
    await supabase.from("reflection_messages").insert({
      reflection_id: reflectionId,
      role: "user",
      content: input.trim(),
    });

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reflection-chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          messages: allMessages,
          reflectionType 
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast({
            title: "Rate limit reached",
            description: "Please try again in a moment",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to start stream");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* ignore partial leftovers */ }
        }
      }

      // Save assistant message to database
      if (assistantContent && reflectionId) {
        await supabase.from("reflection_messages").insert({
          reflection_id: reflectionId,
          role: "assistant",
          content: assistantContent,
        });
      }
    } catch (error) {
      console.error("Error in reflection chat:", error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (messages.length < 4) {
      toast({
        title: "Continue reflecting",
        description: "Share a bit more before we create your summary",
      });
      return;
    }

    if (!reflectionId) return;

    // Mark reflection as complete
    await supabase
      .from("reflections")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", reflectionId);
    
    navigate(`/summary?id=${reflectionId}`);
  };

  if (messages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-semibold">Ready to reflect?</h2>
            <p className="text-muted-foreground">
              I'll guide you through some thoughtful questions to help you process your {reflectionType === "daily" ? "day" : "experience"}.
            </p>
          </div>
          <Button onClick={startReflection} size="lg" className="w-full">
            Begin Reflection
          </Button>
          <Button variant="ghost" onClick={() => navigate("/start")}>
            Choose different type
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-3xl mx-auto w-full p-4 space-y-4 py-8">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-500`}
          >
            <Card
              className={`max-w-[80%] p-4 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card"
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
            </Card>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-4 bg-card">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </Card>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-background/80 backdrop-blur-lg border-t">
        <div className="max-w-3xl mx-auto p-4 space-y-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Share your thoughts..."
            className="min-h-[80px] resize-none"
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="flex-1"
            >
              Send
            </Button>
            <Button
              onClick={handleComplete}
              variant="secondary"
              disabled={isLoading}
            >
              I'm done reflecting
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reflect;
