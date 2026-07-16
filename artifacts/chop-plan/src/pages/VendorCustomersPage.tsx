import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { VendorLayout } from "@/components/VendorLayout";
import {
  useListVendorCustomers,
  useGetVendorCustomerSchedule,
  getGetVendorCustomerScheduleQueryKey,
  useListVendorAlacarteOrders,
} from "@workspace/api-client-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotifyCustomerButton, NotificationHistory } from "@/components/OrderNotifications";
import { format, isToday, isYesterday } from "date-fns";
import { CalendarCheck, CheckCircle2, BellRing } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/** Human-readable date heading used to group orders by day. */
function dateGroupLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

function CustomerScheduleDialog({ subscriptionId, open, onOpenChange }: { subscriptionId: number | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: days, isLoading } = useGetVendorCustomerSchedule(subscriptionId ?? 0, {
    query: { enabled: !!subscriptionId && open, queryKey: getGetVendorCustomerScheduleQueryKey(subscriptionId ?? 0) },
  });
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Pickup Schedule</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {days?.map((day) => {
              const dateStr = new Date(day.scheduledDate).toISOString().split("T")[0];
              const isActiveDay = dateStr <= todayStr;
              return (
                <div key={day.id} className="py-2 border-b last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono">Day {day.dayNumber} &middot; {format(new Date(day.scheduledDate), 'MMM dd, yyyy')}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={day.status === 'confirmed' ? 'default' : 'secondary'} className="font-mono uppercase text-[10px]">
                        {day.status}
                      </Badge>
                      {isActiveDay && day.status !== "confirmed" && (
                      <NotifyCustomerButton orderRef={{ orderType: "subscription", subscriptionDayId: day.id }} />
                    )}
                    {day.status === "confirmed" && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-mono font-medium shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </span>
                    )}
                    </div>
                  </div>
                  {isActiveDay && <NotificationHistory orderRef={{ orderType: "subscription", subscriptionDayId: day.id }} viewer="vendor" />}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VendorAlacarteOrdersTab() {
  const { data: orders, isLoading } = useListVendorAlacarteOrders();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return <p className="text-center text-muted-foreground py-16">No à la carte orders yet.</p>;
  }

  // Group orders by their order date so the list reads as a clear daily log
  // rather than a flat chronological dump.
  const grouped = orders.reduce<Record<string, typeof orders>>((acc, order) => {
    const key = order.orderDate ?? "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(order);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-8">
      {sortedDates.map((dateKey) => (
        <div key={dateKey}>
          <h3 className="text-sm font-mono uppercase text-muted-foreground tracking-widest mb-3 border-b border-border pb-2">
            {dateKey === "unknown" ? "Unknown date" : dateGroupLabel(dateKey)}
          </h3>
          <div className="space-y-4">
            {grouped[dateKey].map((order) => {
              const isPaid = order.status === "success";
              const isPickedUp = isPaid && order.pickupStatus === "confirmed";
              // Only show the Notify button for paid, not-yet-collected orders.
              // Once the customer marks pickup as confirmed, the notification
              // thread is resolved — collapse the action and show a done state.
              const canNotify = isPaid && !isPickedUp;
              return (
                <Card key={order.id} className={`border-border ${isPickedUp ? "opacity-75" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge
                            variant={order.status === "success" ? "default" : order.status === "failed" ? "destructive" : "secondary"}
                            className="font-mono text-xs uppercase"
                          >
                            {order.status}
                          </Badge>
                          {isPickedUp && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-mono font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Picked up · resolved
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-serif font-bold truncate">
                          {order.mealName || "Meal"} <span className="text-muted-foreground font-normal text-sm">for</span> {order.userName}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          ₦{order.amountNaira.toLocaleString('en-NG')}
                        </p>
                      </div>
                      {canNotify && (
                        <div className="shrink-0">
                          <NotifyCustomerButton orderRef={{ orderType: "alacarte", paymentId: order.id }} />
                        </div>
                      )}
                    </div>
                    {/* Show notification history for all paid orders — read-only once picked up */}
                    {isPaid && (
                      <NotificationHistory orderRef={{ orderType: "alacarte", paymentId: order.id }} viewer="vendor" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VendorCustomersPage() {
  const { data: customers, isLoading } = useListVendorCustomers();
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const notifyAll = useMutation({
    mutationFn: () =>
      customFetch<{ sent: number; message: string }>("/api/vendor/notify-all-today", {
        method: "POST",
      }),
    onSuccess: (data) => {
      toast({ title: data.sent > 0 ? `Notified ${data.sent} customer${data.sent !== 1 ? "s" : ""}` : "No orders to notify", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Could not send notifications", description: err?.data?.error ?? err?.message, variant: "destructive" });
    },
  });

  const viewSchedule = (subscriptionId: number) => {
    setSelectedSubId(subscriptionId);
    setDialogOpen(true);
  };

  return (
    <VendorLayout title="Customer Subscriptions">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => notifyAll.mutate()}
          disabled={notifyAll.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <BellRing className="w-4 h-4" />
          {notifyAll.isPending ? "Notifying…" : "Notify all today's customers"}
        </button>
      </div>
      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList className="mb-6 font-mono">
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="alacarte" data-testid="tab-vendor-alacarte-orders">Off-Schedule Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions">
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[200px]">Customer Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Active Plan</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Schedule</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : customers && customers.length > 0 ? (
                  customers.map((customer, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="font-serif">{customer.planName}</span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {customer.startDate ? format(new Date(customer.startDate), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={customer.status === 'active' ? 'default' : 'secondary'}
                          className="font-mono uppercase text-[10px]"
                        >
                          {customer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => viewSchedule(customer.id)} className="gap-2">
                          <CalendarCheck className="w-4 h-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No customers found. Wait for users to subscribe to your plans.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
        <TabsContent value="alacarte">
          <VendorAlacarteOrdersTab />
        </TabsContent>
      </Tabs>
      <CustomerScheduleDialog subscriptionId={selectedSubId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </VendorLayout>
  );
}
