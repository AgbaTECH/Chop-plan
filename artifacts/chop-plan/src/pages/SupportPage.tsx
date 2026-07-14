import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Mail, MessageCircle, FileText } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-20 max-w-5xl">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Support Center</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          We're here to help you get the most out of Chop Plan. Find answers, read guides, or get in touch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <Card className="hover-elevate transition-all border-border bg-card">
          <CardHeader>
            <LifeBuoy className="w-10 h-10 text-primary mb-4" />
            <CardTitle className="font-serif text-2xl">Help Articles</CardTitle>
            <CardDescription className="text-base">Browse our comprehensive guides and tutorials.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              <li><Link href="#" className="text-primary hover:underline">How to manage your subscriptions</Link></li>
              <li><Link href="#" className="text-primary hover:underline">Updating your payment method</Link></li>
              <li><Link href="#" className="text-primary hover:underline">Vendor payout schedule</Link></li>
              <li><Link href="#" className="text-primary hover:underline">Basic vs Premium plans: How pickup works</Link></li>
            </ul>
            <Button variant="outline" className="w-full">View all articles</Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all border-border bg-card">
          <CardHeader>
            <MessageCircle className="w-10 h-10 text-accent mb-4" />
            <CardTitle className="font-serif text-2xl">Contact Support</CardTitle>
            <CardDescription className="text-base">Can't find what you're looking for? Reach out directly.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 mb-6">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span>support@chopplan.com</span>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span>Response time: ~2 hours</span>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link href="/contact">Open a Ticket</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
