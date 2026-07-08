import { Search, Book, CreditCard, Utensils, ShieldQuestion, LifeBuoy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function Support() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      {/* Header */}
      <section className="bg-secondary text-secondary-foreground py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">How can we help?</h1>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search for answers..." 
              className="pl-12 h-14 rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50 text-lg focus-visible:ring-primary"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-16">
          {[
            { icon: <Book className="w-6 h-6" />, title: "Getting Started", desc: "How to find and subscribe to a vendor." },
            { icon: <CreditCard className="w-6 h-6" />, title: "Billing & Plans", desc: "Payments, pauses, and cancellations." },
            { icon: <Utensils className="w-6 h-6" />, title: "Orders & Delivery", desc: "Tracking your daily meals." },
            { icon: <ShieldQuestion className="w-6 h-6" />, title: "Account", desc: "Managing your profile and settings." },
            { icon: <LifeBuoy className="w-6 h-6" />, title: "Vendor Support", desc: "Guides for restaurant partners." },
          ].map((cat, i) => (
            <div key={i} className="bg-card border rounded-2xl p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                {cat.icon}
              </div>
              <h3 className="font-bold mb-2">{cat.title}</h3>
              <p className="text-sm text-muted-foreground">{cat.desc}</p>
            </div>
          ))}
        </div>

        {/* Top FAQs */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-serif font-bold mb-8 text-center text-secondary">Common Questions</h2>
          <Accordion type="single" collapsible className="w-full bg-card border rounded-2xl px-6 py-2 shadow-sm">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left font-medium">How do I change my delivery address?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                You can update your default delivery address in your Profile settings. For an active subscription, changing the address will apply to the next scheduled delivery if made before 9:00 AM.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left font-medium">What happens if a restaurant closes on a delivery day?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                If a vendor is unable to fulfill meals on a scheduled day, you will automatically be credited for that day, or your subscription will be extended by one day at no extra cost.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left font-medium">Can I switch plans mid-month?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Currently, you must wait for your active plan to expire before switching to a new plan or a different vendor. You can set the new plan to start automatically when the current one ends.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left font-medium">How do restaurant payouts work?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Vendors receive payouts weekly for all active subscriptions. The earnings dashboard shows projected vs actual payouts.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Still need help */}
      <section className="py-16 bg-accent/5 mt-auto">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
          <p className="text-muted-foreground mb-8">Can't find the answer you're looking for? Our support team is ready to assist you.</p>
          <Button size="lg" asChild className="rounded-full px-8">
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
