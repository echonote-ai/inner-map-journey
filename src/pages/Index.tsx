import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Heart, Sparkles, BookOpen, Mail } from "lucide-react";
import heroImage from "@/assets/hero-reflection.jpg";
import { NavBar } from "@/components/NavBar";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden pt-20">
        <div 
          className="absolute inset-0 z-0 opacity-30"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-tight">
            Your Inner World,
            <br />
            <span className="text-primary">Mapped & Understood</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A guided reflection space that helps you process your thoughts, gain clarity, and understand yourself better—one conversation at a time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate('/choice')}
            >
              Start Reflecting
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 bg-accent/30">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-serif font-bold">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple, guided reflection in just a few steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "Choose Your Focus",
                description: "Start with a daily check-in or reflect on a specific event that's on your mind",
              },
              {
                icon: Heart,
                title: "Guided Conversation",
                description: "Answer thoughtful, coaching-style questions that help you dig deeper and understand yourself",
              },
              {
                icon: BookOpen,
                title: "Receive Your Journal",
                description: "Get a first-person summary that captures your reflection in your own voice",
              },
            ].map((step, index) => (
              <Card 
                key={index} 
                className="p-8 text-center space-y-4 hover:shadow-lg transition-all duration-300 border-2"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-serif font-semibold">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-serif font-bold">
            Ready to understand yourself better?
          </h2>
          <p className="text-xl text-muted-foreground">
            Take just a few minutes today to reflect, process, and gain clarity.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
            onClick={() => navigate('/choice')}
          >
            Begin Your First Reflection
          </Button>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 px-4 bg-accent/30">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-serif font-bold">Get in Touch</h2>
            <p className="text-xl text-muted-foreground">
              Have questions or feedback? We'd love to hear from you.
            </p>
          </div>
          
          <Card className="p-8 space-y-6">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Mail className="w-6 h-6" />
              <span className="text-lg font-medium">support@innermap.com</span>
            </div>
            <p className="text-muted-foreground">
              We typically respond within 24 hours
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
