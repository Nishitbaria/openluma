"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  AtSign,
  Building2,
  CheckSquare,
  ChevronLeft,
  FileText,
  GripVertical,
  Link,
  List,
  Pencil,
  Phone,
  Plus,
  Text,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

type QuestionType =
  | "text"
  | "paragraph"
  | "checkbox"
  | "dropdown"
  | "social_profile"
  | "company"
  | "phone"
  | "website"
  | "terms";

interface Question {
  id: string;
  label: string;
  options: string[] | null;
  order: number;
  required: boolean;
  type: QuestionType;
}

const TYPE_META: Record<
  QuestionType,
  { label: string; description: string; icon: React.ElementType }
> = {
  checkbox: {
    description: "Ask guests to check a box",
    icon: CheckSquare,
    label: "Checkbox",
  },
  company: {
    description: "Ask for the company the guest works for",
    icon: Building2,
    label: "Company",
  },
  dropdown: {
    description: "Let the guest choose from a list",
    icon: List,
    label: "Options",
  },
  paragraph: {
    description: "Ask for a long-form response",
    icon: AlignLeft,
    label: "Paragraph",
  },
  phone: { description: "Ask for a phone number", icon: Phone, label: "Phone" },
  social_profile: {
    description: "Ask for a social network username",
    icon: AtSign,
    label: "Social Profile",
  },
  terms: {
    description: "Ask guests to agree to terms",
    icon: FileText,
    label: "Terms",
  },
  text: {
    description: "Ask for a free-form response",
    icon: Text,
    label: "Short Text",
  },
  website: {
    description: "Ask for a website URL",
    icon: Link,
    label: "Website",
  },
};

const SOCIAL_PLATFORMS = [
  "Instagram",
  "LinkedIn",
  "X (Twitter)",
  "YouTube",
  "GitHub",
  "Telegram",
];

type ModalStep = "pick-type" | "edit-form";

interface ModalState {
  // company
  collectJobTitle: boolean;
  editingId: string | null;
  jobTitleLabel: string;
  label: string;
  open: boolean;
  optionInput: string;
  // dropdown
  options: string[];
  // social_profile
  platform: string;
  required: boolean;
  step: ModalStep;
  type: QuestionType;
}

const EMPTY_MODAL: ModalState = {
  collectJobTitle: false,
  editingId: null,
  jobTitleLabel: "What is your job title?",
  label: "",
  open: false,
  optionInput: "",
  options: [],
  platform: "Instagram",
  required: false,
  step: "pick-type",
  type: "text",
};

const DEFAULT_LABELS: Partial<Record<QuestionType, string>> = {
  company: "What company do you work for?",
  phone: "What is your phone number?",
  website: "What is your website URL?",
};

function getSaveButtonLabel(saving: boolean, editingId: string | null) {
  if (saving) {
    return "Saving…";
  }
  return editingId ? "Save Changes" : "Add Question";
}

export function QuestionBuilder({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState>(EMPTY_MODAL);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetch(`/api/events/${eventId}/questions`)
      .then((r) => r.json())
      .then(setQuestions)
      .catch(() => toast.error("Failed to load questions"))
      .finally(() => setLoading(false));
  }, [eventId]);

  // ── Open modal ────────────────────────────────────────────────────────────
  function openAdd() {
    setModal({ ...EMPTY_MODAL, open: true, step: "pick-type" });
  }

  function openEdit(q: Question) {
    const platform =
      q.type === "social_profile"
        ? (q.options?.[0] ?? "Instagram")
        : "Instagram";
    const collectJobTitle =
      q.type === "company" && q.options !== null && q.options.length > 0;
    const jobTitleLabel = collectJobTitle
      ? (q.options?.[0] ?? "What is your job title?")
      : "What is your job title?";
    setModal({
      collectJobTitle,
      editingId: q.id,
      jobTitleLabel,
      label: q.label,
      open: true,
      optionInput: "",
      options: q.type === "dropdown" ? (q.options ?? []) : [],
      platform,
      required: q.required,
      step: "edit-form",
      type: q.type,
    });
  }

  function closeModal() {
    setModal(EMPTY_MODAL);
  }

  function selectType(type: QuestionType) {
    setModal((m) => ({
      ...m,
      collectJobTitle: false,
      jobTitleLabel: "What is your job title?",
      label: DEFAULT_LABELS[type] ?? "",
      options: [],
      platform: "Instagram",
      required: false,
      step: "edit-form",
      type,
    }));
  }

  // ── Social profile: auto-generate label from platform ─────────────────────
  function getSocialLabel(platform: string) {
    return `What is your ${platform} username?`;
  }

  function handlePlatformChange(platform: string) {
    setModal((m) => ({
      ...m,
      label: getSocialLabel(platform),
      platform,
    }));
  }

  // ── Dropdown option tags ──────────────────────────────────────────────────
  function addOption() {
    const val = modal.optionInput.trim();
    if (!val || modal.options.includes(val)) {
      return;
    }
    setModal((m) => ({ ...m, optionInput: "", options: [...m.options, val] }));
  }

  function removeOption(opt: string) {
    setModal((m) => ({ ...m, options: m.options.filter((o) => o !== opt) }));
  }

  function handleOptionKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      addOption();
    }
  }

  // ── Build options payload by type ─────────────────────────────────────────
  function buildOptions(): string[] | null {
    if (modal.type === "dropdown") {
      return modal.options.length > 0 ? modal.options : null;
    }
    if (modal.type === "social_profile") {
      return [modal.platform];
    }
    if (modal.type === "company") {
      return modal.collectJobTitle ? [modal.jobTitleLabel] : null;
    }
    return null;
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    const label = modal.label.trim();

    if (!label) {
      toast.error("Question label is required");
      return;
    }
    if (modal.type === "dropdown" && modal.options.length === 0) {
      toast.error("Add at least one option");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label,
        options: buildOptions(),
        required: modal.required,
        type: modal.type,
      };

      if (modal.editingId) {
        const res = await fetch(`/api/events/${eventId}/questions`, {
          body: JSON.stringify({ id: modal.editingId, ...payload }),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        });
        if (!res.ok) {
          toast.error("Failed to save");
          return;
        }
        const updated = await res.json();
        setQuestions((prev) =>
          prev.map((q) => (q.id === modal.editingId ? updated : q))
        );
        toast.success("Question updated");
      } else {
        const res = await fetch(`/api/events/${eventId}/questions`, {
          body: JSON.stringify({ ...payload, order: questions.length }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!res.ok) {
          toast.error("Failed to add question");
          return;
        }
        const created = await res.json();
        setQuestions((prev) => [...prev, created]);
        toast.success("Question added");
      }
      closeModal();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function deleteQuestion(id: string) {
    const res = await fetch(`/api/events/${eventId}/questions`, {
      body: JSON.stringify({ id }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    router.refresh();
  }

  // ── Drag reorder ──────────────────────────────────────────────────────────
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(questions, oldIndex, newIndex).map((q, i) => ({
      ...q,
      order: i,
    }));
    setQuestions(reordered);
    await Promise.all(
      reordered.map((q) =>
        fetch(`/api/events/${eventId}/questions`, {
          body: JSON.stringify({ id: q.id, order: q.order }),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        })
      )
    );
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading questions…</p>;
  }

  const SelectedIcon = TYPE_META[modal.type].icon;
  const saveButtonLabel = getSaveButtonLabel(saving, modal.editingId);

  return (
    <>
      {/* Question list */}
      <div className="space-y-2">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
            <List className="h-7 w-7 text-muted-foreground/50" />
            <p className="font-medium text-sm">No questions yet</p>
            <p className="text-muted-foreground text-xs">
              Add questions to collect info from attendees when they RSVP.
            </p>
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              {questions.map((q) => (
                <SortableQuestionRow
                  key={q.id}
                  onDelete={deleteQuestion}
                  onEdit={openEdit}
                  question={q}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Button className="mt-3" onClick={openAdd} variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        Add Question
      </Button>

      {/* ── Modal ── */}
      <Dialog onOpenChange={(open) => !open && closeModal()} open={modal.open}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          {/* Step 1 — Pick type */}
          {modal.step === "pick-type" && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Add Question</DialogTitle>
                <p className="text-muted-foreground text-sm">
                  Ask guests custom questions when they register.
                </p>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 px-6 pb-6">
                {(
                  Object.entries(TYPE_META) as [
                    QuestionType,
                    (typeof TYPE_META)[QuestionType],
                  ][]
                ).map(([type, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button
                      className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted"
                      key={type}
                      onClick={() => selectType(type)}
                      type="button"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium text-sm">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 2 — Question form */}
          {modal.step === "edit-form" && (
            <>
              <DialogHeader className="px-6 pt-5 pb-0">
                <div className="mb-1 flex items-center gap-2">
                  {!modal.editingId && (
                    <button
                      className="rounded-md p-1 transition-colors hover:bg-muted"
                      onClick={() =>
                        setModal((m) => ({ ...m, step: "pick-type" }))
                      }
                      type="button"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                  <DialogTitle className="text-base">
                    {modal.editingId ? "Edit Question" : "Add Question"}
                  </DialogTitle>
                </div>
                <div className="mt-1 flex items-center gap-2 border-b pb-4">
                  <SelectedIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">
                    {TYPE_META[modal.type].label}
                  </span>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-muted-foreground text-xs">
                    {TYPE_META[modal.type].description}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-4 px-6 py-4">
                {/* Social Profile — platform first, then auto-label */}
                {modal.type === "social_profile" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Platform</Label>
                      <Select
                        onValueChange={handlePlatformChange}
                        value={modal.platform}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOCIAL_PLATFORMS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Question</Label>
                      <Input
                        onChange={(e) =>
                          setModal((m) => ({ ...m, label: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
                        placeholder={getSocialLabel(modal.platform)}
                        value={modal.label}
                      />
                      <p className="text-muted-foreground text-xs">
                        Auto-filled from platform — you can customize it.
                      </p>
                    </div>
                  </>
                )}

                {/* Company — question + optional job title */}
                {modal.type === "company" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Question</Label>
                      <Input
                        autoFocus
                        onChange={(e) =>
                          setModal((m) => ({ ...m, label: e.target.value }))
                        }
                        placeholder="What company do you work for?"
                        value={modal.label}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm" htmlFor="collect-job">
                        Collect Job Title
                      </Label>
                      <Switch
                        checked={modal.collectJobTitle}
                        id="collect-job"
                        onCheckedChange={(v) =>
                          setModal((m) => ({ ...m, collectJobTitle: v }))
                        }
                      />
                    </div>
                    {modal.collectJobTitle ? (
                      <div className="space-y-1.5">
                        <Label className="text-sm">Job Title Question</Label>
                        <Input
                          onChange={(e) =>
                            setModal((m) => ({
                              ...m,
                              jobTitleLabel: e.target.value,
                            }))
                          }
                          placeholder="What is your job title?"
                          value={modal.jobTitleLabel}
                        />
                      </div>
                    ) : null}
                  </>
                )}

                {/* Dropdown — tag input for options */}
                {modal.type === "dropdown" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Question</Label>
                      <Input
                        autoFocus
                        onChange={(e) =>
                          setModal((m) => ({ ...m, label: e.target.value }))
                        }
                        placeholder="e.g. Which session will you attend?"
                        value={modal.label}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Options</Label>
                      <div className="flex min-h-[40px] flex-wrap gap-1.5 rounded-md border bg-background px-3 py-2">
                        {modal.options.map((opt) => (
                          <span
                            className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm"
                            key={opt}
                          >
                            {opt}
                            <button
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => removeOption(opt)}
                              type="button"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          onBlur={addOption}
                          onChange={(e) =>
                            setModal((m) => ({
                              ...m,
                              optionInput: e.target.value,
                            }))
                          }
                          onKeyDown={handleOptionKeyDown}
                          placeholder={
                            modal.options.length === 0
                              ? "Add options…"
                              : "Add another…"
                          }
                          value={modal.optionInput}
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Press Enter or Tab to add an option.
                      </p>
                    </div>
                  </>
                )}

                {/* All other types — just a label input */}
                {!["social_profile", "company", "dropdown"].includes(
                  modal.type
                ) && (
                  <div className="space-y-1.5">
                    <Label className="text-sm">Question</Label>
                    <Input
                      autoFocus
                      onChange={(e) =>
                        setModal((m) => ({ ...m, label: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      placeholder={
                        DEFAULT_LABELS[modal.type] ?? "e.g. What is your…"
                      }
                      value={modal.label}
                    />
                  </div>
                )}

                {/* Required toggle */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm" htmlFor="required-toggle">
                      Required
                    </Label>
                    <Switch
                      checked={modal.required}
                      id="required-toggle"
                      onCheckedChange={(v) =>
                        setModal((m) => ({ ...m, required: v }))
                      }
                    />
                  </div>
                  {modal.type === "checkbox" && modal.required && (
                    <p className="text-muted-foreground text-xs">
                      When set to Required, guests must check the box (answer
                      Yes) to proceed.
                    </p>
                  )}
                </div>
              </div>

              <div className="px-6 pb-6">
                <Button
                  className="w-full"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saveButtonLabel}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Sortable row ──────────────────────────────────────────────────────────────

function SortableQuestionRow({
  question,
  onEdit,
  onDelete,
}: {
  question: Question;
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: question.id,
  });

  const style = {
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const Meta = TYPE_META[question.type];

  return (
    <div
      className="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
      ref={setNodeRef}
      style={style}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Meta.icon className="h-4 w-4 shrink-0 text-muted-foreground" />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{question.label}</p>
        <p className="text-muted-foreground text-xs">
          {Meta.label}
          {question.required ? " · Required" : ""}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          className="h-7 w-7"
          onClick={() => onEdit(question)}
          size="icon"
          variant="ghost"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(question.id)}
          size="icon"
          variant="ghost"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
