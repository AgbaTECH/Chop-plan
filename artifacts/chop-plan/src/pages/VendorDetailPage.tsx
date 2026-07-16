import { useParams, Link, useLocation } from "wouter";
import { useGetVendor, useCheckoutSubscription, useCheckoutAlacarte, getGetVendorQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Utensils, Star, ArrowLeft, Calendar, Info, Crown, ShoppingBag } from "lucide-react";
import { FallbackImage } from "@/components/FallbackImage";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, ReactNode } from "react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type SelectablePlan = { id: number; name: string; priceNaira: number; daysPerMonth: number; freeDays: number };

export default function VendorDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { isAuthenticated, role } = useAuth();
  const { toast } = useToast();
  
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alacarteMealId, setAlacarteMealId] = useState<number | null>(null);
  const [isBuyingAlacarte, setIsBuyingAlacarte] = useState(false);

  const { data: vendor, isLoading, error } = useGetVendor(id, {
    query: { enabled: !isNaN(id), queryKey: getGetVendorQueryKey(id) }
  });

  const checkoutSubscription = useCheckoutSubscription();
  const checkoutAlacarte = useCheckoutAlacarte();

  const handleBuyAlacarte = () => {
    if (!isAuthenticated) {
      setLocation("/auth/user");
      return;
    }
    if (role === "vendor") {
      toast({
        title: "Not allowed",
        description: "Vendors cannot place orders. Please use a user account.",
        variant: "destructive"
      });
      return;
    }
    if (!alacarteMealId) return;

    setIsBuyingAlacarte(true);
    const callbackUrl = `${window.location.origin}${import.meta.env.BASE_URL}checkout/callback`;
    checkoutAlacarte.mutate({ data: { vendorId: id, mealId: alacarteMealId, callbackUrl } }, {
      onSuccess: (data) => {
        window.location.href = data.authorizationUrl;
      },
      onError: (err: any) => {
        toast({
          title: "Could not start checkout",
          description: err?.data?.error || "Please try again later.",
          variant: "destructive"
        });
        setIsBuyingAlacarte(false);
      }
    });
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      setLocation("/auth/user");
      return;
    }
    
    if (role === "vendor") {
      toast({
        title: "Not allowed",
        description: "Vendors cannot subscribe to other vendors. Please use a user account.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedPlanId) return;

    setIsSubmitting(true);
    const callbackUrl = `${window.location.origin}${import.meta.env.BASE_URL}checkout/callback`;
    checkoutSubscription.mutate({ data: { vendorId: id, planId: selectedPlanId, callbackUrl } }, {
      onSuccess: (data) => {
        // Redirect to Paystack's hosted checkout page to complete payment.
        window.location.href = data.authorizationUrl;
      },
      onError: (err: any) => {
        toast({
          title: "Could not start checkout",
          description: err?.data?.error || "Please try again later.",
          variant: "destructive"
        });
        setIsSubmitting(false);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <Skeleton className="h-64 md:h-80 w-full rounded-2xl mb-8" />
        <div className="flex gap-12">
          <div className="flex-1">
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/3 mb-8" />
            <Skeleton className="h-32 w-full mb-12" />
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
          <div className="w-80 hidden lg:block">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="container mx-auto px-4 py-40 max-w-3xl text-center">
        <h1 className="text-4xl font-serif font-bold mb-4">Restaurant not found</h1>
        <p className="text-muted-foreground mb-8">This restaurant may have been removed or is temporarily unavailable.</p>
        <Button asChild className="font-mono">
          <Link href="/vendors">Back to Restaurants</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Hero Header */}
      <div className="w-full bg-card border-b border-border">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <Button asChild variant="ghost" className="mb-6 -ml-4 text-muted-foreground hover:text-foreground">
            <Link href="/vendors" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Restaurants</span>
            </Link>
          </Button>

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            {vendor.coverImage ? (
              <div className="w-full md:w-64 h-64 md:h-48 rounded-xl overflow-hidden shrink-0 shadow-md">
                <FallbackImage src={vendor.coverImage ?? undefined} alt={vendor.businessName} fallback="vendor" className="w-full h-full object-cover" loading="eager" decoding="async" />
              </div>
            ) : (
              <div className="w-full md:w-64 h-64 md:h-48 rounded-xl bg-secondary/5 border border-dashed flex flex-col items-center justify-center text-muted-foreground shrink-0">
                <Utensils className="w-12 h-12 mb-2 opacity-20" />
                <span className="text-sm font-mono opacity-50">No Cover Image</span>
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="font-mono text-xs uppercase bg-background">{vendor.cuisineType}</Badge>
                {vendor.rating && (
                  <span className="flex items-center gap-1 text-sm font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                    <Star className="w-3.5 h-3.5 fill-primary" /> {vendor.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{vendor.businessName}</h1>
              <p className="text-lg text-muted-foreground flex items-center gap-2 mb-6">
                <MapPin className="w-5 h-5 text-primary" /> {vendor.area}
              </p>
              <p className="text-foreground/80 leading-relaxed max-w-3xl">
                {vendor.description || "Enjoy delicious daily meals prepared fresh by our expert kitchen staff. Subscribe to our weekly or monthly plans to secure your lunch."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Main Content: Meals */}
          <div className="flex-1">
            {vendor.kitchenPhotos && vendor.kitchenPhotos.length > 0 && (
              <div className="mb-12">
                <h2 className="text-3xl font-serif font-bold mb-6 flex items-center gap-3">
                  <Utensils className="w-7 h-7 text-primary" />
                  Inside the Kitchen
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {vendor.kitchenPhotos.map((photo, i) => (
                    <div key={`${photo}-${i}`} className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                      <FallbackImage src={photo} alt={`${vendor.businessName} kitchen photo ${i + 1}`} fallback="photo" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-3xl font-serif font-bold mb-8 flex items-center gap-3">
              <Utensils className="w-7 h-7 text-primary" />
              Sample Meals
            </h2>
            
            {vendor.meals && vendor.meals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {vendor.meals.map((meal) => (
                  <Card key={meal.id} className="overflow-hidden border-border shadow-sm flex flex-col">
                    <div className="w-full h-40 overflow-hidden bg-muted">
                      <FallbackImage src={meal.imageUrl ?? undefined} alt={meal.name} fallback="meal" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl font-serif">{meal.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-muted-foreground text-sm leading-relaxed mb-3">{meal.description}</p>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Dialog open={alacarteMealId === meal.id} onOpenChange={(open) => setAlacarteMealId(open ? meal.id : null)}>
                        <DialogTrigger asChild>
                          {meal.available ? (
                            <Button variant="outline" size="sm" className="w-full font-mono gap-2" data-testid={`button-buy-alacarte-${meal.id}`}>
                              <ShoppingBag className="w-4 h-4" /> Buy today · ₦{meal.offSchedulePriceNaira.toLocaleString('en-NG')}
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="w-full font-mono" disabled>Currently unavailable</Button>
                          )}
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-serif text-2xl">Buy Off-Schedule</DialogTitle>
                            <DialogDescription className="text-base mt-2">
                              A one-off purchase of <strong>{meal.name}</strong> from <strong>{vendor.businessName}</strong> — no subscription required.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="bg-muted p-4 rounded-lg my-4 space-y-3 font-mono text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subscription-day price</span>
                              <span className="line-through opacity-60">₦{meal.priceNaira.toLocaleString('en-NG')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Off-schedule price</span>
                              <span className="font-bold text-primary">₦{meal.offSchedulePriceNaira.toLocaleString('en-NG')}</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-sans pt-1">
                              À la carte meals cost more than the same meal on a subscription day — subscribing is still the better deal.
                            </p>
                          </div>
                          {!isAuthenticated && (
                            <div className="flex items-center gap-2 p-3 bg-accent/10 text-accent rounded-md text-sm mb-4">
                              <Info className="w-4 h-4 shrink-0" />
                              <p>You need to sign in as a user to order.</p>
                            </div>
                          )}
                          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                            <Button variant="outline" className="w-full font-mono" onClick={() => setAlacarteMealId(null)}>Cancel</Button>
                            {isAuthenticated ? (
                              <Button
                                className="w-full font-mono"
                                onClick={handleBuyAlacarte}
                                disabled={isBuyingAlacarte}
                                data-testid="button-confirm-alacarte"
                              >
                                {isBuyingAlacarte ? "Redirecting to payment..." : "Proceed to Payment"}
                              </Button>
                            ) : (
                              <Button asChild className="w-full font-mono">
                                <Link href="/auth/user">Sign In to Continue</Link>
                              </Button>
                            )}
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed rounded-xl bg-card">
                <p className="text-muted-foreground italic">No sample meals listed yet. Expect a delicious variety of {vendor.cuisineType} dishes!</p>
              </div>
            )}
          </div>

          {/* Sidebar: Subscription Plans */}
          <div className="w-full lg:w-96 shrink-0">
            <div className="sticky top-24">
              <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />
                Subscription Plans
              </h2>
              
              {vendor.plans?.basic || vendor.plans?.premium ? (
                <div className="space-y-4">
                  {vendor.plans.basic && (
                    <PlanCard
                      plan={{ id: vendor.plans.basic.id, name: "Basic", priceNaira: vendor.plans.basic.priceNaira, daysPerMonth: vendor.plans.basic.daysPerMonth, freeDays: vendor.plans.basic.freeDays }}
                      vendorName={vendor.businessName}
                      isAuthenticated={isAuthenticated}
                      isSelected={selectedPlanId === vendor.plans.basic.id}
                      isSubmitting={isSubmitting}
                      onSelect={setSelectedPlanId}
                      onConfirm={handleSubscribe}
                    >
                      <div className="space-y-1 border-t border-border pt-3">
                        {vendor.plans.basic.blurb && (
                          <p className="text-sm text-muted-foreground italic mb-2">"{vendor.plans.basic.blurb}"</p>
                        )}
                        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-1.5">Every pickup day</p>
                        <p className="text-sm">{vendor.plans.basic.meal.name}</p>
                      </div>
                    </PlanCard>
                  )}
                  {vendor.plans.premium && (
                    <PlanCard
                      plan={{ id: vendor.plans.premium.id, name: "Premium", priceNaira: vendor.plans.premium.priceNaira, daysPerMonth: vendor.plans.premium.daysPerMonth, freeDays: vendor.plans.premium.freeDays }}
                      vendorName={vendor.businessName}
                      isAuthenticated={isAuthenticated}
                      isSelected={selectedPlanId === vendor.plans.premium.id}
                      isSubmitting={isSubmitting}
                      onSelect={setSelectedPlanId}
                      onConfirm={handleSubscribe}
                      badge={<Badge className="gap-1"><Crown className="w-3 h-3" /> Premium</Badge>}
                    >
                      <div className="space-y-1 border-t border-border pt-3">
                        {vendor.plans.premium.blurb && (
                          <p className="text-sm text-muted-foreground italic mb-2">"{vendor.plans.premium.blurb}"</p>
                        )}
                        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-1.5">Weekly timetable</p>
                        <ul className="space-y-1">
                          {vendor.plans.premium.rotation.map((r) => (
                            <li key={r.dayOfWeek} className="text-sm flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{DAY_NAMES[r.dayOfWeek]}: {r.meal.name}</span>
                            </li>
                          ))}
                          <li className="text-sm flex items-start gap-1.5">
                            <span className="text-accent mt-0.5">•</span>
                            <span>{DAY_NAMES[vendor.plans.premium.freeDay.dayOfWeek]} (free): {vendor.plans.premium.freeDay.meal.name}</span>
                          </li>
                        </ul>
                      </div>
                    </PlanCard>
                  )}
                </div>
              ) : (
                <Card className="border-dashed bg-card/50">
                  <CardContent className="p-8 text-center text-muted-foreground italic">
                    This vendor hasn't set up any active plans yet.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  vendorName,
  isAuthenticated,
  isSelected,
  isSubmitting,
  onSelect,
  onConfirm,
  badge,
  children,
}: {
  plan: SelectablePlan;
  vendorName: string;
  isAuthenticated: boolean;
  isSelected: boolean;
  isSubmitting: boolean;
  onSelect: (id: number | null) => void;
  onConfirm: () => void;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="border-2 transition-all hover:border-primary/50">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="font-serif text-xl">{plan.name}</CardTitle>
          {badge ?? <Badge variant="secondary">{plan.daysPerMonth} days/mo</Badge>}
        </div>
        <div className="font-mono text-2xl font-bold text-primary">
          ₦{plan.priceNaira.toLocaleString('en-NG')}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-sm text-muted-foreground mb-3">
          {plan.freeDays} free days included · Pickup only
        </p>
        {children}
      </CardContent>
      <CardFooter>
        <Dialog open={isSelected} onOpenChange={(open) => onSelect(open ? plan.id : null)}>
          <DialogTrigger asChild>
            <Button
              className="w-full font-mono"
              onClick={() => onSelect(plan.id)}
              data-testid={`button-subscribe-plan-${plan.id}`}
            >
              Subscribe
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Confirm Subscription</DialogTitle>
              <DialogDescription className="text-base mt-2">
                You are about to subscribe to the <strong>{plan.name}</strong> plan from <strong>{vendorName}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted p-4 rounded-lg my-4 space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-bold">₦{plan.priceNaira.toLocaleString('en-NG')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days per month</span>
                <span>{plan.daysPerMonth} ({plan.freeDays} free)</span>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="flex items-center gap-2 p-3 bg-accent/10 text-accent rounded-md text-sm mb-4">
                <Info className="w-4 h-4 shrink-0" />
                <p>You need to sign in as a user to subscribe.</p>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
              <Button variant="outline" className="w-full font-mono" onClick={() => onSelect(null)}>Cancel</Button>
              {isAuthenticated ? (
                <Button
                  className="w-full font-mono"
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  data-testid="button-confirm-subscription"
                >
                  {isSubmitting ? "Redirecting to payment..." : "Proceed to Payment"}
                </Button>
              ) : (
                <Button asChild className="w-full font-mono">
                  <Link href="/auth/user">Sign In to Continue</Link>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
