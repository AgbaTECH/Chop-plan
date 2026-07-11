import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "wouter";
import { useSubmitLead } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, Wallet, ChefHat, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";

const leadSchema = z.object({
  name: z.string().min(2, "Please enter your full name"),
  phone: z.string().min(7, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
});

type LeadFormValues = z.infer<typeof leadSchema>;

const differentiators = [
  {
    icon: CalendarCheck,
    title: "Pay Once, Eat All Week",
    description: "No more daily ordering decisions. Pick a plan and your lunch is sorted, every single day.",
  },
  {
    icon: Wallet,
    title: "Save More Than Ordering Solo",
    description: "Prepaid plans work out cheaper than one-off orders, with free bonus days built into every plan.",
  },
  {
    icon: ChefHat,
    title: "Real Vendors, Real Nigerian Food",
    description: "Every kitchen on Chop Plan is hand-vetted — from home-style Nigerian cooking to continental fusion.",
  },
  {
    icon: ShieldCheck,
    title: "Guaranteed, Trackable Pickups",
    description: "Track every meal day on your dashboard and confirm pickup — no missed meals, no guesswork.",
  },
];

export default function PromoFlyerPage() {
  const { toast } = useToast();
  const submitLead = useSubmitLead();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: "", phone: "", email: "" },
  });

  function onSubmit(data: LeadFormValues) {
    submitLead.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "You're on the list!",
          description: "A Chop Plan team member will reach out to help you pick a vendor and subscribe.",
        });
        form.reset();
      },
      onError: () => {
        toast({
          title: "Something went wrong",
          description: "Please check your details and try again.",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="flex flex-col w-full">
      {/* ── TOP: Marketing / Flyer Section ───────────────────────────── */}
      <section className="w-full py-16 md:py-24 bg-card border-b relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="container px-4 md:px-8 max-w-5xl mx-auto relative z-10 text-center">
          <img src={logo} alt="Chop Plan" className="h-16 w-16 object-contain mx-auto mb-6" />
          <p className="font-mono text-sm tracking-widest uppercase text-accent mb-4">
            The Prepaid Lunch Subscription
          </p>
          <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight text-foreground leading-tight">
            Stop Wondering <span className="text-primary italic">What's For Lunch.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Chop Plan connects you to the best local restaurants in Lagos with prepaid weekly and monthly
            meal plans — so your lunch is already sorted before your day even starts.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="h-14 px-10 text-lg font-mono">
              <a href="#subscribe-form">Get Started</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Chop Plan */}
      <section className="w-full py-16 md:py-24">
        <div className="container px-4 md:px-8 max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4">Why Chop Plan?</h2>
          <p className="text-center text-muted-foreground max-w-xl mx-auto mb-14">
            Ordering food one meal at a time is slow, unpredictable, and expensive. Here's what makes
            Chop Plan different.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {differentiators.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-border">
                <CardContent className="p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg mb-1">{title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="w-full py-16 md:py-24 bg-secondary text-secondary-foreground">
        <div className="container px-4 md:px-8 max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            Subscribe To Any Vendor. Eat All Week.
          </h2>
          <p className="text-secondary-foreground/70 max-w-2xl mx-auto mb-10">
            Every Chop Plan subscription includes daily meals from your chosen restaurant, a live pickup
            schedule you can track, and free bonus days on longer plans.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="h-14 px-8 text-lg font-mono bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/vendors">Browse Vendors</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg font-mono border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10">
              <a href="#subscribe-form">Talk To Us First</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── BOTTOM: Lead Capture Form (visually separate section) ───────── */}
      <section id="subscribe-form" className="w-full py-16 md:py-24 bg-background border-t">
        <div className="container px-4 md:px-8 max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3">Ready To Subscribe?</h2>
            <p className="text-muted-foreground">
              Leave your details and a Chop Plan team member will help you pick a vendor and get started.
            </p>
          </div>
          <Card className="border-border">
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="080 1234 5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-12 font-mono text-base" disabled={submitLead.isPending}>
                    {submitLead.isPending ? "Submitting..." : "Get Started"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
