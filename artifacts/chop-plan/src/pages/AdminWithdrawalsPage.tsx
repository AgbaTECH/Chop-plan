import { AdminLayout } from "@/components/AdminLayout";
import { useListAdminWithdrawals } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const statusStyles: Record<string, string> = {
  success: "bg-green-100 text-green-800 hover:bg-green-100",
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  failed: "bg-red-100 text-red-800 hover:bg-red-100",
};

export default function AdminWithdrawalsPage() {
  const { data: withdrawals, isLoading } = useListAdminWithdrawals();
  const pendingCount = withdrawals?.filter((w) => w.status === "pending").length ?? 0;

  return (
    <AdminLayout title="Withdrawals & Reconciliation">
      <Card className="border-amber-200 bg-amber-50 mb-6">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-900">
            Automatic reconciliation isn't wired up yet, so nothing here is auto-flagged. Watch withdrawals stuck in{" "}
            <span className="font-medium">pending</span> for longer than a normal transfer window — that's the signal reconciliation
            will eventually catch automatically.
            {pendingCount > 0 && <span className="font-medium"> Currently {pendingCount} pending.</span>}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Failure Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : withdrawals && withdrawals.length > 0 ? (
                withdrawals.map((w) => (
                  <TableRow key={w.id} data-testid={`row-withdrawal-${w.id}`}>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(w.createdAt), "MMM d, yyyy p")}</TableCell>
                    <TableCell className="font-medium">{w.vendorName}</TableCell>
                    <TableCell className="text-right font-mono">₦{w.amountNaira.toLocaleString("en-NG")}</TableCell>
                    <TableCell className="text-sm">{w.bankName} · {w.accountNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusStyles[w.status] ?? ""}>{w.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{w.failureReason ?? "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No withdrawals yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
