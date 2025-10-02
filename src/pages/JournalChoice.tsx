import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Wind } from "lucide-react";

const JournalChoice = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reflectionId = searchParams.get("id");

  const handleChoice = (save: boolean) => {
    navigate(`/subscription?id=${reflectionId}&save=${save}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-5xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold">
            What feels right for you?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your reflection is complete. Choose your path forward.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {/* Option 1: Save and Continue */}
          <Card 
            className="group relative overflow-hidden border-2 hover:border-primary transition-all duration-500 cursor-pointer hover:shadow-[var(--shadow-warm)] bg-gradient-to-br from-card to-accent/30"
            onClick={() => handleChoice(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative p-8 md:p-12 space-y-6 h-full flex flex-col">
              <div className="w-16 h-16 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-all duration-500 group-hover:scale-110">
                <Heart className="w-8 h-8 text-primary group-hover:animate-pulse" />
              </div>
              
              <div className="flex-1 space-y-3">
                <h2 className="text-2xl md:text-3xl font-serif font-bold">
                  Save & Discover
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Keep this journal and begin mapping your inner landscape. 
                  Each reflection becomes a stepping stone to deeper self-understanding.
                </p>
              </div>

              <Button 
                size="lg" 
                className="w-full group-hover:bg-primary group-hover:scale-105 transition-transform duration-300"
              >
                Yes, I'm ready to explore
              </Button>
            </div>
          </Card>

          {/* Option 2: Let Go */}
          <Card 
            className="group relative overflow-hidden border-2 hover:border-secondary transition-all duration-500 cursor-pointer hover:shadow-lg bg-gradient-to-br from-card to-muted/30"
            onClick={() => handleChoice(false)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative p-8 md:p-12 space-y-6 h-full flex flex-col">
              <div className="w-16 h-16 rounded-full bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center transition-all duration-500 group-hover:scale-110">
                <Wind className="w-8 h-8 text-secondary-foreground group-hover:animate-pulse" />
              </div>
              
              <div className="flex-1 space-y-3">
                <h2 className="text-2xl md:text-3xl font-serif font-bold">
                  Release & Flow
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Sometimes reflection is enough. Let these thoughts drift away, 
                  trusting the process without holding on.
                </p>
              </div>

              <Button 
                size="lg" 
                variant="outline"
                className="w-full group-hover:bg-secondary/10 group-hover:scale-105 transition-transform duration-300"
              >
                Not today, that's okay
              </Button>
            </div>
          </Card>
        </div>

        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground italic">
            Either choice honors your journey. There's no wrong answer.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JournalChoice;
