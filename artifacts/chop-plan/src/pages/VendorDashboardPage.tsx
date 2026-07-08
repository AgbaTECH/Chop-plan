import { useEffect } from "react";
import { useLocation } from "wouter";
import { VendorLayout } from "@/components/VendorLayout";
import { useGetVendorDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, CreditCard, Activity } from "lucide-react";

export default function VendorDashboardPage() {
  const [, setLocation] = useLocation();
  const { data: dashboard, isLoading, error } = useGetVendorDashboard();

  useEffect(() => {
    // If the hook throws a 401/403, we should let the auth guard handle it, 
    // but the VendorLayout component will handle the rendering guard.
    if (error) {
      if ((error as any)?.status === 401 || (error as any)?.status === 403) {
        setLocation("/auth/vendor");
      }
    }
  }, [error, setLocation]);

  return (
    <VendorLayout title="Dashboard Overview">
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : dashboard ? (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            
            <Card className="border-border hover-elevate transition-transform bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  ₦{dashboard.totalRevenue.toLocaleString('en-NG')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
              </CardContent>
            </Card>

            <Card className="border-border hover-elevate transition-transform bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                <Activity className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {dashboard.activeSubscriptions}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Currently feeding</p>
              </CardContent>
            </Card>

            <Card className="border-border hover-elevate transition-transform bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {dashboard.totalCustomers}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Unique diners</p>
              </CardContent>
            </Card>

            <Card className="border-border hover-elevate transition-transform bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly MRR</CardTitle>
                <CreditCard className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  ₦{dashboard.monthlyRecurringRevenue.toLocaleString('en-NG')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Expected this month</p>
              </CardContent>
            </Card>

          </div>

          <div className="mt-12 bg-card border rounded-xl p-8 text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 text-primary/40" />
            <h3 className="font-serif text-xl font-bold text-foreground mb-2">You're all caught up!</h3>
            <p className="max-w-md mx-auto">Use the sidebar to manage your menu, track customer subscriptions, or view detailed earnings reports.</p>
          </div>
        </div>
      ) : null}
    </VendorLayout>
  );
}
