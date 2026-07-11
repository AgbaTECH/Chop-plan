import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { 
  useListUserSubscriptions, 
  useCancelSubscription, 
  useGetMe,
  useUpdateUserProfile 
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
import { Calendar, User, Clock, Utensils, AlertTriangle } from "lucide-react";

export default function UserDashboardPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, role, name, login } = useAuth();
  const { toast } = useToast();
  
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  // Redirect if not user
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth/user");
    } else if (role === "vendor") {
      setLocation("/vendor/dashboard");
    }
  }, [isAuthenticated, role, setLocation]);

  const { data: profile, isLoading: profileLoading } = useGetMe();
  const { data: subscriptions, isLoading: subsLoading } = useListUserSubscriptions();
  const updateProfile = useUpdateUserProfile();
  const cancelSub = useCancelSubscription();

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
          <h1 className="text-3xl font-serif font-bold">Hello, {name}</h1>
          <p className="text-muted-foreground">Manage your meals and settings.</p>
        </div>
      </div>

      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList className="mb-8 font-mono border-b rounded-none bg-transparent h-12 w-full justify-start gap-8">
          <TabsTrigger value="subscriptions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">
            My Subscriptions
          </TabsTrigger>
          <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">
            Profile Settings
          </TabsTrigger>
        </TabsList>

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
                          <img src={sub.vendorCoverImage} alt={sub.vendorName} className="w-full h-full object-cover" />
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
                        
                        <div className="mt-6 flex justify-end">
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
            <CardFooter className="bg-muted/30 border-t px-6 py-4">
              <Button 
                onClick={handleUpdateProfile} 
                disabled={profileLoading || updateProfile.isPending || profileName === profile?.name}
                className="font-mono ml-auto"
                data-testid="button-save-profile"
              >
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
