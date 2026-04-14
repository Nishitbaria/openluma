"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export interface EventQuestion {
  id: string;
  label: string;
  type: "text" | "paragraph" | "checkbox" | "dropdown";
  required: boolean;
  options: string[] | null;
}

interface RsvpQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: EventQuestion[];
  onSubmit: (answers: Record<string, string | boolean>) => void;
  loading: boolean;
  submitLabel: string;
}

export function RsvpQuestionsDialog({
  open,
  onOpenChange,
  questions,
  onSubmit,
  loading,
  submitLabel,
}: RsvpQuestionsDialogProps) {
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});

  function setAnswer(id: string, value: string | boolean) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit() {
    for (const q of questions) {
      if (q.required) {
        const answer = answers[q.id];
        if (q.type === "checkbox") {
          // checkbox just needs to exist — no validation
        } else if (!answer || (typeof answer === "string" && !answer.trim())) {
          alert(`"${q.label}" is required.`);
          return;
        }
      }
    }
    onSubmit(answers);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>A few quick questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {questions.map((q) => (
            <div key={q.id} className="space-y-1.5">
              <Label>
                {q.label}
                {q.required && <span className="text-destructive ml-1">*</span>}
              </Label>

              {q.type === "text" && (
                <Input
                  value={(answers[q.id] as string) ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Your answer"
                />
              )}

              {q.type === "paragraph" && (
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={(answers[q.id] as string) ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Your answer"
                />
              )}

              {q.type === "checkbox" && (
                <div className="flex items-center gap-2">
                  <Switch
                    id={`answer-${q.id}`}
                    checked={(answers[q.id] as boolean) ?? false}
                    onCheckedChange={(checked) => setAnswer(q.id, checked)}
                  />
                  <Label htmlFor={`answer-${q.id}`} className="text-sm text-muted-foreground">
                    Yes
                  </Label>
                </div>
              )}

              {q.type === "dropdown" && (
                <Select
                  value={(answers[q.id] as string) ?? ""}
                  onValueChange={(val) => setAnswer(q.id, val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {(q.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
