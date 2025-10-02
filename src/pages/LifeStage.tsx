import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

const LifeStage = () => {
  const navigate = useNavigate();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const stages = [
    {
      label: "Curious & Adventurous",
      sublabel: "(often 20s)",
      value: "20s",
    },
    {
      label: "Balancing Growth & Responsibility",
      sublabel: "(often 30s)",
      value: "30s",
    },
    {
      label: "Clarifying Goals & Direction",
      sublabel: "(often 40s)",
      value: "40s",
    },
    {
      label: "Seeking Richness & New Experiences",
      sublabel: "(often 50s+)",
      value: "50s+",
    },
    {
      label: "Something Else / Prefer Not to Say",
      sublabel: "",
      value: "other",
    },
  ];

  const handleContinue = () => {
    if (selectedStage) {
      sessionStorage.setItem("life_stage", selectedStage);
    }
    navigate("/auth");
  };

  const handleSkip = () => {
    sessionStorage.removeItem("life_stage");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-3xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold">
            Which stage resonates with you right now?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everyone's path is unique. Choose the one that feels closest — or skip if you'd like.
          </p>
        </div>

        <div className="space-y-3">
          {stages.map((stage) => (
            <Card
              key={stage.value}
              className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedStage === stage.value
                  ? "border-2 border-primary bg-primary/5"
                  : "border-2 border-transparent hover:border-primary/50"
              }`}
              onClick={() => setSelectedStage(stage.value)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedStage === stage.value
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}
                >
                  {selectedStage === stage.value && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">
                    {stage.label}{" "}
                    {stage.sublabel && (
                      <span className="text-muted-foreground font-normal">
                        {stage.sublabel}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 pt-4">
          <Button
            size="lg"
            className="text-lg px-8 py-6 w-full max-w-xs"
            onClick={handleContinue}
            disabled={!selectedStage}
          >
            Continue
          </Button>
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default LifeStage;
