/**
 * Admin Order Archive — shows alacarte payments and subscription pickup days
 * that are older than the start of the current ISO week. These records are
 * hidden from customer and vendor views by the weekly archive filter, but
 * admins can always access them here.
 */
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

interface ArchiveOrder {
  id: number;
  orderType: string;
  amountNaira: number;
  status: string;
  createdAt: string;
  vendorName: string;
  customerName: string;
}

interface ArchiveDay {
  id: number;
  scheduledDate: string;
  status: string;
  confirmedAt: string | null;
  customerName: string;
  vendorName: string;
}

interface ArchiveData {
  alacarteOrders: ArchiveOrder[];
  subscriptionDays: ArchiveDay[];
}

const statusVariant = (s: string) =>
  s === "success" || s === "confirmed" ? "default" : s === "failed" ? "destructive" : "secondary";

export default function AdminOrderArchivePage() {
  const { data, isLoading } = useQuery<ArchiveData>({
    queryKey: ["admin-order-archive"],
    queryFn: () => customFetch("/api/admin/order-archive"),
    staleTime: 60_000,
  });

  return (
    <AdminLayout title="Order Archive">
      <p className="text-muted-foreground mb-6">
        Orders and pickup days from before the current week — hidden from customer and vendor dashboards but preserved here for reference.
      </p>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="mb-6 font-mono">
          <TabsTrigger value="single">Single Orders</TabsTrigger>
          <TabsTrigger value="subscription">Subscription Days</TabsTrigger>
        </TabsList>

        {/* Single (alacarte) orders */}
        <TabsContent value="single">
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="rounded-md overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 5 }).map((__, j) => (
                              <TableCell key={j}><Skeleton className="h-5 w-24" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : data?.alacarteOrders?.length
                      ? data.alacarteOrders.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.customerName}</TableCell>
                            <TableCell>{row.vendorName}</TableCell>
                            <TableCell className="text-right font-mono">₦{row.amountNaira.toLocaleString("en-NG")}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(row.status)} className="font-mono uppercase text-[10px]">
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {format(new Date(row.createdAt), "MMM d, yyyy")}
                            </TableCell>
                          </TableRow>
                        ))
                      : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                              No archived single orders yet.
                            </TableCell>
                          </TableRow>
                        )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription days */}
        <TabsContent value="subscription">
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="rounded-md overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Confirmed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 5 }).map((__, j) => (
                              <TableCell key={j}><Skeleton className="h-5 w-24" /></TableCell>
                            ))}
                          </TableRow>
                        ))
                      : data?.subscriptionDays?.length
                      ? data.subscriptionDays.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.customerName}</TableCell>
                            <TableCell>{row.vendorName}</TableCell>
                            <TableCell className="font-mono text-sm">{row.scheduledDate}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(row.status)} className="font-mono uppercase text-[10px]">
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {row.confirmedAt ? format(new Date(row.confirmedAt), "MMM d, HH:mm") : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                              No archived subscription days yet.
                            </TableCell>
                          </TableRow>
                        )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
