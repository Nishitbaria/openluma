"use client";

import { useChat } from "@ai-sdk/react";
import { code } from "@streamdown/code";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { format } from "date-fns";
import {
  AlertTriangle,
  Bot,
  Calendar,
  Copy,
  Edit,
  ExternalLink,
  Globe,
  History,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Plus,
  RefreshCcw,
  Sparkles,
  SquarePen,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { Fragment, useRef, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { ChatHistorySheet } from "@/components/chat/chat-history-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { OrchestratorMessage } from "@/lib/ai/agents/orchestrator";

const suggestions = [
  { icon: Plus, label: "Create a tech meetup for next Friday at 6pm" },
  { icon: Calendar, label: "List my upcoming events" },
  { icon: Globe, label: "Search for events about AI" },
  { icon: Users, label: "How many people are attending my latest event?" },
];

export function ChatPanel({
  conversationId,
  initialMessages,
}: {
  conversationId?: string;
  initialMessages?: OrchestratorMessage[];
} = {}) {
  // Track a client-side "New chat" reset. Bumping this key remounts
  // ChatSession with a fresh useChat instance instantly — no server round-trip.
  const [newChatKey, setNewChatKey] = useState<number | null>(null);
  const inNewChat = newChatKey !== null;

  return (
    <ChatSession
      conversationId={inNewChat ? undefined : conversationId}
      initialMessages={inNewChat ? undefined : initialMessages}
      key={inNewChat ? `new-${newChatKey}` : (conversationId ?? "root")}
      onNewChat={() => {
        // Swap the URL without a Next.js navigation, then remount locally.
        window.history.replaceState(null, "", "/dashboard/chat");
        setNewChatKey((k) => (k ?? 0) + 1);
      }}
    />
  );
}

function ChatSession({
  conversationId,
  initialMessages,
  onNewChat,
}: {
  conversationId?: string;
  initialMessages?: OrchestratorMessage[];
  onNewChat: () => void;
}) {
  const {
    id: chatId,
    messages,
    sendMessage,
    status,
    regenerate,
    addToolApprovalResponse,
  } = useChat<OrchestratorMessage>({
    id: conversationId,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const hasSyncedUrl = useRef(false);

  // On a brand-new chat, reflect the generated conversation id in the URL
  // without a Next.js route transition — a real navigation would remount
  // the panel and drop the in-flight stream.
  function syncUrlIfNewChat() {
    if (!(conversationId || hasSyncedUrl.current)) {
      hasSyncedUrl.current = true;
      window.history.replaceState(null, "", `/dashboard/chat/${chatId}`);
    }
  }

  function handleSubmit(message: PromptInputMessage) {
    if (!message.text.trim()) {
      return;
    }
    syncUrlIfNewChat();
    sendMessage({ text: message.text });
    setInput("");
  }

  function handleSuggestion(text: string) {
    syncUrlIfNewChat();
    sendMessage({ text });
  }

  const isLoading = status === "streaming" || status === "submitted";
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-end gap-1 border-b px-4 py-2">
        <Button
          className="text-muted-foreground text-xs hover:text-foreground"
          onClick={() => setHistoryOpen(true)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <History className="size-4" />
          History
        </Button>
        {!isEmpty && (
          <Button
            className="text-muted-foreground text-xs hover:text-foreground"
            onClick={onNewChat}
            size="sm"
            type="button"
            variant="ghost"
          >
            <SquarePen className="size-4" />
            New chat
          </Button>
        )}
      </div>
      <ChatHistorySheet
        activeConversationId={conversationId}
        onOpenChange={setHistoryOpen}
        open={historyOpen}
      />

      {/* Messages area */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
            <div className="text-center">
              <Sparkles className="mx-auto mb-3 size-8 text-primary" />
              <h2 className="font-semibold text-xl">How can I help you?</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Ask me to create events, manage RSVPs, or send invitations.
              </p>
            </div>
            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  className="flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent"
                  key={s.label}
                  onClick={() => handleSuggestion(s.label)}
                  type="button"
                >
                  <s.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Conversation>
            <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6">
              {messages.map((message, messageIndex) => {
                if (message.role === "user") {
                  const textPart = message.parts.find(
                    (p) => p.type === "text"
                  ) as { text: string } | undefined;
                  if (!textPart) {
                    return null;
                  }
                  return (
                    <div className="flex justify-end gap-3" key={message.id}>
                      <Message from="user">
                        <MessageContent>
                          <p className="whitespace-pre-wrap">{textPart.text}</p>
                        </MessageContent>
                      </Message>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                }

                const isLast = messageIndex === messages.length - 1;
                const textParts = message.parts
                  .map((p, idx) => ({ idx, part: p }))
                  .filter(
                    ({ part }) =>
                      part.type === "text" &&
                      (part as { text: string }).text.trim()
                  );

                const artifacts = extractArtifacts(message.parts);
                const approvalParts = message.parts.filter(
                  (p) => isToolUIPart(p) && p.state === "approval-requested"
                );
                const hasRunningTool = message.parts.some(
                  (p) =>
                    isToolUIPart(p) &&
                    p.state !== "output-available" &&
                    p.state !== "output-error" &&
                    p.state !== "approval-requested"
                );
                const lastTextIdx = textParts.at(-1)?.idx ?? -1;

                return (
                  <div className="flex items-start gap-3" key={message.id}>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <Bot className="size-4 text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      {hasRunningTool && isLast ? (
                        <div className="flex animate-pulse items-center gap-2 text-muted-foreground text-xs">
                          <Sparkles className="size-3" />
                          <span>Working on it...</span>
                        </div>
                      ) : null}
                      {approvalParts.map((part, idx) => {
                        const toolName = getToolName(part);
                        const { input: toolInput } = part as {
                          input: Record<string, unknown>;
                        };
                        const { toolCallId } = part as { toolCallId: string };

                        let actionText = "";
                        if (toolName === "deleteEvent") {
                          actionText = `Permanently delete "${toolInput.eventTitle || "this event"}"?`;
                        } else if (toolName === "sendInvitation") {
                          actionText = `Send invitation to "${toolInput.email}"${toolInput.eventTitle ? ` for "${toolInput.eventTitle}"` : ""}?`;
                        } else {
                          return null;
                        }

                        return (
                          <ApprovalCard
                            actionText={actionText}
                            key={`approval-${toolCallId}-${idx}`}
                            onCancel={() =>
                              addToolApprovalResponse({
                                approved: false,
                                id: toolCallId,
                              })
                            }
                            onConfirm={() =>
                              addToolApprovalResponse({
                                approved: true,
                                id: toolCallId,
                              })
                            }
                          />
                        );
                      })}
                      {textParts.map(({ part, idx }) => {
                        const { text } = part as { text: string };
                        const isLastText = idx === lastTextIdx;
                        const isStreaming =
                          status === "streaming" && isLast && isLastText;

                        return (
                          <Fragment key={`${message.id}-${idx}`}>
                            <Message from="assistant">
                              <MessageContent>
                                <Streamdown
                                  animated={isStreaming}
                                  linkSafety={{ enabled: false }}
                                  plugins={{ code }}
                                >
                                  {text}
                                </Streamdown>
                              </MessageContent>
                            </Message>
                            {isLastText && artifacts.length > 0 && (
                              <div className="space-y-2">
                                {artifacts.map((artifact, aIdx) => (
                                  <ArtifactCard
                                    artifact={artifact}
                                    key={`artifact-${aIdx}`}
                                  />
                                ))}
                              </div>
                            )}
                            {isLast &&
                              isLastText &&
                              status !== "streaming" &&
                              status !== "submitted" && (
                                <MessageActions>
                                  <MessageAction
                                    onClick={() => regenerate()}
                                    tooltip="Regenerate"
                                  >
                                    <RefreshCcw className="size-3" />
                                  </MessageAction>
                                  <MessageAction
                                    onClick={() =>
                                      navigator.clipboard.writeText(text)
                                    }
                                    tooltip="Copy"
                                  >
                                    <Copy className="size-3" />
                                  </MessageAction>
                                </MessageActions>
                              )}
                          </Fragment>
                        );
                      })}
                      {isLast &&
                        textParts.length === 0 &&
                        isLoading &&
                        !hasRunningTool && (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            <span className="text-muted-foreground text-sm">
                              Processing your request...
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}

              {status === "submitted" && (
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Bot className="size-4 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">
                      Thinking...
                    </span>
                  </div>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t px-4 py-3">
        <PromptInput
          className="mx-auto w-full max-w-3xl"
          onSubmit={handleSubmit}
        >
          <PromptInputBody>
            <PromptInputTextarea
              className="overflow-x-hidden"
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="Ask me anything about your events..."
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter className="border-t-0">
            <PromptInputTools>
              <span className="text-muted-foreground text-xs">
                <kbd className="rounded border px-1 font-mono text-[10px]">
                  Enter
                </kbd>{" "}
                to send
              </span>
            </PromptInputTools>
            <PromptInputSubmit
              disabled={!(input.trim() || isLoading)}
              status={isLoading ? "streaming" : "ready"}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

// ─── Artifact Types ───────────────────────────────────────────────────────────

interface EventData {
  capacity?: number | null;
  description?: string | null;
  endTime?: string | null;
  eventType?: string;
  id: string;
  location?: string | null;
  requiresApproval?: boolean;
  slug?: string;
  startTime: string;
  title: string;
  type?: string;
  visibility?: string;
}

interface EventCreatedArtifactType {
  event: EventData;
  kind: "event-created";
}

interface EventListArtifactType {
  events: EventData[];
  kind: "event-list";
}

type ChatArtifact = EventCreatedArtifactType | EventListArtifactType;

function ApprovalCard({
  actionText,
  onConfirm,
  onCancel,
}: {
  actionText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-sm">Confirm action</p>
          <p className="text-muted-foreground text-sm">{actionText}</p>
        </div>
      </div>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive">
            Review action
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
            <DialogDescription>{actionText}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setOpen(false);
                onCancel();
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
              variant="destructive"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: parses several distinct artifact shapes (event-created, event-list, tool outputs) from a union of message parts; the branches map 1:1 to artifact variants
function extractArtifacts(parts: OrchestratorMessage["parts"]): ChatArtifact[] {
  const artifacts: ChatArtifact[] = [];
  for (const part of parts) {
    if (!isToolUIPart(part)) {
      continue;
    }
    if (part.state !== "output-available") {
      continue;
    }
    const output = part.output as Record<string, unknown> | undefined;
    if (!output) {
      continue;
    }
    const partArtifacts = output.artifacts as
      | Array<{ type: string; data: unknown }>
      | undefined;
    if (partArtifacts) {
      for (const a of partArtifacts) {
        if (a.type === "event-created" && a.data) {
          artifacts.push({
            event: parseEventData(a.data as Record<string, unknown>),
            kind: "event-created",
          });
        }
        if (a.type === "event-list" && Array.isArray(a.data)) {
          artifacts.push({
            events: (a.data as Record<string, unknown>[]).map(parseEventData),
            kind: "event-list",
          });
        }
      }
    }
    if (output.success && output.event) {
      artifacts.push({
        event: parseEventData(output.event as Record<string, unknown>),
        kind: "event-created",
      });
    }
    if (
      output.events &&
      Array.isArray(output.events) &&
      (output.events as unknown[]).length > 0
    ) {
      artifacts.push({
        events: (output.events as Record<string, unknown>[]).map(
          parseEventData
        ),
        kind: "event-list",
      });
    }
  }
  return artifacts;
}

function parseEventData(d: Record<string, unknown>): EventData {
  return {
    capacity: (d.capacity as number | null) ?? null,
    description: (d.description as string | null) ?? null,
    endTime: (d.endTime as string | null) ?? null,
    eventType:
      (d.type as string | undefined) ??
      (d.eventType as string | undefined) ??
      "in_person",
    id: String(d.id ?? ""),
    location: (d.location as string | null) ?? null,
    requiresApproval: (d.requiresApproval as boolean | undefined) ?? undefined,
    startTime: String(d.startTime ?? ""),
    title: String(d.title ?? "Untitled"),
    visibility: (d.visibility as string | undefined) ?? "public",
  };
}

function ArtifactCard({ artifact }: { artifact: ChatArtifact }) {
  if (artifact.kind === "event-created") {
    return <EventCreatedCard event={artifact.event} />;
  }
  if (artifact.kind === "event-list") {
    return <EventListCard events={artifact.events} />;
  }
  return null;
}

function EventCreatedCard({ event }: { event: EventData }) {
  const startDate = new Date(event.startTime);
  const endDate = event.endTime ? new Date(event.endTime) : null;
  const eventUrl = event.slug ? `/e/${event.slug}` : `/events/${event.id}`;
  const dashboardUrl = `/dashboard/events/${event.id}`;

  return (
    <Artifact className="max-w-md">
      <ArtifactHeader>
        <div className="min-w-0 flex-1">
          <ArtifactTitle>{event.title}</ArtifactTitle>
          <ArtifactDescription>Event created successfully</ArtifactDescription>
        </div>
        <ArtifactActions>
          <ArtifactAction
            icon={Link2}
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}${eventUrl}`
              );
              toast.success("Event link copied!");
            }}
            tooltip="Copy link"
          />
          <ArtifactAction
            icon={Edit}
            onClick={() => window.open(`${dashboardUrl}/edit`, "_blank")}
            tooltip="Edit event"
          />
          <ArtifactAction
            icon={ExternalLink}
            onClick={() => window.open(eventUrl, "_blank")}
            tooltip="View event"
          />
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {format(startDate, "EEEE, MMMM d, yyyy")}
            </p>
            <p className="text-muted-foreground text-xs">
              {format(startDate, "h:mm a")}
              {endDate ? ` – ${format(endDate, "h:mm a")}` : null}
            </p>
          </div>
        </div>
        {event.location ? (
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p>{event.location}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="text-xs"
            variant={event.visibility === "public" ? "default" : "secondary"}
          >
            {event.visibility === "public" ? (
              <Globe className="mr-1 h-3 w-3" />
            ) : (
              <Lock className="mr-1 h-3 w-3" />
            )}
            {event.visibility}
          </Badge>
          {event.eventType ? (
            <Badge className="text-xs" variant="outline">
              {event.eventType.replace("_", " ")}
            </Badge>
          ) : null}
          {event.capacity !== null && (
            <Badge className="text-xs" variant="outline">
              <Users className="mr-1 h-3 w-3" />
              {event.capacity} spots
            </Badge>
          )}
          {event.requiresApproval ? (
            <Badge className="text-xs" variant="outline">
              <UserCheck className="mr-1 h-3 w-3" />
              Approval required
            </Badge>
          ) : null}
        </div>
        {event.description ? (
          <p className="line-clamp-2 text-muted-foreground text-xs">
            {event.description}
          </p>
        ) : null}
      </ArtifactContent>
    </Artifact>
  );
}

function EventListCard({ events }: { events: EventData[] }) {
  return (
    <Artifact className="max-w-md">
      <ArtifactHeader>
        <div className="min-w-0 flex-1">
          <ArtifactTitle>Your Events ({events.length})</ArtifactTitle>
        </div>
      </ArtifactHeader>
      <ArtifactContent className="p-0">
        <div className="divide-y">
          {events.map((event) => {
            const startDate = new Date(event.startTime);
            const eventUrl = event.slug
              ? `/e/${event.slug}`
              : `/events/${event.id}`;
            return (
              <a
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                href={eventUrl}
                key={event.id}
                rel="noopener noreferrer"
                target="_blank"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{event.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {format(startDate, "MMM d, yyyy · h:mm a")}
                    {event.location ? ` · ${event.location}` : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge
                    className="text-xs"
                    variant={
                      event.visibility === "public" ? "default" : "secondary"
                    }
                  >
                    {event.visibility}
                  </Badge>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </a>
            );
          })}
        </div>
      </ArtifactContent>
    </Artifact>
  );
}
