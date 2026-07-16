/**
 * User Messages — two-way chat with vendors.
 * Left panel: thread list. Right panel: full conversation.
 */
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FallbackImage } from "@/components/FallbackImage";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface Thread {
  vendorId: number;
  vendorName: string;
  vendorImage: string | null;
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

export default function UserMessagesPage() {
  const { isAuthenticated, role } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Redirect non-customers
  useEffect(() => {
    if (!isAuthenticated || role !== "user") setLocation("/auth/user");
  }, [isAuthenticated, role, setLocation]);

  const { data: threads, isLoading: threadsLoading } = useQuery<Thread[]>({
    queryKey: ["user-message-threads"],
    queryFn: () => customFetch("/api/user/messages"),
    refetchInterval: 10_000,
  });

  const { data: messages, isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["user-message-thread", selectedVendorId],
    queryFn: () => customFetch(`/api/user/messages/${selectedVendorId}`),
    enabled: !!selectedVendorId,
    refetchInterval: 5_000,
  });

  const sendMsg = useMutation({
    mutationFn: (content: string) =>
      customFetch(`/api/user/messages/${selectedVendorId}`, {
        method: "POST",
        body: JSON.stringify({ content }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["user-message-thread", selectedVendorId] });
      qc.invalidateQueries({ queryKey: ["user-message-threads"] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedThread = threads?.find((t) => t.vendorId === selectedVendorId);

  if (!isAuthenticated || role !== "user") return null;

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} className="gap-2 font-mono">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
          <h1 className="text-2xl font-serif font-bold">Messages</h1>
        </div>

        <div className="flex gap-4 h-[calc(100vh-16rem)]">
          {/* Thread list */}
          <aside className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">
            {threadsLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
              : threads && threads.length > 0
              ? threads.map((t) => (
                  <button
                    key={t.vendorId}
                    onClick={() => setSelectedVendorId(t.vendorId)}
                    className={cn(
                      "w-full text-left rounded-lg border p-3 flex gap-3 items-start transition-colors",
                      selectedVendorId === t.vendorId
                        ? "bg-primary/10 border-primary/30"
                        : "bg-card border-border hover:bg-muted/50"
                    )}
                  >
                    <FallbackImage
                      src={t.vendorImage ?? undefined}
                      fallback="vendor"
                      alt={t.vendorName}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-medium truncate text-sm">{t.vendorName}</span>
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
                    </div>
                  </button>
                ))
              : (
                  <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground gap-2">
                    <MessageSquare className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No messages yet.</p>
                    <p className="text-xs">Start a conversation from any restaurant page.</p>
                  </div>
                )}
          </aside>

          {/* Chat panel */}
          <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-card">
            {selectedThread ? (
              <>
                <div className="px-4 py-3 border-b border-border bg-muted/30 flex gap-3 items-center">
                  <FallbackImage
                    src={selectedThread.vendorImage ?? undefined}
                    fallback="vendor"
                    alt={selectedThread.vendorName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <p className="font-medium">{selectedThread.vendorName}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {msgsLoading
                    ? <Skeleton className="h-10 w-48" />
                    : messages?.map((m) => (
                        <div
                          key={m.id}
                          className={cn("flex", m.senderRole === "user" ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] px-3 py-2 rounded-2xl text-sm",
                              m.senderRole === "user"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                            )}
                          >
                            <p>{m.content}</p>
                            <p className={cn("text-[10px] mt-1", m.senderRole === "user" ? "text-primary-foreground/60" : "text-muted-foreground")}>
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
                <p className="text-sm max-w-xs">Choose a restaurant on the left to read and reply to their messages.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
