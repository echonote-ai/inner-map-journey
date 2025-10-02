import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Goodbye() {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any pending reflection data on goodbye
    localStorage.removeItem('pendingReflectionMessages');
    localStorage.removeItem('pendingReflectionType');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          Until We Meet Again
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
          Thank you for sharing your journey with us. It's been a long day. 
          Please tell me all about it when I see you again.
        </p>

        <div className="pt-8">
          <Button 
            onClick={() => navigate("/")}
            size="lg"
            className="text-lg px-8"
          >
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}
