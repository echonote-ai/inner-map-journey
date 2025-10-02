import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SubscriptionDetails {
  subscribed: boolean;
  subscription_end: string | null;
  subscription_status: string | null;
  plan_name: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  subscribed: boolean;
  subscriptionDetails: SubscriptionDetails | null;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkSubscription = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setSubscribed(false);
        setSubscriptionDetails(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setSubscribed(false);
        setSubscriptionDetails(null);
        return;
      }

      console.log('Subscription check result:', data);
      setSubscribed(data?.subscribed || false);
      setSubscriptionDetails(data || null);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscribed(false);
      setSubscriptionDetails(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check subscription status after auth state changes
        if (session) {
          setTimeout(() => {
            checkSubscription();
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check subscription on initial load
      if (session) {
        setTimeout(() => {
          checkSubscription();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    // Save life_stage to profile if it exists
    if (!error && data.user) {
      const lifeStage = sessionStorage.getItem("life_stage");
      if (lifeStage) {
        await supabase
          .from("profiles")
          .update({ life_stage: lifeStage })
          .eq("id", data.user.id);
        sessionStorage.removeItem("life_stage");
      }
    }
    
    return { error };
  };

  const signIn = async (emailOrUsername: string, password: string) => {
    let email = emailOrUsername.trim();
    
    // Check if input is a username (doesn't contain @)
    if (!email.includes('@')) {
      // Look up email from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", email)
        .single();
      
      if (!profile?.email) {
        return { error: { message: "Username not found" } };
      }
      
      email = profile.email;
    }
    
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Save life_stage to profile if it exists and profile doesn't have one yet
    if (!error && data.user) {
      const lifeStage = sessionStorage.getItem("life_stage");
      if (lifeStage) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("life_stage")
          .eq("id", data.user.id)
          .single();
        
        if (!profile?.life_stage) {
          await supabase
            .from("profiles")
            .update({ life_stage: lifeStage })
            .eq("id", data.user.id);
        }
        sessionStorage.removeItem("life_stage");
      }
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    setUser(null);
    setSession(null);
    setSubscribed(false);
    setSubscriptionDetails(null);
    navigate("/goodbye");
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, subscribed, subscriptionDetails, checkSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
