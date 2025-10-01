import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Reflect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const reflectionType = searchParams.get("type") || "daily";

  const startReflection = () => {
    const initialPrompt = reflectionType === "daily"
      ? "Tell me, how are you feeling right now in this moment?"
      : "What happened that you'd like to reflect on?";
    
    setMessages([{ role: "assistant", content: initialPrompt }]);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response for MVP
    setTimeout(() => {
      const responses = [
        "That's really interesting. Can you tell me more about what made you feel that way?",
        "I hear you. What do you think that reveals about what matters to you?",
        "Thank you for sharing that. How does this connect to other areas of your life?",
        "That makes sense. What would you like to take away from this experience?",
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [...prev, { role: "assistant", content: randomResponse }]);
      setIsLoading(false);
    }, 1000);
  };

  const handleComplete = () => {
    if (messages.length < 4) {
      toast({
        title: "Continue reflecting",
        description: "Share a bit more before we create your summary",
      });
      return;
    }
    
    // Store messages in session storage for summary page
    sessionStorage.setItem("reflectionMessages", JSON.stringify(messages));
    navigate("/summary");
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
