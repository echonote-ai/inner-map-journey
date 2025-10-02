import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Sparkles } from "lucide-react";

const JournalChoice = () => {
  const navigate = useNavigate();

  const reflectionTypes = [
    {
      type: "daily",
      title: "Daily Check-in",
      description: "Take a moment to reflect on your day, emotions, and intentions",
      icon: Calendar,
    },
    {
      type: "event",
      title: "Event Reflection",
      description: "Process a specific moment, conversation, or experience",
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
            What feels right for you?
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Choose the type of reflection that fits your moment
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {reflectionTypes.map((type) => (
            <Card
              key={type.type}
              className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary group"
              onClick={() => navigate(`/reflect?type=${type.type}`)}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <type.icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif font-semibold">{type.title}</h3>
                  <p className="text-muted-foreground">{type.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JournalChoice;
