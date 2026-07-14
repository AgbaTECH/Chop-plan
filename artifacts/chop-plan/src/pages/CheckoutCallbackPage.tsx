import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useVerifyPayment, getVerifyPaymentQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

// Paystack appends `trxref` (and usually `reference`, the same value) to the
// callback URL once the customer finishes on its hosted checkout page. This
// screen polls our own /user/payments/:reference/verify endpoint — which
// itself asks Paystack directly whether the charge really succeeded — rather
// than trusting anything in the URL.
export default function CheckoutCallbackPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const reference = params.get("reference") || params.get("trxref");

  const [pollCount, setPollCount] = useState(0);
  const { data, isLoading, error } = useVerifyPayment(reference ?? "", {
    query: {
      enabled: !!reference,
      queryKey: getVerifyPaymentQueryKey(reference ?? ""),
      refetchInterval: (query) => (query.state.data?.status === "pending" ? 2000 : false),
    },
  });

  useEffect(() => {
    if (data?.status !== "pending") return;
    const t = setTimeout(() => setPollCount((c) => c + 1), 2000);
    return () => clearTimeout(t);
  }, [data?.status, pollCount]);

  if (!reference) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-lg text-center">
        <Card>
          <CardHeader>
            <XCircle className="w-14 h-14 text-destructive mx-auto mb-2" />
            <CardTitle className="font-serif text-2xl">Missing payment reference</CardTitle>
            <CardDescription>We couldn't find a payment reference in the URL. If you just paid, check your dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="font-mono"><Link href="/dashboard">Go to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = error ? "error" : data?.status ?? "pending";

  return (
    <div className="container mx-auto px-4 py-24 max-w-lg text-center">
      <Card>
        <CardHeader>
          {status === "success" && <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-2" data-testid="icon-payment-success" />}
          {(status === "failed" || status === "error") && <XCircle className="w-14 h-14 text-destructive mx-auto mb-2" data-testid="icon-payment-failed" />}
          {status === "pending" && <Loader2 className="w-14 h-14 text-muted-foreground mx-auto mb-2 animate-spin" data-testid="icon-payment-pending" />}

          <CardTitle className="font-serif text-2xl">
            {status === "success" && data?.orderType === "alacarte" && "Order Confirmed!"}
            {status === "success" && data?.orderType !== "alacarte" && "Subscription Confirmed!"}
            {status === "failed" && "Payment Declined"}
            {status === "error" && "Couldn't Verify Payment"}
            {status === "pending" && "Confirming Your Payment..."}
          </CardTitle>
          <CardDescription>
            {status === "success" && data?.orderType === "alacarte" && "Your meal is ready to pick up. You can manage this in your dashboard."}
            {status === "success" && data?.orderType !== "alacarte" && "Your lunch is sorted. You can manage this in your dashboard."}
            {status === "failed" && (data?.message || "Your payment could not be completed.")}
            {status === "error" && "Something went wrong while checking your payment. Please check your dashboard or try again."}
            {status === "pending" && "This usually takes a few seconds. Please don't close this page."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-3">
          {status === "success" && (
            <Button asChild className="font-mono" data-testid="link-go-to-dashboard">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
          {(status === "failed" || status === "error") && (
            <>
              <Button asChild variant="outline" className="font-mono">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild className="font-mono" data-testid="link-retry-checkout">
                <Link href="/vendors">Try Again</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
