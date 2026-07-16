/**
 * Vendor Messages — two-way chat with customers.
 * Left panel: thread list. Right panel: full conversation.
 */
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { VendorLayout } from "@/components/VendorLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";

interface Thread {
  userId: number;
  customerName: string;
  customerPhone: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
}

interface Message {
  id: number;
  senderRole: "vendor" | "user";
  content: string;
  createdAt: string;
  readAt: string | null;
}

export default function VendorMessagesPage() {
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: threads, isLoading: threadsLoading } = useQuery<Thread[]>({
    queryKey: ["vendor-message-threads"],
    queryFn: () => customFetch("/api/vendor/messages"),
    refetchInterval: 10_000,
  });

  const { data: messages, isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["vendor-message-thread", selectedUserId],
    queryFn: () => customFetch(`/api/vendor/messages/${selectedUserId}`),
    enabled: !!selectedUserId,
    refetchInterval: 5_000,
  });

  const sendMsg = useMutation({
    mutationFn: (content: string) =>
      customFetch(`/api/vendor/messages/${selectedUserId}`, {
        method: "POST",
        body: JSON.stringify({ content }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["vendor-message-thread", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["vendor-message-threads"] });
    },
  });

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedThread = threads?.find((t) => t.userId === selectedUserId);

  return (
    <VendorLayout title="Messages">
      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Thread list */}
        <aside className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">
          {threadsLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            : threads && threads.length > 0
            ? threads.map((t) => (
                <button
                  key={t.userId}
                  onClick={() => setSelectedUserId(t.userId)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-colors",
                    selectedUserId === t.userId
                      ? "bg-primary/10 border-primary/30"
                      : "bg-card border-border hover:bg-muted/50"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium truncate text-sm">{t.customerName}</span>
                    {t.unreadCount > 0 && (
                      <Badge className="shrink-0 h-5 min-w-[1.25rem] text-[10px] font-mono">
                        {t.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{t.lastMessage}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                    {t.lastAt ? format(new Date(t.lastAt), "MMM d, HH:mm") : ""}
                  </p>
                </button>
              ))
            : (
                <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground gap-2">
                  <MessageSquare className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No messages yet.</p>
                  <p className="text-xs">When customers message you, they'll appear here.</p>
                </div>
              )}
        </aside>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-card">
          {selectedThread ? (
            <>
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="font-medium">{selectedThread.customerName}</p>
                <p className="text-xs text-muted-foreground font-mono">{selectedThread.customerPhone}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgsLoading
                  ? <Skeleton className="h-10 w-48" />
                  : messages?.map((m) => (
                      <div
                        key={m.id}
                        className={cn("flex", m.senderRole === "vendor" ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] px-3 py-2 rounded-2xl text-sm",
                            m.senderRole === "vendor"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          )}
                        >
                          <p>{m.content}</p>
                          <p className={cn("text-[10px] mt-1", m.senderRole === "vendor" ? "text-primary-foreground/60" : "text-muted-foreground")}>
                            {format(new Date(m.createdAt), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                <div ref={bottomRef} />
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  className="resize-none min-h-[2.5rem] max-h-24 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (draft.trim()) sendMsg.mutate(draft.trim());
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={() => draft.trim() && sendMsg.mutate(draft.trim())}
                  disabled={!draft.trim() || sendMsg.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm max-w-xs">Choose a customer on the left to read and reply to their messages.</p>
            </div>
          )}
        </div>
      </div>
    </VendorLayout>
  );
}
