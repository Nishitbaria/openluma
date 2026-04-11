"use client";

import { useChat } from "@ai-sdk/react";
import { useState, Fragment } from "react";
import { format } from "date-fns";
import {
  User,
  Loader2,
  Sparkles,
  Bot,
  RefreshCcw,
  Copy,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  Globe,
  Lock,
  Link2,
  Edit,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
} from "@/components/ai-elements/artifact";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import type { UIMessage } from "ai";
import { toast } from "sonner";

const suggestions = [
  "Create a tech meetup for next Friday at 6pm",
  "List my upcoming events",
  "Search for events about AI",
  "How many people are attending my latest event?",
];

export function ChatPanel() {
  const { messages, setMessages, sendMessage, status, regenerate } = useChat();
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

  return (
    <div className="flex flex-1 flex-col rounded-lg border bg-background h-full">
      {messages.length > 0 && (
        <div className="flex items-center justify-end px-4 py-2 border-b">
          <button
            type="button"
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </button>
        </div>
      )}
      <div className="flex flex-col flex-1 min-h-0">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 && (
              <ConversationEmptyState
                title="OpenLuma AI Assistant"
                description="I can help you create events, manage RSVPs, send invitations, and more."
                icon={<Bot className="h-8 w-8 text-primary" />}
              >
                <div className="grid grid-cols-2 gap-2 mt-4 max-w-lg mx-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSuggestion(s)}
                      className="text-left text-sm rounded-lg border px-3 py-2 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </ConversationEmptyState>
            )}

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
                    <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              }

              // Assistant message
              const isLast = messageIndex === messages.length - 1;

              // Collect text parts
              const textParts = message.parts
                .map((p, idx) => ({ part: p, idx }))
                .filter(
                  ({ part }) =>
                    part.type === "text" &&
                    (part as { text: string }).text?.trim(),
                );

              // Extract artifacts from tool outputs
              const artifacts = extractArtifacts(message.parts);

              // Check if tools are still running
              const hasRunningTool = message.parts.some(
                (p) =>
                  p.type.startsWith("tool-") &&
                  (p as { state?: string }).state !== "output-available" &&
                  (p as { state?: string }).state !== "result",
              );

              const lastTextIdx =
                textParts.length > 0
                  ? textParts[textParts.length - 1].idx
                  : -1;

              return (
                <div key={message.id} className="flex gap-3 items-start">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-primary flex items-center justify-center mt-1">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Working indicator */}
                    {hasRunningTool && isLast && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                        <Sparkles className="h-3 w-3" />
                        <span>Working on it...</span>
                      </div>
                    )}

                    {/* Text responses */}
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

                          {/* Artifacts rendered right after text, before actions */}
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

                    {/* Loading: no text yet */}
                    {isLast && textParts.length === 0 && isLoading && !hasRunningTool && (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
                <div className="h-8 w-8 shrink-0 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="p-4 border-t">
          <PromptInput
            onSubmit={handleSubmit}
            className="w-full max-w-3xl mx-auto"
          >
            <PromptInputBody>
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder="Ask me anything about your events..."
              />
            </PromptInputBody>
            <PromptInputFooter>
              <div />
              <PromptInputSubmit
                status={isLoading ? "streaming" : "ready"}
                disabled={!input.trim() && !isLoading}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

// ─── Artifact Types ──────────────────────────────────────────────────────────

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

// ─── Artifact Extraction ─────────────────────────────────────────────────────

function extractArtifacts(parts: UIMessage["parts"]): ChatArtifact[] {
  const artifacts: ChatArtifact[] = [];

  for (const part of parts) {
    if (!part.type.startsWith("tool-")) continue;

    const toolPart = part as Record<string, unknown>;
    const state = toolPart.state as string | undefined;
    if (state !== "output-available" && state !== "result") continue;

    const output = (toolPart.output ?? toolPart.result) as Record<string, unknown> | undefined;
    if (!output) continue;

    // From orchestrator: output.artifacts array
    const partArtifacts = output.artifacts as Array<{ type: string; data: unknown }> | undefined;
    if (partArtifacts) {
      for (const a of partArtifacts) {
        if (a.type === "event-created" && a.data) {
          artifacts.push({
            kind: "event-created",
            event: parseEventData(a.data as Record<string, unknown>),
          });
        }
        if (a.type === "event-list" && Array.isArray(a.data)) {
          artifacts.push({
            kind: "event-list",
            events: (a.data as Record<string, unknown>[]).map(parseEventData),
          });
        }
      }
    }

    // Direct tool result
    if (output.success && output.event) {
      artifacts.push({
        kind: "event-created",
        event: parseEventData(output.event as Record<string, unknown>),
      });
    }
    if (output.events && Array.isArray(output.events) && (output.events as unknown[]).length > 0) {
      artifacts.push({
        kind: "event-list",
        events: (output.events as Record<string, unknown>[]).map(parseEventData),
      });
    }
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

// ─── Artifact Cards ──────────────────────────────────────────────────────────

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
          <ArtifactTitle>
            Your Events ({events.length})
          </ArtifactTitle>
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
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
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
