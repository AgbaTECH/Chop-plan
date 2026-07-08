import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Utensils, CheckCircle2, Clock, CreditCard, HeartHandshake } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute -left-[20%] top-20 w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
        
        <div className="container relative z-10 px-4 mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full bg-primary/10 text-primary font-medium text-sm border border-primary/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Now serving Lekki, VI, and Ikeja
          </div>
          
          <h1 className="text-5xl md:text-7xl font-serif font-black leading-tight mb-6 text-secondary">
            Never wonder what's for <span className="text-primary italic">lunch</span> again.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Prepaid lunch subscriptions from your favorite Lagos restaurants. 
            Lock in your meals, get free bonus days, and stop stressing about midday deliveries.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="rounded-full px-8 text-base h-14 w-full sm:w-auto" asChild>
              <Link href="/vendors">
                Browse Restaurants <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 text-base h-14 w-full sm:w-auto border-2 hover:bg-accent/5 hover:text-accent hover:border-accent" asChild>
              <Link href="/auth/vendor">
                I own a restaurant
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-secondary mb-4">How Chop Plan Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Three simple steps to predictable, delicious lunches every week.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-border border-dashed border-t-2 z-0" />

            {[
              {
                step: "01",
                title: "Find your spot",
                desc: "Browse vetted local restaurants in your area offering weekly or monthly meal plans.",
                icon: <Utensils className="w-6 h-6 text-primary" />
              },
              {
                step: "02",
                title: "Subscribe & Save",
                desc: "Prepay for your plan. Get guaranteed meals, fixed prices, and bonus free days.",
                icon: <CreditCard className="w-6 h-6 text-primary" />
              },
              {
                step: "03",
                title: "Eat & Enjoy",
                desc: "Show up or get it delivered. No daily payments, no deciding what to eat.",
                icon: <HeartHandshake className="w-6 h-6 text-primary" />
              }
            ].map((item, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-background border-4 border-card flex items-center justify-center shadow-xl mb-6 relative">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-accent text-accent-foreground font-mono font-bold flex items-center justify-center text-sm shadow-sm">
                    {item.step}
                  </div>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-12">
                <div className="bg-card p-6 rounded-2xl shadow-sm border border-card-border hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-bold mb-2">Verified Quality</h4>
                  <p className="text-sm text-muted-foreground">Every vendor is vetted for hygiene and taste.</p>
                </div>
                <div className="bg-card p-6 rounded-2xl shadow-sm border border-card-border hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                    <CreditCard className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="font-bold mb-2">No Hidden Fees</h4>
                  <p className="text-sm text-muted-foreground">What you see is what you pay. Period.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-card p-6 rounded-2xl shadow-sm border border-card-border hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-secondary" />
                  </div>
                  <h4 className="font-bold mb-2">Save Time</h4>
                  <p className="text-sm text-muted-foreground">Skip the 1pm hunger panic and ordering delays.</p>
                </div>
                <div className="bg-card p-6 rounded-2xl shadow-sm border border-card-border hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Utensils className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-bold mb-2">Bonus Meals</h4>
                  <p className="text-sm text-muted-foreground">Monthly plans often include free weekend meals.</p>
                </div>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-secondary mb-6 leading-tight">
                Designed for the busy Lagos professional.
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                We know how chaotic the workday gets. You shouldn't have to spend 45 minutes deciding what to eat, negotiating with delivery riders, and hoping your food arrives hot.
              </p>
              <ul className="space-y-4 mb-10">
                {["Lock in your food budget early", "Support local food businesses", "Flexible pause & resume options"].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="rounded-full px-8">
                <Link href="/vendors">Find Restaurants Near You</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-secondary text-secondary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,hsl(var(--primary)),transparent_70%)]" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-white">Ready to chop life?</h2>
          <p className="text-xl text-white/80 mb-10">
            Join thousands of professionals who have automated their lunch and taken back their midday break.
          </p>
          <Button size="lg" className="rounded-full px-10 text-lg h-14 bg-primary hover:bg-primary/90 text-primary-foreground border-none">
            <Link href="/auth/user">Get Started Now</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
