import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";

interface NavBarProps {
  showAbout?: boolean;
  showPricing?: boolean;
  showContact?: boolean;
}

export const NavBar = ({ showAbout = true, showPricing = true, showContact = true }: NavBarProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleContactClick = () => {
    const contactElement = document.getElementById('contact');
    if (contactElement) {
      contactElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/#contact');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <h2 
          className="text-2xl font-serif font-bold text-primary cursor-pointer" 
          onClick={() => navigate('/')}
        >
          Inner Map™
        </h2>
        
        <nav className="flex items-center gap-6">
          {showAbout && (
            <Button
              variant="ghost"
              onClick={() => navigate('/about')}
            >
              About
            </Button>
          )}
          {showPricing && (
            <Button
              variant="ghost"
              onClick={() => navigate('/subscription')}
            >
              Pricing
            </Button>
          )}
          {showContact && (
            <Button
              variant="ghost"
              onClick={handleContactClick}
            >
              Contact
            </Button>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2">
                  My Account
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background">
                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate('/auth')}>
              Log In
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
