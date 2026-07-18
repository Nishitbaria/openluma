"use client";

import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteConversationAction,
  listConversationsAction,
} from "@/actions/chat";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"];

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: Date;
}

export function ChatHistorySheet({
  open,
  onOpenChange,
  activeConversationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeConversationId?: string;
}) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] =
    useState<ConversationSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listConversationsAction()
      .then(setConversations)
      .catch(() => toast.error("Failed to load conversations"))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    // Optimistic: drop it from the list and close the dialog immediately.
    // Snapshot the list to restore on failure. Check the live pathname too: a
    // freshly-created chat updates the URL via history.replaceState without
    // updating the activeConversationId prop.
    const snapshot = conversations;
    const isViewingDeleted =
      target.id === activeConversationId ||
      pathname === `/dashboard/chat/${target.id}`;
    setConversations((prev) => prev.filter((c) => c.id !== target.id));
    setPendingDelete(null);
    setDeleting(true);
    try {
      await deleteConversationAction(target.id);
      if (isViewingDeleted) {
        // Hard navigation, not router.push: a freshly-created chat set its URL
        // via history.replaceState, so Next's router still thinks it's on
        // /dashboard/chat — a push would be a no-op that leaves the deleted
        // conversation's ChatPanel (and its in-memory messages) mounted. A full
        // load guarantees the default chat interface renders. Return so the
        // component isn't touched again while the page unloads.
        onOpenChange(false);
        window.location.href = "/dashboard/chat";
        return;
      }
    } catch {
      // Roll back the optimistic removal.
      setConversations(snapshot);
      toast.error("Failed to delete conversation");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle>Chat history</SheetTitle>
            <SheetDescription>Your past conversations</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <ul className="p-2">
                {SKELETON_ROWS.map((key) => (
                  <li key={key} className="flex flex-col gap-1.5 px-2.5 py-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </li>
                ))}
              </ul>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <MessageSquare className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs text-muted-foreground">
                  Start chatting and your conversations will appear here.
                </p>
              </div>
            ) : (
              <ul className="p-2">
                {conversations.map((conversation) => (
                  <li
                    key={conversation.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-md transition-colors hover:bg-accent",
                      conversation.id === activeConversationId && "bg-accent",
                    )}
                  >
                    <Link
                      href={`/dashboard/chat/${conversation.id}`}
                      onClick={() => onOpenChange(false)}
                      className="min-w-0 flex-1 px-2.5 py-2"
                    >
                      <p className="truncate text-sm">{conversation.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.updatedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDelete(conversation)}
                      className="mr-1 size-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label={`Delete "${conversation.title}"`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(dialogOpen) => {
          if (!dialogOpen) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{pendingDelete?.title}
              &quot;? Its messages will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
