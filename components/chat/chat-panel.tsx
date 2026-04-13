"use client";

import { useChat } from "@ai-sdk/react";
import { code } from "@streamdown/code";
import type { UIMessage } from "ai";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { format } from "date-fns";
import {
  Bot,
  Calendar,
  Copy,
  Edit,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Plus,
  RefreshCcw,
  Sparkles,
  SquarePen,
  User,
  Users,
} from "lucide-react";
import { Fragment, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const suggestions = [
  { icon: Plus, label: "Create a tech meetup for next Friday at 6pm" },
  { icon: Calendar, label: "List my upcoming events" },
  { icon: Globe, label: "Search for events about AI" },
  { icon: Users, label: "How many people are attending my latest event?" },
];

export function ChatPanel() {
  const { messages, setMessages, sendMessage, status, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");

  function handleSubmit(message: PromptInputMessage) {
    if (!message.text?.trim()) return;
    sendMessage({ text: message.text });
    setInput("");
  }

  function handleSuggestion(text: string) {
    sendMessage({ text });
  }

  const isLoading = status === "streaming" || status === "submitted";
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header — only show New Chat when there are messages */}
      {!isEmpty && (
        <div className="flex items-center justify-end border-b px-4 py-2">
          <button
            type="button"
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <SquarePen className="size-3.5" />
            New chat
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="relative flex flex-1 flex-col min-h-0">
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
            <div className="text-center">
              <Sparkles className="mx-auto mb-3 size-8 text-primary" />
              <h2 className="text-xl font-semibold">How can I help you?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask me to create events, manage RSVPs, or send invitations.
              </p>
            </div>
            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => handleSuggestion(s.label)}
                  className="flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent"
                >
                  <s.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Conversation>
            <ConversationContent className="px-4 py-6 max-w-3xl mx-auto w-full">
              {messages.map((message: UIMessage, messageIndex: number) => {
                if (message.role === "user") {
                  const textPart = message.parts.find(
                    (p) => p.type === "text",
                  ) as { text: string } | undefined;
                  if (!textPart) return null;
                  return (
                    <div key={message.id} className="flex gap-3 justify-end">
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
                  .map((p, idx) => ({ part: p, idx }))
                  .filter(
                    ({ part }) =>
                      part.type === "text" &&
                      (part as { text: string }).text?.trim(),
                  );

                const artifacts = extractArtifacts(message.parts);
                const hasRunningTool = message.parts.some(
                  (p) =>
                    isToolUIPart(p) &&
                    p.state !== "output-available" &&
                    p.state !== "output-error",
                );
                const lastTextIdx =
                  textParts.length > 0
                    ? textParts[textParts.length - 1].idx
                    : -1;

                return (
                  <div key={message.id} className="flex gap-3 items-start">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <Bot className="size-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      {hasRunningTool && isLast && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                          <Sparkles className="size-3" />
                          <span>Working on it...</span>
                        </div>
                      )}
                      {textParts.map(({ part, idx }) => {
                        const text = (part as { text: string }).text;
                        const isLastText = idx === lastTextIdx;
                        const isStreaming =
                          status === "streaming" && isLast && isLastText;

                        return (
                          <Fragment key={`${message.id}-${idx}`}>
                            <Message from="assistant">
                              <MessageContent>
                                <Streamdown
                                  plugins={{ code }}
                                  animated={isStreaming}
                                  linkSafety={{ enabled: false }}
                                >
                                  {text}
                                </Streamdown>
                              </MessageContent>
                            </Message>
                            {isLastText && artifacts.length > 0 && (
                              <div className="space-y-2">
                                {artifacts.map((artifact, aIdx) => (
                                  <ArtifactCard
                                    key={`artifact-${aIdx}`}
                                    artifact={artifact}
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
                            <span className="text-sm text-muted-foreground">
                              Processing your request...
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}

              {status === "submitted" && (
                <div className="flex gap-3 items-start">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Bot className="size-4 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
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
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-3xl"
        >
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="Ask me anything about your events..."
              className="overflow-x-hidden"
            />
          </PromptInputBody>
          <PromptInputFooter className="border-t-0">
            <PromptInputTools>
              <span className="text-xs text-muted-foreground">
                <kbd className="rounded border px-1 font-mono text-[10px]">
                  Enter
                </kbd>{" "}
                to send
              </span>
            </PromptInputTools>
            <PromptInputSubmit
              status={isLoading ? "streaming" : "ready"}
              disabled={!input.trim() && !isLoading}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

// ─── Artifact Types ───────────────────────────────────────────────────────────

interface EventData {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  eventType?: string;
  visibility?: string;
  capacity?: number | null;
  type?: string;
}

interface EventCreatedArtifactType {
  kind: "event-created";
  event: EventData;
}

interface EventListArtifactType {
  kind: "event-list";
  events: EventData[];
}

type ChatArtifact = EventCreatedArtifactType | EventListArtifactType;

function extractArtifacts(parts: UIMessage["parts"]): ChatArtifact[] {
  const artifacts: ChatArtifact[] = [];
  for (const part of parts) {
    if (!isToolUIPart(part)) continue;
    if (part.state !== "output-available") continue;
    const output = part.output as Record<string, unknown> | undefined;
    if (!output) continue;
    const partArtifacts = output.artifacts as
      | Array<{ type: string; data: unknown }>
      | undefined;
    if (partArtifacts) {
      for (const a of partArtifacts) {
        if (a.type === "event-created" && a.data)
          artifacts.push({
            kind: "event-created",
            event: parseEventData(a.data as Record<string, unknown>),
          });
        if (a.type === "event-list" && Array.isArray(a.data))
          artifacts.push({
            kind: "event-list",
            events: (a.data as Record<string, unknown>[]).map(parseEventData),
          });
      }
    }
    if (output.success && output.event)
      artifacts.push({
        kind: "event-created",
        event: parseEventData(output.event as Record<string, unknown>),
      });
    if (
      output.events &&
      Array.isArray(output.events) &&
      (output.events as unknown[]).length > 0
    )
      artifacts.push({
        kind: "event-list",
        events: (output.events as Record<string, unknown>[]).map(
          parseEventData,
        ),
      });
  }
  return artifacts;
}

function parseEventData(d: Record<string, unknown>): EventData {
  return {
    id: String(d.id ?? ""),
    title: String(d.title ?? "Untitled"),
    description: (d.description as string | null) ?? null,
    startTime: String(d.startTime ?? ""),
    endTime: (d.endTime as string | null) ?? null,
    location: (d.location as string | null) ?? null,
    eventType: (d.type as string) ?? (d.eventType as string) ?? "in_person",
    visibility: (d.visibility as string) ?? "public",
    capacity: (d.capacity as number | null) ?? null,
  };
}

function ArtifactCard({ artifact }: { artifact: ChatArtifact }) {
  if (artifact.kind === "event-created")
    return <EventCreatedCard event={artifact.event} />;
  if (artifact.kind === "event-list")
    return <EventListCard events={artifact.events} />;
  return null;
}

function EventCreatedCard({ event }: { event: EventData }) {
  const startDate = new Date(event.startTime);
  const endDate = event.endTime ? new Date(event.endTime) : null;
  const eventUrl = `/events/${event.id}`;
  const dashboardUrl = `/dashboard/events/${event.id}`;

  return (
    <Artifact className="max-w-md">
      <ArtifactHeader>
        <div className="flex-1 min-w-0">
          <ArtifactTitle>{event.title}</ArtifactTitle>
          <ArtifactDescription>Event created successfully</ArtifactDescription>
        </div>
        <ArtifactActions>
          <ArtifactAction
            tooltip="Copy link"
            icon={Link2}
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}${eventUrl}`,
              );
              toast.success("Event link copied!");
            }}
          />
          <ArtifactAction
            tooltip="Edit event"
            icon={Edit}
            onClick={() => window.open(`${dashboardUrl}/edit`, "_blank")}
          />
          <ArtifactAction
            tooltip="View event"
            icon={ExternalLink}
            onClick={() => window.open(eventUrl, "_blank")}
          />
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium">
              {format(startDate, "EEEE, MMMM d, yyyy")}
            </p>
            <p className="text-muted-foreground text-xs">
              {format(startDate, "h:mm a")}
              {endDate && ` – ${format(endDate, "h:mm a")}`}
            </p>
          </div>
        </div>
        {event.location && (
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <p>{event.location}</p>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={event.visibility === "public" ? "default" : "secondary"}
            className="text-xs"
          >
            {event.visibility === "public" ? (
              <Globe className="mr-1 h-3 w-3" />
            ) : (
              <Lock className="mr-1 h-3 w-3" />
            )}
            {event.visibility}
          </Badge>
          {event.eventType && (
            <Badge variant="outline" className="text-xs">
              {event.eventType.replace("_", " ")}
            </Badge>
          )}
          {event.capacity != null && (
            <Badge variant="outline" className="text-xs">
              <Users className="mr-1 h-3 w-3" />
              {event.capacity} spots
            </Badge>
          )}
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}
      </ArtifactContent>
    </Artifact>
  );
}

function EventListCard({ events }: { events: EventData[] }) {
  return (
    <Artifact className="max-w-md">
      <ArtifactHeader>
        <div className="flex-1 min-w-0">
          <ArtifactTitle>Your Events ({events.length})</ArtifactTitle>
        </div>
      </ArtifactHeader>
      <ArtifactContent className="p-0">
        <div className="divide-y">
          {events.map((event) => {
            const startDate = new Date(event.startTime);
            const eventUrl = `/events/${event.id}`;
            return (
              <a
                key={event.id}
                href={eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(startDate, "MMM d, yyyy · h:mm a")}
                    {event.location && ` · ${event.location}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    variant={
                      event.visibility === "public" ? "default" : "secondary"
                    }
                    className="text-xs"
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
