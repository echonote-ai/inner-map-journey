import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function UserInfoCard() {
  const { user } = useAuth();

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {user?.email ? getInitials(user.email) : <User className="w-6 h-6" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <h3 className="text-xl font-serif font-semibold">Profile</h3>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{user?.email}</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
