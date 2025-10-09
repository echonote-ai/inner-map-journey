import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import { Chrome, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Join() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const [isSignIn, setIsSignIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: "Authentication failed",
        description: error?.message || "Google sign-in failed",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignIn) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        // Navigation will be handled by auth state change
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Welcome to InnerMap Journey",
        });
      }
    } catch (error: any) {
      toast({
        title: isSignIn ? "Sign in failed" : "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/summary");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Card className="p-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-serif font-bold">
                Start your InnerMap journey
              </h1>
              <p className="text-muted-foreground">
                Create a free account so we can safely save your journal.
              </p>
            </div>

            <Button
              onClick={handleGoogleAuth}
              disabled={loading}
              variant="outline"
              className="w-full gap-2"
            >
              <Chrome className="w-5 h-5" />
              Continue with Google
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2"
              >
                <Mail className="w-4 h-4" />
                {loading ? "Processing..." : isSignIn ? "Sign In" : "Continue with Email"}
              </Button>
            </form>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setIsSignIn(!isSignIn)}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                {isSignIn ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
              
              <div>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
