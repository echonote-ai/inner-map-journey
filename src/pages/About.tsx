import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Sparkles, Lock, Heart, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { NavBar } from "@/components/NavBar";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <NavBar showContact={false} />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-5xl md:text-6xl font-serif font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Your Inner World Mapped & Understood
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A private, simple space for busy people to pause, reflect, and rediscover their inner compass. Not advice. Not coaching. Just a mirror that helps you hear your own voice.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/choice")}>
              Start your InnerMap
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/")}>
              Learn how it works
            </Button>
          </div>
        </div>
      </section>

      {/* Short About */}
      <section className="py-16 px-6 bg-secondary/30">
        <div className="container mx-auto max-w-3xl text-center">
          <h3 className="text-3xl font-serif font-bold mb-6">What is InnerMap?</h3>
          <p className="text-lg text-muted-foreground leading-relaxed">
            InnerMap helps you slow down and find clarity through short, guided reflections and private journals. Built for parents, makers, and anyone carrying too much at once, InnerMap provides tiny exercises that help you notice what matters and reconnect with your strengths. The result: steadier days and a quieter, truer you.
          </p>
        </div>
      </section>

      {/* Founder Story */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl">
          <h3 className="text-3xl font-serif font-bold mb-8 text-center">Why We Built This</h3>
          <div className="prose prose-lg mx-auto text-muted-foreground">
            <p className="leading-relaxed text-center italic">
              I'm a mom of two who moved from architecture into software engineering — a shift that came with years of pressure, uncertainty, and low confidence. I tried therapy, coaching, books, and endless how-to videos, but none of those alone helped me find lasting clarity. Slowly I realized the answer wasn't another tool — it was listening to myself. InnerMap was born from that discovery: a small, gentle mirror that helps people stop searching outward and start finding what's already inside.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="container mx-auto max-w-5xl">
          <h3 className="text-3xl font-serif font-bold mb-12 text-center">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <p className="text-lg">Choose a reflection focus that matters today</p>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <p className="text-lg">Answer gentle, AI-guided prompts at your pace</p>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <p className="text-lg">Receive a personalized journal capturing your insights</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <h3 className="text-3xl font-serif font-bold mb-6 text-center">Our Mission</h3>
          <p className="text-xl text-muted-foreground text-center mb-12 max-w-3xl mx-auto italic">
            To give busy people a simple, reliable way to pause, reflect, and locate the inner resources they already have.
          </p>
          
          <h4 className="text-2xl font-serif font-bold mb-8 text-center">Core Values</h4>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <Sparkles className="w-10 h-10 text-primary mb-4" />
                <h5 className="text-xl font-semibold mb-2">Simplicity over complexity</h5>
                <p className="text-muted-foreground">We strip away everything that doesn't serve your reflection</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Heart className="w-10 h-10 text-primary mb-4" />
                <h5 className="text-xl font-semibold mb-2">Compassionate honesty</h5>
                <p className="text-muted-foreground">Gentle questions that help you see yourself clearly</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Lock className="w-10 h-10 text-primary mb-4" />
                <h5 className="text-xl font-semibold mb-2">Practical reflection, not performance</h5>
                <p className="text-muted-foreground">Real insights for real life, not social media moments</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="container mx-auto max-w-5xl">
          <h3 className="text-3xl font-serif font-bold mb-12 text-center">What People Say</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "I finally feel like I can hear myself think again. InnerMap gave me permission to pause without guilt."
                </p>
                <p className="font-semibold">— Sarah M.</p>
                <p className="text-sm text-muted-foreground">parent of three</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "It's like having a calm friend who asks exactly the right questions when I'm overwhelmed."
                </p>
                <p className="font-semibold">— David L.</p>
                <p className="text-sm text-muted-foreground">startup founder</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "I've tried journaling apps before, but this one actually helps me understand what's going on inside."
                </p>
                <p className="font-semibold">— Maya K.</p>
                <p className="text-sm text-muted-foreground">designer</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl">
          <h3 className="text-3xl font-serif font-bold mb-12 text-center">Common Questions</h3>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="privacy">
              <AccordionTrigger className="text-left">Is my data private?</AccordionTrigger>
              <AccordionContent>
                Completely. Your reflections are encrypted and never shared, sold, or used for training. You can delete everything anytime.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="therapy">
              <AccordionTrigger className="text-left">Is this therapy or coaching?</AccordionTrigger>
              <AccordionContent>
                No. InnerMap is a reflection tool—think of it as a structured journal with gentle prompts. It complements therapy but doesn't replace professional support.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="time">
              <AccordionTrigger className="text-left">How much time does it take?</AccordionTrigger>
              <AccordionContent>
                Most reflections take 5–15 minutes. You control the pace—pause, continue later, or dive deep when you have time.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-primary/10 to-secondary/30">
        <div className="container mx-auto max-w-3xl text-center">
          <h3 className="text-3xl font-serif font-bold mb-6">Ready to Begin?</h3>
          <p className="text-lg text-muted-foreground mb-8">
            A tiny mirror for big inner discoveries.
          </p>
          <Button size="lg" onClick={() => navigate("/choice")}>
            Start your InnerMap
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-secondary/50 text-center">
        <div className="container mx-auto">
          <p className="text-muted-foreground mb-4">
            © 2025 InnerMap. Your reflections, your clarity, your journey.
          </p>
          <div className="flex gap-6 justify-center">
            <Button variant="link" onClick={() => navigate("/")}>Home</Button>
            <Button variant="link" onClick={() => navigate("/start")}>Start</Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
