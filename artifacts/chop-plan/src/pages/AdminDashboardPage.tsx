import { useEffect } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { useGetAdminStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, Users, Activity, TrendingUp } from "lucide-react";

export default function AdminDashboardPage() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading, error } = useGetAdminStats();

  useEffect(() => {
    if (error && ((error as any)?.status === 401 || (error as any)?.status === 403)) {
      setLocation("/auth/admin");
    }
  }, [error, setLocation]);

  return (
    <AdminLayout title="Platform Overview">
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
      ) : stats ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border hover-elevate transition-transform bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vendors</CardTitle>
              <Store className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-foreground">{stats.vendorCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered restaurants</p>
            </CardContent>
          </Card>
          <Card className="border-border hover-elevate transition-transform bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-foreground">{stats.customerCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered customers</p>
            </CardContent>
          </Card>
          <Card className="border-border hover-elevate transition-transform bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-foreground">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently running</p>
            </CardContent>
          </Card>
          <Card className="border-border hover-elevate transition-transform bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-foreground">₦{stats.totalMonthlyRevenueNaira.toLocaleString('en-NG')}</div>
              <p className="text-xs text-muted-foreground mt-1">Projected from active plans</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </AdminLayout>
  );
}
