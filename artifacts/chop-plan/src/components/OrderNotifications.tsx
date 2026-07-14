import { useState } from "react";
import {
  useListVendorOrderNotifications,
  useListUserOrderNotifications,
  useSendVendorOrderNotification,
  getListVendorOrderNotificationsQueryKey,
  getListUserOrderNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bell, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type OrderType = "subscription" | "alacarte";

const PRESET_OPTIONS: { value: string; label: string }[] = [
  { value: "ready", label: "Order ready for pickup" },
  { value: "delayed_10", label: "Delayed ~10 minutes" },
  { value: "delayed_20", label: "Delayed ~20 minutes" },
  { value: "custom", label: "Custom message" },
];

const PRESET_LABELS: Record<string, string> = Object.fromEntries(PRESET_OPTIONS.map((p) => [p.value, p.label]));

type OrderRef = { orderType: OrderType; subscriptionDayId?: number; paymentId?: number };

function orderParams(ref: OrderRef) {
  return ref.orderType === "subscription"
    ? { orderType: ref.orderType, subscriptionDayId: ref.subscriptionDayId! }
    : { orderType: ref.orderType, paymentId: ref.paymentId! };
}

/** Read-only notification history thread, used on both the vendor and customer side. */
export function NotificationHistory({ orderRef, viewer }: { orderRef: OrderRef; viewer: "vendor" | "user" }) {
  const params = orderParams(orderRef);
  // Poll for new pickup notifications so a customer/vendor sees updates
  // without needing to manually refresh the page.
  const vendorQuery = useListVendorOrderNotifications(params, {
    query: { enabled: viewer === "vendor", queryKey: getListVendorOrderNotificationsQueryKey(params), refetchInterval: 15000 },
  });
  const userQuery = useListUserOrderNotifications(params, {
    query: { enabled: viewer === "user", queryKey: getListUserOrderNotificationsQueryKey(params), refetchInterval: 15000 },
  });
  const { data, isLoading } = viewer === "vendor" ? vendorQuery : userQuery;

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading updates…</p>;
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      {data.map((n) => (
        <div key={n.id} className="flex items-start gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
          <MessageSquare className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <div>
            <p>{n.message}</p>
            <p className="text-[10px] font-mono uppercase text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Vendor-only control to send a pickup notification about a specific order. */
export function NotifyCustomerButton({ orderRef, size = "sm" }: { orderRef: OrderRef; size?: "sm" | "default" }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState("ready");
  const [customMessage, setCustomMessage] = useState("");
  const sendNotification = useSendVendorOrderNotification();

  const handleSend = () => {
    sendNotification.mutate(
      {
        data: {
          ...orderRef,
          presetType: preset as any,
          ...(preset === "custom" ? { message: customMessage } : {}),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Customer notified" });
          setOpen(false);
          setCustomMessage("");
          setPreset("ready");
          const params = orderParams(orderRef);
          queryClient.invalidateQueries({ queryKey: getListVendorOrderNotificationsQueryKey(params) });
          queryClient.invalidateQueries({ queryKey: getListUserOrderNotificationsQueryKey(params) });
        },
        onError: (err: any) => toast({ title: "Could not send notification", description: err?.data?.error, variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size} className="font-mono gap-2" data-testid={`button-notify-${orderRef.orderType}-${orderRef.subscriptionDayId ?? orderRef.paymentId}`}>
          <Bell className="w-4 h-4" /> Notify
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Notify Customer</DialogTitle>
          <DialogDescription>Let them know about this pickup.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={preset} onValueChange={setPreset} className="space-y-2">
          {PRESET_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`preset-${opt.value}`} />
              <Label htmlFor={`preset-${opt.value}`} className="font-normal cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
        {preset === "custom" && (
          <Textarea
            placeholder="Type a message for the customer…"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            maxLength={300}
            data-testid="input-custom-notification-message"
          />
        )}
        <DialogFooter>
          <Button
            onClick={handleSend}
            disabled={sendNotification.isPending || (preset === "custom" && customMessage.trim().length === 0)}
            className="font-mono"
            data-testid="button-send-notification"
          >
            {sendNotification.isPending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { PRESET_LABELS };
export type { OrderRef };
