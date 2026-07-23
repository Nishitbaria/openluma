"use client";

import { useState } from "react";
import { toast } from "sonner";
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
  options: string[] | null;
  required: boolean;
  type:
    | "text"
    | "paragraph"
    | "checkbox"
    | "dropdown"
    | "social_profile"
    | "company"
    | "phone"
    | "website"
    | "terms";
}

interface RsvpQuestionsDialogProps {
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (answers: Record<string, string | boolean>) => void;
  open: boolean;
  questions: EventQuestion[];
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

  function textValue(id: string) {
    const v = answers[id];
    return typeof v === "string" ? v : "";
  }

  function boolValue(id: string) {
    const v = answers[id];
    return typeof v === "boolean" ? v : false;
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form-submit validation branches over every supported question type; splitting it would scatter tightly-coupled validation logic without reducing real complexity
  function handleSubmit() {
    for (const q of questions) {
      if (q.required) {
        const answer = answers[q.id];
        if (q.type === "checkbox") {
          // checkbox is a yes/no — any answer is valid
        } else if (q.type === "terms") {
          if (!answer) {
            toast.error(`You must agree to "${q.label}".`);
            return;
          }
        } else if (!answer || (typeof answer === "string" && !answer.trim())) {
          toast.error(`"${q.label}" is required.`);
          return;
        }
      }
    }
    onSubmit(answers);
  }

  const submitButtonLabel = loading ? "Submitting..." : submitLabel;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>A few quick questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {questions.map((q) => (
            <div className="space-y-1.5" key={q.id}>
              <Label>
                {q.label}
                {q.required ? (
                  <span className="ml-1 text-destructive">*</span>
                ) : null}
              </Label>

              {q.type === "text" && (
                <Input
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Your answer"
                  value={textValue(q.id)}
                />
              )}

              {q.type === "paragraph" && (
                <textarea
                  className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Your answer"
                  value={textValue(q.id)}
                />
              )}

              {q.type === "checkbox" && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={boolValue(q.id)}
                    id={`answer-${q.id}`}
                    onCheckedChange={(checked) => setAnswer(q.id, checked)}
                  />
                  <Label
                    className="text-muted-foreground text-sm"
                    htmlFor={`answer-${q.id}`}
                  >
                    Yes
                  </Label>
                </div>
              )}

              {q.type === "dropdown" && (
                <Select
                  onValueChange={(val) => setAnswer(q.id, val)}
                  value={textValue(q.id)}
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

              {q.type === "social_profile" && (
                <div className="space-y-2">
                  {q.options?.[0] ? (
                    <p className="text-muted-foreground text-xs">
                      Platform: {q.options[0]}
                    </p>
                  ) : null}
                  <Input
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder={
                      q.options?.[0]
                        ? `Your ${q.options[0]} username`
                        : "Your username"
                    }
                    value={textValue(q.id)}
                  />
                </div>
              )}

              {q.type === "company" && (
                <div className="space-y-2">
                  <Input
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Your company name"
                    value={textValue(q.id)}
                  />
                  {q.options?.[0] ? (
                    <Input
                      onChange={(e) =>
                        setAnswer(`${q.id}_jobtitle`, e.target.value)
                      }
                      placeholder={q.options[0]}
                      value={textValue(`${q.id}_jobtitle`)}
                    />
                  ) : null}
                </div>
              )}

              {q.type === "phone" && (
                <Input
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  type="tel"
                  value={textValue(q.id)}
                />
              )}

              {q.type === "website" && (
                <Input
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="https://yourwebsite.com"
                  type="url"
                  value={textValue(q.id)}
                />
              )}

              {q.type === "terms" && (
                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                  <Switch
                    checked={boolValue(q.id)}
                    className="mt-0.5"
                    id={`answer-${q.id}`}
                    onCheckedChange={(checked) => setAnswer(q.id, checked)}
                  />
                  <Label
                    className="cursor-pointer text-sm leading-snug"
                    htmlFor={`answer-${q.id}`}
                  >
                    I agree to the terms and conditions
                    {q.required ? (
                      <span className="ml-1 text-destructive">*</span>
                    ) : null}
                  </Label>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            disabled={loading}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={loading} onClick={handleSubmit}>
            {submitButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
