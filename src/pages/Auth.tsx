import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const authSchema = z.object({
  emailOrUsername: z.string().trim().min(1, { message: "Email or username is required" }).max(255, { message: "Input must be less than 255 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100, { message: "Password must be less than 100 characters" })
});

export default function Auth() {
  const [showChoice, setShowChoice] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Check if there's a pending reflection
      const hasPendingReflection = localStorage.getItem('pendingReflectionMessages');
      if (hasPendingReflection) {
        navigate("/subscription");
      } else {
        navigate("/choice");
      }
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    const { error } = await signUp(email.trim(), password);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Account created! You can now sign in.",
      });
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = authSchema.safeParse({ emailOrUsername: email, password });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    const { error } = await signIn(email.trim(), password);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Signed in successfully!",
      });
      // Check if there's a pending reflection
      const hasPendingReflection = localStorage.getItem('pendingReflectionMessages');
      if (hasPendingReflection) {
        navigate("/subscription");
      } else {
        navigate("/choice");
      }
    }

    setLoading(false);
  };

  if (showChoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center text-lg pt-2">
              Would you like to tell me a little bit about yourself?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate("/life-stage")}
              className="w-full h-auto py-6"
              size="lg"
            >
              <div className="text-center">
                <div className="font-semibold text-lg">Sure, let's connect</div>
                <div className="text-sm opacity-90 mt-1">I'm new here</div>
              </div>
            </Button>
            <Button 
              onClick={() => setShowChoice(false)}
              variant="outline"
              className="w-full h-auto py-6"
              size="lg"
            >
              <div className="text-center">
                <div className="font-semibold text-lg">We already met</div>
                <div className="text-sm opacity-90 mt-1">Sign in to continue</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to continue your journey</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email or Username</Label>
              <Input
                id="signin-email"
                type="text"
                placeholder="you@example.com or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <Button 
              type="button"
              variant="ghost" 
              className="w-full"
              onClick={() => setShowChoice(true)}
            >
              Back to options
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
