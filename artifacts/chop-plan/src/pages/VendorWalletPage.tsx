import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/VendorLayout";
import {
  useGetVendorWallet,
  useWithdrawFromWallet,
  useListPaystackBanks,
  useGetVendorBankAccount,
  useSetVendorBankAccount,
  getGetVendorWalletQueryKey,
  getGetVendorBankAccountQueryKey,
  getListPaystackBanksQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BankSearchCombobox } from "@/components/BankSearchCombobox";
import { useToast } from "@/hooks/use-toast";
import { Wallet, PiggyBank, ArrowDownToLine, Landmark, ShieldCheck, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const statusStyles: Record<string, string> = {
  success: "bg-green-100 text-green-800 hover:bg-green-100",
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  failed: "bg-red-100 text-red-800 hover:bg-red-100",
};

export default function VendorWalletPage() {
  const { data: wallet, isLoading } = useGetVendorWallet();
  const { data: bankAccount, isLoading: bankLoading } = useGetVendorBankAccount();
  const withdraw = useWithdrawFromWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");

  const hasBankAccount = !!bankAccount;

  const handleWithdraw = () => {
    const amountNaira = Number(amount);
    if (!amountNaira || amountNaira <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    withdraw.mutate({ data: { amountNaira } }, {
      onSuccess: (data) => {
        const latest = data.withdrawals[0];
        if (latest?.status === "failed") {
          toast({ title: "Withdrawal failed", description: latest.failureReason || "Please try again", variant: "destructive" });
        } else {
          toast({ title: "Withdrawal initiated", description: "Your transfer is on its way to your bank account." });
        }
        setAmount("");
        queryClient.invalidateQueries({ queryKey: getGetVendorWalletQueryKey() });
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
                <p className="text-xs text-muted-foreground mt-1">Lifetime total, successful transfers only</p>
              </CardContent>
            </Card>
          </div>

          <BankAccountCard
            bankAccount={bankAccount ?? null}
            isLoading={bankLoading}
            onSaved={() => queryClient.invalidateQueries({ queryKey: getGetVendorBankAccountQueryKey() })}
          />

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-serif text-xl">Withdraw Funds</CardTitle>
              <CardDescription>
                {hasBankAccount
                  ? "Funds are released incrementally as customers confirm pickups. Withdrawing sends a real transfer to your verified bank account via Paystack."
                  : "Add and verify a payout bank account below before you can withdraw."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2 w-full sm:w-64">
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input id="amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" data-testid="input-withdraw-amount" disabled={!hasBankAccount} />
              </div>
              <Button onClick={handleWithdraw} disabled={withdraw.isPending || !hasBankAccount} className="font-mono" data-testid="button-withdraw">
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
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallet.withdrawals.length > 0 ? wallet.withdrawals.map((w) => (
                    <TableRow key={w.id} data-testid={`row-withdrawal-${w.id}`}>
                      <TableCell className="font-mono text-sm">{format(new Date(w.createdAt), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-sm">
                        <div>{w.bankName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{w.accountNumber} · {w.accountName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusStyles[w.status] ?? ""}>{w.status}</Badge>
                        {w.status === "failed" && w.failureReason && (
                          <p className="text-xs text-red-700 mt-1 max-w-xs">{w.failureReason}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">₦{w.amountNaira.toLocaleString('en-NG')}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No withdrawals yet.</TableCell>
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

function BankAccountCard({
  bankAccount,
  isLoading,
  onSaved,
}: {
  bankAccount: { bankCode: string; bankName: string; accountNumber: string; accountName: string; updatedAt: string } | null | undefined;
  isLoading: boolean;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  // Bank list rarely changes; keep it cached for the whole session instead of
  // refetching every time this card mounts (e.g. re-opening "Change").
  const { data: banks, isLoading: banksLoading } = useListPaystackBanks({
    query: { staleTime: Infinity, gcTime: Infinity, queryKey: getListPaystackBanksQueryKey() },
  });
  const setBankAccount = useSetVendorBankAccount();

  const [editing, setEditing] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  useEffect(() => {
    if (!bankAccount && !isLoading) setEditing(true);
  }, [bankAccount, isLoading]);

  const selectedBank = banks?.find((b) => b.code === bankCode);

  const handleSave = () => {
    if (!bankCode || !selectedBank) {
      toast({ title: "Select a bank", variant: "destructive" });
      return;
    }
    if (!accountNumber || accountNumber.length < 10) {
      toast({ title: "Enter a valid account number", variant: "destructive" });
      return;
    }
    setBankAccount.mutate(
      { data: { bankCode, bankName: selectedBank.name, accountNumber } },
      {
        onSuccess: (data) => {
          toast({ title: "Payout account verified", description: `${data.accountName} · ${data.bankName}` });
          setEditing(false);
          setAccountNumber("");
          setBankCode("");
          onSaved();
        },
        onError: (err: any) => {
          toast({ title: "Could not verify this account", description: err?.data?.error || "Please check the details and try again", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="font-serif text-xl flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" /> Payout Bank Account
        </CardTitle>
        <CardDescription>Withdrawals are sent here via Paystack Transfers.</CardDescription>
      </CardHeader>
      <CardContent>
        {!editing && bankAccount ? (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="font-medium">{bankAccount.accountName}</p>
                <p className="text-sm text-muted-foreground font-mono">{bankAccount.bankName} · {bankAccount.accountNumber}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="font-mono" onClick={() => setEditing(true)} data-testid="button-edit-bank-account">
              <Pencil className="w-3.5 h-3.5 mr-1" /> Change
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="space-y-2 w-full sm:w-64">
              <Label>Bank</Label>
              <BankSearchCombobox
                banks={banks ?? []}
                value={bankCode}
                onChange={setBankCode}
                loading={banksLoading}
              />
            </div>
            <div className="space-y-2 w-full sm:w-56">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="0123456789"
                maxLength={10}
                data-testid="input-account-number"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={setBankAccount.isPending} className="font-mono" data-testid="button-save-bank-account">
                {setBankAccount.isPending ? "Verifying..." : "Verify & Save"}
              </Button>
              {bankAccount && (
                <Button variant="outline" className="font-mono" onClick={() => setEditing(false)}>Cancel</Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
