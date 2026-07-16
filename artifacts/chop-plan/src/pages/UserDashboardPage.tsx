import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { 
  useListUserSubscriptions, 
  useCancelSubscription, 
  useGetMe,
  useUpdateUserProfile,
  useGetUserSubscriptionSchedule,
  useConfirmPickup,
  useListAlacarteOrders,
  useConfirmAlacartePickup,
  getGetUserSubscriptionScheduleQueryKey,
  getListUserSubscriptionsQueryKey,
  getListAlacarteOrdersQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NotificationHistory } from "@/components/OrderNotifications";
import { Calendar, User, Clock, Utensils, AlertTriangle, CalendarCheck, Check, ShoppingBag } from "lucide-react";

function SubscriptionScheduleDialog({ subscriptionId, open, onOpenChange }: { subscriptionId: number | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: days, isLoading } = useGetUserSubscriptionSchedule(subscriptionId ?? 0, {
    query: { enabled: !!subscriptionId && open, queryKey: getGetUserSubscriptionScheduleQueryKey(subscriptionId ?? 0) },
  });
  const confirmPickup = useConfirmPickup();
  const todayStr = new Date().toISOString().split("T")[0];

  const handleConfirm = (dayId: number) => {
    if (!subscriptionId) return;
    confirmPickup.mutate({ subscriptionId, dayId }, {
      onSuccess: () => toast({ title: "Pickup confirmed" }),
      onError: (err: any) => toast({ title: "Could not confirm", description: err?.data?.error, variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Pickup Schedule</DialogTitle>
          <DialogDescription>Confirm each day once you've received your meal.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="space-y-1">
            {days?.map((day) => {
              const dateStr = new Date(day.scheduledDate).toISOString().split("T")[0];
              const canConfirm = day.status === "pending" && dateStr <= todayStr;
              return (
                <div key={day.id} className="py-2 border-b last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono">
                      Day {day.dayNumber} &middot; {new Date(day.scheduledDate).toLocaleDateString()}
                      {day.mealName && <> &middot; {day.mealName}</>}
                      {day.isFreeDay && <> &middot; <span className="text-accent">Free day</span></>}
                    </span>
                    {day.status === "confirmed" ? (
                      <Badge className="font-mono uppercase text-[10px] gap-1"><Check className="w-3 h-3" /> Confirmed</Badge>
                    ) : canConfirm ? (
                      <Button size="sm" variant="outline" className="font-mono" onClick={() => handleConfirm(day.id)} disabled={confirmPickup.isPending}>
                        Confirm Received
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="font-mono uppercase text-[10px]">Upcoming</Badge>
                    )}
                  </div>
                  <NotificationHistory orderRef={{ orderType: "subscription", subscriptionDayId: day.id }} viewer="user" />
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function UserDashboardPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, role, name, login } = useAuth();
  const { toast } = useToast();
  
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  // Redirect if not a signed-in customer
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth/user");
    } else if (role === "vendor") {
      setLocation("/vendor/dashboard");
    } else if (role === "admin") {
      setLocation("/admin/dashboard");
    }
  }, [isAuthenticated, role, setLocation]);

  const { data: profile, isLoading: profileLoading } = useGetMe();
  // Poll so subscription/order status (pickup confirmations, vendor
  // notifications) updates automatically without a manual page reload.
  const { data: subscriptions, isLoading: subsLoading } = useListUserSubscriptions({
    query: { refetchInterval: 15000, queryKey: getListUserSubscriptionsQueryKey() },
  });
  const { data: alacarteOrders, isLoading: alacarteLoading } = useListAlacarteOrders({
    query: { refetchInterval: 15000, queryKey: getListAlacarteOrdersQueryKey() },
  });
  const updateProfile = useUpdateUserProfile();
  const cancelSub = useCancelSubscription();
  const confirmAlacarte = useConfirmAlacartePickup();
  const [scheduleSubId, setScheduleSubId] = useState<number | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const handleConfirmAlacarte = (paymentId: number) => {
    confirmAlacarte.mutate({ paymentId }, {
      onSuccess: () => toast({ title: "Order confirmed" }),
      onError: (err: any) => toast({ title: "Could not confirm", description: err?.data?.error, variant: "destructive" }),
    });
  };

  useEffect(() => {
    if (profile) {
      setProfileName(profile.name);
      setProfileEmail(profile.email);
    }
  }, [profile]);

  const handleUpdateProfile = () => {
    updateProfile.mutate({ data: { name: profileName } }, {
      onSuccess: (updated) => {
        toast({ title: "Profile updated successfully" });
        if (updated.name) {
          login(localStorage.getItem('chop_plan_token') || '', 'user', updated.name);
        }
      },
      onError: () => {
        toast({ title: "Failed to update profile", variant: "destructive" });
      }
    });
  };

  const handleCancelSubscription = (subId: number) => {
    cancelSub.mutate({ subscriptionId: subId }, {
      onSuccess: () => {
        toast({ title: "Subscription cancelled successfully" });
        // Let React Query handle cache invalidation automatically based on generated hook config
      },
      onError: () => {
        toast({ title: "Failed to cancel subscription", variant: "destructive" });
      }
    });
  };

  if (!isAuthenticated || role !== "user") return null;

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-serif font-bold">
          {name?.charAt(0).toUpperCase() || "U"}
        </div>
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Customer Dashboard</p>
          <h1 className="text-3xl font-serif font-bold">Hello, {name}</h1>
          <p className="text-muted-foreground">Manage your meals and settings.</p>
        </div>
      </div>

      <Tabs defaultValue="subscriptions" className="w-full">
        <div className="mb-8 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="font-mono border-b rounded-none bg-transparent h-12 w-max sm:w-full justify-start gap-6 sm:gap-8">
            <TabsTrigger value="subscriptions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 whitespace-nowrap">
              My Subscriptions
            </TabsTrigger>
            <TabsTrigger value="alacarte" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 whitespace-nowrap" data-testid="tab-alacarte-orders">
              À La Carte Orders
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 whitespace-nowrap">
              Profile Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="subscriptions" className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold">Active Plans</h2>
            <Button asChild size="sm" variant="outline" className="font-mono">
              <Link href="/vendors">Find More Food</Link>
            </Button>
          </div>

          {subsLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : subscriptions && subscriptions.length > 0 ? (
            <div className="grid gap-6">
              {subscriptions.map(sub => {
                const startDate = new Date(sub.startDate);
                const isActive = sub.status === "active";
                const isCancelled = sub.status === "cancelled";

                return (
                  <Card key={sub.id} className={`overflow-hidden border ${isActive ? 'border-primary/30 shadow-md' : 'border-border opacity-75'}`}>
                    <div className="flex flex-col md:flex-row">
                      {sub.vendorCoverImage && (
                        <div className="w-full md:w-48 h-40 md:h-auto bg-muted">
                          <img src={sub.vendorCoverImage} alt={sub.vendorName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        </div>
                      )}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <Badge variant={isActive ? "default" : "secondary"} className="mb-2 font-mono text-xs">
                                {sub.status.toUpperCase()}
                              </Badge>
                              <h3 className="text-xl font-serif font-bold text-foreground">
                                {sub.planName || "Meal Plan"} <span className="text-muted-foreground font-normal text-base">from</span> {sub.vendorName || "Restaurant"}
                              </h3>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-lg text-primary">₦{sub.priceNaira.toLocaleString('en-NG')}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Started: {startDate.toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{sub.daysPerMonth} days/mo ({sub.freeDays} free)</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end gap-2">
                          {isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-mono gap-2"
                              onClick={() => { setScheduleSubId(sub.id); setScheduleOpen(true); }}
                              data-testid={`button-schedule-sub-${sub.id}`}
                            >
                              <CalendarCheck className="w-4 h-4" /> Pickup Schedule
                            </Button>
                          )}
                          {isActive && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="font-mono" data-testid={`button-cancel-sub-${sub.id}`}>
                                  Cancel Subscription
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2 text-destructive font-serif text-xl">
                                    <AlertTriangle className="w-5 h-5" /> Cancel Subscription?
                                  </DialogTitle>
                                  <DialogDescription className="text-base pt-2">
                                    Are you sure you want to cancel your <strong>{sub.planName}</strong> plan from <strong>{sub.vendorName}</strong>? 
                                    This action cannot be undone and your meals will stop at the end of the current billing cycle.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="mt-4 gap-2">
                                  <DialogTrigger asChild>
                                    <Button variant="outline" className="font-mono">Keep It</Button>
                                  </DialogTrigger>
                                  <Button 
                                    variant="destructive" 
                                    className="font-mono" 
                                    onClick={() => handleCancelSubscription(sub.id)}
                                    disabled={cancelSub.isPending}
                                  >
                                    {cancelSub.isPending ? "Cancelling..." : "Yes, Cancel Plan"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                          {isCancelled && (
                            <Button asChild variant="outline" size="sm" className="font-mono">
                              <Link href={`/vendors/${sub.vendorId}`}>Resubscribe</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-card rounded-xl border border-dashed border-border">
              <Utensils className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-2xl font-serif font-bold mb-2">No active meals</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">You aren't subscribed to any meal plans right now. Find a restaurant to get started.</p>
              <Button asChild className="font-mono">
                <Link href="/vendors">Find Restaurants</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alacarte" className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold">Off-Schedule Orders</h2>
            <Button asChild size="sm" variant="outline" className="font-mono">
              <Link href="/vendors">Find More Food</Link>
            </Button>
          </div>

          {alacarteLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : alacarteOrders && alacarteOrders.length > 0 ? (
            <div className="grid gap-4">
              {alacarteOrders.map((order) => {
                const canConfirm = order.status === "success" && order.pickupStatus === "pending";
                return (
                  <Card key={order.id} className="border-border">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant={order.status === "success" ? "default" : order.status === "failed" ? "destructive" : "secondary"} className="font-mono text-xs uppercase">
                              {order.status}
                            </Badge>
                            {order.pickupStatus === "confirmed" && (
                              <Badge className="font-mono uppercase text-[10px] gap-1"><Check className="w-3 h-3" /> Picked Up</Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-serif font-bold break-words">
                            {order.mealName || "Meal"} <span className="text-muted-foreground font-normal text-sm">from</span> {order.vendorName}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : ""} · ₦{order.amountNaira.toLocaleString('en-NG')}
                          </p>
                        </div>
                        {canConfirm && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-mono shrink-0 w-full sm:w-auto"
                            onClick={() => handleConfirmAlacarte(order.id)}
                            disabled={confirmAlacarte.isPending}
                            data-testid={`button-confirm-alacarte-order-${order.id}`}
                          >
                            Confirm Received
                          </Button>
                        )}
                      </div>
                      {order.status === "success" && (
                        <NotificationHistory orderRef={{ orderType: "alacarte", paymentId: order.id }} viewer="user" />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-card rounded-xl border border-dashed border-border">
              <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-2xl font-serif font-bold mb-2">No à la carte orders yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">Buy directly from any restaurant on a day outside your plan schedule — no subscription needed.</p>
              <Button asChild className="font-mono">
                <Link href="/vendors">Browse Restaurants</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Personal Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={profileName} 
                      onChange={(e) => setProfileName(e.target.value)} 
                      data-testid="input-profile-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      value={profileEmail} 
                      disabled 
                      className="bg-muted text-muted-foreground cursor-not-allowed" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="bg-muted/30 border-t px-4 sm:px-6 py-4">
              <Button 
                onClick={handleUpdateProfile} 
                disabled={profileLoading || updateProfile.isPending || profileName === profile?.name}
                className="font-mono w-full sm:w-auto sm:ml-auto"
                data-testid="button-save-profile"
              >
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      <SubscriptionScheduleDialog subscriptionId={scheduleSubId} open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </div>
  );
}
