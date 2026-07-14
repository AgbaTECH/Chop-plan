import { AdminLayout } from "@/components/AdminLayout";
import { useListAdminTransactions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const statusStyles: Record<string, string> = {
  success: "bg-green-100 text-green-800 hover:bg-green-100",
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  failed: "bg-red-100 text-red-800 hover:bg-red-100",
};

const orderTypeLabel: Record<string, string> = {
  subscription: "Subscription",
  alacarte: "Off-schedule",
};

export default function AdminTransactionsPage() {
  const { data: transactions, isLoading } = useListAdminTransactions();

  const totals = transactions?.reduce(
    (acc, t) => {
      if (t.status !== "success") return acc;
      acc.amount += t.amountNaira;
      acc.payout += t.vendorPayoutNaira;
      acc.markup += t.markupNaira;
      return acc;
    },
    { amount: 0, payout: 0, markup: 0 }
  );

  return (
    <AdminLayout title="Transactions">
      {!isLoading && totals && (
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total processed</p>
              <p className="font-mono text-xl font-bold">₦{totals.amount.toLocaleString("en-NG")}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Vendor payouts</p>
              <p className="font-mono text-xl font-bold">₦{totals.payout.toLocaleString("en-NG")}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">ChopPlan markup</p>
              <p className="font-mono text-xl font-bold text-primary">₦{totals.markup.toLocaleString("en-NG")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Vendor Payout</TableHead>
                <TableHead className="text-right">ChopPlan Markup</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : transactions && transactions.length > 0 ? (
                transactions.map((t) => (
                  <TableRow key={`${t.orderType}-${t.id}`} data-testid={`row-transaction-${t.id}`}>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(t.createdAt), "MMM d, yyyy p")}</TableCell>
                    <TableCell>{orderTypeLabel[t.orderType] ?? t.orderType}</TableCell>
                    <TableCell className="font-medium">{t.vendorName}</TableCell>
                    <TableCell>{t.customerName}</TableCell>
                    <TableCell className="text-right font-mono">₦{t.amountNaira.toLocaleString("en-NG")}</TableCell>
                    <TableCell className="text-right font-mono">₦{t.vendorPayoutNaira.toLocaleString("en-NG")}</TableCell>
                    <TableCell className="text-right font-mono text-primary">₦{t.markupNaira.toLocaleString("en-NG")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusStyles[t.status] ?? ""}>{t.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">No transactions yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
