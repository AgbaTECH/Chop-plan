import { useState } from "react";
import { VendorLayout } from "@/components/VendorLayout";
import { useGetVendorWallet, useWithdrawFromWallet } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Wallet, PiggyBank, ArrowDownToLine } from "lucide-react";
import { format } from "date-fns";

export default function VendorWalletPage() {
  const { data: wallet, isLoading } = useGetVendorWallet();
  const withdraw = useWithdrawFromWallet();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");

  const handleWithdraw = () => {
    const amountNaira = Number(amount);
    if (!amountNaira || amountNaira <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    withdraw.mutate({ data: { amountNaira } }, {
      onSuccess: () => {
        toast({ title: "Withdrawal recorded" });
        setAmount("");
      },
      onError: (err: any) => {
        toast({ title: "Withdrawal failed", description: err?.data?.error || "Please try again", variant: "destructive" });
      }
    });
  };

  return (
    <VendorLayout title="Vendor Wallet">
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : wallet ? (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
                <PiggyBank className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">₦{wallet.earnedNaira.toLocaleString('en-NG')}</div>
                <p className="text-xs text-muted-foreground mt-1">From confirmed pickups</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Withdrawable</CardTitle>
                <Wallet className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">₦{wallet.withdrawableNaira.toLocaleString('en-NG')}</div>
                <p className="text-xs text-muted-foreground mt-1">Available now</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Already Withdrawn</CardTitle>
                <ArrowDownToLine className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">₦{wallet.withdrawnNaira.toLocaleString('en-NG')}</div>
                <p className="text-xs text-muted-foreground mt-1">Lifetime total</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-serif text-xl">Withdraw Funds</CardTitle>
              <CardDescription>Funds are released incrementally as customers confirm pickups. This is an internal ledger only — payout to your bank happens outside the app.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2 w-full sm:w-64">
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input id="amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" data-testid="input-withdraw-amount" />
              </div>
              <Button onClick={handleWithdraw} disabled={withdraw.isPending} className="font-mono" data-testid="button-withdraw">
                {withdraw.isPending ? "Processing..." : "Withdraw"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-serif text-xl">Withdrawal History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallet.withdrawals.length > 0 ? wallet.withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-sm">{format(new Date(w.createdAt), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-right font-mono">₦{w.amountNaira.toLocaleString('en-NG')}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">No withdrawals yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </VendorLayout>
  );
}
