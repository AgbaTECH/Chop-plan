import { AdminLayout } from "@/components/AdminLayout";
import { useListAdminNotifications } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const presetLabel: Record<string, string> = {
  ready: "Ready for pickup",
  delayed_10: "Delayed 10 min",
  delayed_20: "Delayed 20 min",
  custom: "Custom message",
};

const orderTypeLabel: Record<string, string> = {
  subscription: "Subscription",
  alacarte: "Single",
};

export default function AdminNotificationsPage() {
  const { data: notifications, isLoading } = useListAdminNotifications();

  return (
    <AdminLayout title="Pickup Notifications">
      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Sent</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : notifications && notifications.length > 0 ? (
                notifications.map((n) => (
                  <TableRow key={n.id} data-testid={`row-notification-${n.id}`}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{format(new Date(n.createdAt), "MMM d, yyyy p")}</TableCell>
                    <TableCell className="font-medium">{n.vendorName}</TableCell>
                    <TableCell>{n.customerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{orderTypeLabel[n.orderType] ?? n.orderType}</Badge>
                      <span className="ml-2 text-xs text-muted-foreground">{presetLabel[n.presetType] ?? n.presetType}</span>
                    </TableCell>
                    <TableCell className="text-sm max-w-md truncate">{n.message}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No notifications sent yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
