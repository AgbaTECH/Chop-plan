import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, role } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (role === "vendor") setLocation("/vendor/dashboard");
    else if (role === "admin") setLocation("/admin/dashboard");
    else setLocation("/vendors");
  }, [isAuthenticated, role, setLocation]);

  if (isAuthenticated) return null;

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="w-full py-20 md:py-32 lg:py-48 bg-card border-b relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="container px-4 md:px-8 max-w-6xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
            The prepaid lunch subscription for <span className="text-primary italic">every</span> food lover.
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Discover the best local restaurants. Subscribe to a weekly meal plan. Never wonder what's for lunch again.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="h-14 px-8 text-lg font-mono">
              <Link href="/vendors">Find Restaurants</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg font-mono bg-background">
              <Link href="/auth/vendor">Partner With Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="w-full py-20 md:py-32">
        <div className="container px-4 md:px-8 max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-center mb-16">How Chop Plan Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 text-primary flex items-center justify-center text-3xl font-bold font-mono mb-6">1</div>
              <h3 className="text-2xl font-serif font-bold mb-4">Choose a Restaurant</h3>
              <p className="text-muted-foreground">Browse curated vendors in your area, offering diverse cuisines from local bukka to gourmet meals.</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-accent/20 text-accent flex items-center justify-center text-3xl font-bold font-mono mb-6">2</div>
              <h3 className="text-2xl font-serif font-bold mb-4">Pick a Plan</h3>
              <p className="text-muted-foreground">Select a weekly or monthly subscription that fits your schedule and budget. Pay once, eat all week.</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-3xl font-bold font-mono mb-6">3</div>
              <h3 className="text-2xl font-serif font-bold mb-4">Enjoy Your Meals</h3>
              <p className="text-muted-foreground">Pick up your lunch or have it delivered daily. Focus on your work, we've got the food sorted.</p>
            </div>
          </div>
        </div>
      </section>

      {/* For Vendors */}
      <section className="w-full py-24 bg-secondary text-secondary-foreground">
        <div className="container px-4 md:px-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6">Are you a restaurant owner?</h2>
            <p className="text-xl text-secondary-foreground/80 mb-8 leading-relaxed">
              Guarantee your revenue with prepaid subscriptions. Build a loyal customer base and streamline your kitchen operations with predictable daily orders.
            </p>
            <ul className="space-y-4 mb-10 text-lg">
              <li className="flex items-center gap-3">
                <span className="text-primary font-bold">✓</span> No upfront cost to get started
              </li>
              <li className="flex items-center gap-3">
                <span className="text-primary font-bold">✓</span> Guaranteed repeat customers through prepaid plans
              </li>
              <li className="flex items-center gap-3">
                <span className="text-primary font-bold">✓</span> Built-in exposure to office workers looking for lunch
              </li>
              <li className="flex items-center gap-3">
                <span className="text-primary font-bold">✓</span> Predictable, recurring revenue every month
              </li>
            </ul>
            <Button asChild size="lg" className="h-14 px-8 text-lg font-mono bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/auth/vendor">Start Selling Subscriptions</Link>
            </Button>
          </div>
          <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden bg-card/10 border border-secondary-border">
            {/* Abstract decorative element representing food/plates */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 rounded-full border-4 border-primary/40 absolute"></div>
              <div className="w-48 h-48 rounded-full border-4 border-accent/40 absolute -translate-x-12 translate-y-8"></div>
              <div className="w-32 h-32 rounded-full border-4 border-muted/40 absolute translate-x-16 -translate-y-12"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
