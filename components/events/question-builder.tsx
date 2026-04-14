"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type QuestionType = "text" | "paragraph" | "checkbox" | "dropdown";

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  order: number;
  options: string[] | null;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  text: "Short Text",
  paragraph: "Paragraph",
  checkbox: "Checkbox (Yes/No)",
  dropdown: "Dropdown",
};

export function QuestionBuilder({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/questions`)
      .then((r) => r.json())
      .then(setQuestions)
      .catch(() => toast.error("Failed to load questions"))
      .finally(() => setLoading(false));
  }, [eventId]);

  async function addQuestion() {
    const newOrder = questions.length;
    const res = await fetch(`/api/events/${eventId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "New question", type: "text", required: false, order: newOrder }),
    });
    if (!res.ok) { toast.error("Failed to add question"); return; }
    const q = await res.json();
    setQuestions((prev) => [...prev, q]);
  }

  async function updateQuestion(id: string, patch: Partial<Question>) {
    setSaving(id);
    const res = await fetch(`/api/events/${eventId}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) { toast.error("Failed to save"); setSaving(null); return; }
    const updated = await res.json();
    setQuestions((prev) => prev.map((q) => (q.id === id ? updated : q)));
    setSaving(null);
    router.refresh();
  }

  async function deleteQuestion(id: string) {
    const res = await fetch(`/api/events/${eventId}/questions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    router.refresh();
  }

  async function moveQuestion(index: number, direction: "up" | "down") {
    const newList = [...questions];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    const reordered = newList.map((q, i) => ({ ...q, order: i }));
    setQuestions(reordered);
    // persist new orders
    await Promise.all(
      reordered.map((q) =>
        fetch(`/api/events/${eventId}/questions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: q.id, order: q.order }),
        }),
      ),
    );
    router.refresh();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading questions...</p>;

  return (
    <div className="space-y-4">
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
          No questions yet. Add one below to collect info from attendees.
        </p>
      )}

      {questions.map((q, index) => (
        <div key={q.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline">{TYPE_LABELS[q.type]}</Badge>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={index === 0}
                onClick={() => moveQuestion(index, "up")}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={index === questions.length - 1}
                onClick={() => moveQuestion(index, "down")}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteQuestion(q.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Question label</Label>
            <Input
              value={q.label}
              onChange={(e) =>
                setQuestions((prev) =>
                  prev.map((x) => (x.id === q.id ? { ...x, label: e.target.value } : x)),
                )
              }
              onBlur={() => updateQuestion(q.id, { label: q.label })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select
                value={q.type}
                onValueChange={(val) =>
                  updateQuestion(q.id, { type: val as QuestionType, options: val === "dropdown" ? q.options ?? [] : null })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Switch
                id={`required-${q.id}`}
                checked={q.required}
                onCheckedChange={(checked) => updateQuestion(q.id, { required: checked })}
              />
              <Label htmlFor={`required-${q.id}`} className="text-xs text-muted-foreground">
                Required
              </Label>
            </div>
          </div>

          {q.type === "dropdown" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Options (one per line)
              </Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={(q.options ?? []).join("\n")}
                onChange={(e) =>
                  setQuestions((prev) =>
                    prev.map((x) =>
                      x.id === q.id
                        ? { ...x, options: e.target.value.split("\n").filter(Boolean) }
                        : x,
                    ),
                  )
                }
                onBlur={() => updateQuestion(q.id, { options: q.options })}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>
          )}

          {saving === q.id && (
            <p className="text-xs text-muted-foreground">Saving...</p>
          )}
        </div>
      ))}

      <Button variant="outline" onClick={addQuestion} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Question
      </Button>
    </div>
  );
}
