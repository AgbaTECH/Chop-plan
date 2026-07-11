import { VendorLayout } from "@/components/VendorLayout";
import { useGetVendorEarnings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function VendorEarningsPage() {
  const { data: earnings, isLoading } = useGetVendorEarnings();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 shadow-md rounded-lg">
          <p className="font-serif font-bold text-popover-foreground mb-1">{label}</p>
          <p className="font-mono text-primary font-bold">
            ₦{Number(payload[0].value).toLocaleString('en-NG')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <VendorLayout title="Earnings Report">
      <div className="grid gap-8">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-10 w-48" /></CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-10 w-48" /></CardContent>
            </Card>
          </div>
        ) : earnings ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">Projected Weekly</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-mono text-primary">
                  ₦{earnings.weekly.toLocaleString('en-NG')}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Based on active subscriptions</p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">Projected Monthly</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-mono">
                  ₦{earnings.monthly.toLocaleString('en-NG')}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Based on active subscriptions</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Monthly Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-[350px]" />
            ) : earnings?.monthlyByPlan && earnings.monthlyByPlan.length > 0 ? (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={earnings.monthlyByPlan}
                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="planName" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "var(--font-mono)" }}
                      tickFormatter={(val) => `₦${(val/1000)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar 
                      dataKey="revenueNaira" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground italic border border-dashed rounded-lg">
                No revenue history available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}
