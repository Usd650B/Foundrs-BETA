import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-background" />
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              A calm space for indie builders
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
              A gentle daily standup for
              <span className="block text-primary mt-2">focused founders</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Take a breath, set one intention, and share it with people on the same path. Light check-ins, soft nudges, 
              and a community that celebrates steady progress.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 text-lg"
                onClick={() => navigate(isLoggedIn ? "/dashboard" : "/auth")}
              >
                {isLoggedIn ? "Return to your flow" : "Begin your check-in"}
              </Button>
              {!isLoggedIn && (
                <Button
                  size="lg"
                  variant="outline"
                  className="font-semibold px-8 text-lg"
                  onClick={() => navigate("/auth")}
                >
                  Already here? Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Simple. Daily. Effective.
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
                ☀️
              </div>
              <h3 className="text-xl font-semibold text-foreground">Morning (2 min)</h3>
              <p className="text-muted-foreground">
                Post your #1 goal for today. See what other founders are tackling.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center text-3xl">
                💪
              </div>
              <h3 className="text-xl font-semibold text-foreground">During the Day</h3>
              <p className="text-muted-foreground">
                Focus on your goal. Build. Ship. No distractions.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-success/10 flex items-center justify-center text-3xl">
                ✅
              </div>
              <h3 className="text-xl font-semibold text-foreground">Evening (30 sec)</h3>
              <p className="text-muted-foreground">
                Mark it done or not done. Keep your streak alive.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why This Works */}
      <div className="bg-card border-y border-border py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
              Not Social Media. A Tool.
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg bg-background border border-border">
                <h3 className="font-semibold text-lg mb-2 text-foreground">
                  ❌ Social Media
                </h3>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li>• Infinite scroll = procrastination</li>
                  <li>• FOMO and comparison</li>
                  <li>• Algorithms and addiction</li>
                  <li>• Hours wasted daily</li>
                </ul>
              </div>

              <div className="p-6 rounded-lg bg-success/5 border border-success/20">
                <h3 className="font-semibold text-lg mb-2 text-foreground">
                  ✓ Daily Standup
                </h3>
                <ul className="space-y-2 text-foreground text-sm">
                  <li>• Fixed content (20 posts/day)</li>
                  <li>• Time-boxed (2 min total)</li>
                  <li>• No endless feed</li>
                  <li>• Pure accountability</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold text-foreground">
            Join Founders Who Ship
          </h2>
          <p className="text-xl text-muted-foreground">
            Start your first standup today. Free forever.
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 text-lg"
            onClick={() => navigate(isLoggedIn ? "/dashboard" : "/auth")}
          >
            {isLoggedIn ? "Go to Dashboard" : "Get Started"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
