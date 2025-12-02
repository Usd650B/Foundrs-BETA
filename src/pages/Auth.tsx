import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in and redirect immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        navigate("/dashboard", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "Let's crush today's goal.",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              username: username || email.split("@")[0],
            },
          },
        });
        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Welcome to the community of builders.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Unable to continue",
        description: error.message || "OAuth sign-in failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.25),_transparent_55%)]" />
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_bottom,_rgba(250,204,21,0.2),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[url('https://www.toptal.com/designers/subtlepatterns/uploads/dot-grid.png')] mix-blend-soft-light" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
        <div className="relative hidden border-r border-orange-100/60 bg-gradient-to-br from-white/80 via-orange-50/80 to-amber-50/70 lg:flex">
          <div className="relative z-10 flex w-full flex-col justify-between p-12">
            <div>
              <Badge variant="secondary" className="bg-orange-100 text-[11px] uppercase tracking-[0.2em] text-orange-700">
                Foundrs Beta
              </Badge>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-orange-950">
                A calmer way for founders to stay consistent.
              </h1>
              <p className="mt-4 text-lg text-orange-900/80">
                Set one clear goal a day, meet partners shipping the same thing, and keep your streak alive without the noise.
              </p>
              <div className="mt-10 grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-orange-200/80 bg-white/80 p-5 shadow-lg shadow-orange-200/40">
                  <p className="text-3xl font-semibold text-orange-900">92%</p>
                  <p className="text-sm text-orange-900/70">ship their daily goal within the first week.</p>
                </div>
                <div className="rounded-3xl border border-orange-200/80 bg-white/80 p-5 shadow-lg shadow-orange-200/40">
                  <p className="text-3xl font-semibold text-orange-900">12k+</p>
                  <p className="text-sm text-orange-900/70">async accountability check-ins logged.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm text-orange-900/80">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Built for async accountability rituals
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                Works beautifully on mobile
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Free while in beta
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-20 -right-20 hidden aspect-square rounded-full bg-orange-200/60 blur-3xl lg:block" />
        </div>

        <div className="flex items-center justify-center px-4 py-12 sm:px-8">
          <Card className="relative w-full max-w-md border-orange-100 bg-white/90 text-orange-950 shadow-2xl shadow-orange-200/60 backdrop-blur">
            <div className="absolute inset-x-12 -top-6 h-3 rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-rose-400 opacity-80" />
            <CardHeader className="space-y-1 pt-10 text-center">
              <CardTitle className="text-2xl font-semibold text-orange-950">
                {isLogin ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription className="text-orange-900/70">
                {isLogin ? "Drop today's goal and keep the streak alive." : "Less noise, more shipping."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 border-orange-200 bg-orange-50/80 text-orange-900 hover:bg-orange-100"
                  onClick={() => handleOAuthLogin("google")}
                  disabled={loading}
                >
                  <Mail className="h-4 w-4" />
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 border-orange-200 bg-orange-50/80 text-orange-900 hover:bg-orange-100"
                  onClick={() => handleOAuthLogin("github")}
                  disabled={loading}
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.25em] text-orange-400">Access type</p>
                <div className="grid grid-cols-2 gap-2 rounded-full bg-orange-100/70 p-1">
                  <button
                    type="button"
                    className={cn(
                      "rounded-full py-2 text-sm font-medium transition",
                      isLogin ? "bg-white text-orange-900 shadow" : "text-orange-500"
                    )}
                    onClick={() => setIsLogin(true)}
                    disabled={loading}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-full py-2 text-sm font-medium transition",
                      !isLogin ? "bg-white text-orange-900 shadow" : "text-orange-500"
                    )}
                    onClick={() => setIsLogin(false)}
                    disabled={loading}
                  >
                    Join beta
                  </button>
                </div>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-orange-900/80">Username</Label>
                    <Input
                      id="username"
                      placeholder="your_handle"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                      className="border-orange-200 bg-orange-50/80 text-orange-900 placeholder:text-orange-400"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-orange-900/80">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="founder@startup.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="border-orange-200 bg-orange-50/80 text-orange-900 placeholder:text-orange-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-orange-900/80">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="border-orange-200 bg-orange-50/80 text-orange-900 placeholder:text-orange-400"
                  />
                  {!isLogin && (
                    <p className="text-xs text-orange-500">Minimum 6 characters. You can update it later inside settings.</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-400 text-white shadow-lg shadow-orange-300/40 transition hover:shadow-orange-300/70"
                  disabled={loading}
                >
                  {loading ? "One sec..." : isLogin ? "Sign In" : "Request Invite"}
                </Button>
              </form>
              <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4 text-xs text-orange-900/80">
                <p className="font-medium text-orange-900">Why we vet signups</p>
                <p className="mt-1 text-orange-900/70">
                  Every member ships daily. We review new accounts to keep the bar high and the feed focused.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Auth;
