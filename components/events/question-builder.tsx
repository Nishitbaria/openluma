"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  CheckSquare,
  ChevronLeft,
  GripVertical,
  List,
  Pencil,
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

const TYPE_META: Record<
  QuestionType,
  { label: string; description: string; icon: React.ElementType }
> = {
  text: {
    label: "Short Text",
    description: "Ask for a free-form response",
    icon: Text,
  },
  paragraph: {
    label: "Paragraph",
    description: "Ask for a long-form response",
    icon: AlignLeft,
  },
  checkbox: {
    label: "Checkbox",
    description: "Yes / No confirmation",
    icon: CheckSquare,
  },
  dropdown: {
    label: "Options",
    description: "Let the guest choose from a list",
    icon: List,
  },
};

type ModalStep = "pick-type" | "edit-form";

interface ModalState {
  open: boolean;
  step: ModalStep;
  editingId: string | null; // null = creating new
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[];
  optionInput: string;
}

const EMPTY_MODAL: ModalState = {
  open: false,
  step: "pick-type",
  editingId: null,
  type: "text",
  label: "",
  required: false,
  options: [],
  optionInput: "",
};

export function QuestionBuilder({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState>(EMPTY_MODAL);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
    setModal({
      open: true,
      step: "edit-form",
      editingId: q.id,
      type: q.type,
      label: q.label,
      required: q.required,
      options: q.options ?? [],
      optionInput: "",
    });
  }

  function closeModal() {
    setModal(EMPTY_MODAL);
  }

  function selectType(type: QuestionType) {
    setModal((m) => ({ ...m, type, step: "edit-form", label: "", required: false, options: [] }));
  }

  // ── Option tags ───────────────────────────────────────────────────────────
  function addOption() {
    const val = modal.optionInput.trim();
    if (!val || modal.options.includes(val)) return;
    setModal((m) => ({ ...m, options: [...m.options, val], optionInput: "" }));
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

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!modal.label.trim()) {
      toast.error("Question label is required");
      return;
    }
    if (modal.type === "dropdown" && modal.options.length === 0) {
      toast.error("Add at least one option");
      return;
    }

    setSaving(true);
    try {
      if (modal.editingId) {
        // Update existing
        const res = await fetch(`/api/events/${eventId}/questions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: modal.editingId,
            label: modal.label.trim(),
            type: modal.type,
            required: modal.required,
            options: modal.type === "dropdown" ? modal.options : null,
          }),
        });
        if (!res.ok) { toast.error("Failed to save"); return; }
        const updated = await res.json();
        setQuestions((prev) => prev.map((q) => (q.id === modal.editingId ? updated : q)));
        toast.success("Question updated");
      } else {
        // Create new
        const res = await fetch(`/api/events/${eventId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: modal.label.trim(),
            type: modal.type,
            required: modal.required,
            order: questions.length,
            options: modal.type === "dropdown" ? modal.options : null,
          }),
        });
        if (!res.ok) { toast.error("Failed to add question"); return; }
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
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    router.refresh();
  }

  // ── Drag reorder ──────────────────────────────────────────────────────────
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
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
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: q.id, order: q.order }),
        }),
      ),
    );
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading questions…</p>;

  const SelectedIcon = TYPE_META[modal.type].icon;

  return (
    <>
      {/* Question list */}
      <div className="space-y-2">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center border rounded-lg border-dashed">
            <List className="h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm font-medium">No questions yet</p>
            <p className="text-xs text-muted-foreground">
              Add questions to collect info from attendees when they RSVP.
            </p>
          </div>
        ) : (
          <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                {questions.map((q) => (
                  <SortableQuestionRow
                    key={q.id}
                    question={q}
                    onEdit={openEdit}
                    onDelete={deleteQuestion}
                  />
                ))}
              </SortableContext>
            </DndContext>
        )}
      </div>

      {/* Add Question button */}
      <Button variant="outline" onClick={openAdd} className="mt-3">
        <Plus className="mr-2 h-4 w-4" />
        Add Question
      </Button>

      {/* Modal */}
      <Dialog open={modal.open} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">

          {/* Step 1 — Pick type */}
          {modal.step === "pick-type" && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Add Question</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Ask guests custom questions when they register.
                </p>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 px-6 pb-6">
                {(Object.entries(TYPE_META) as [QuestionType, typeof TYPE_META[QuestionType]][]).map(
                  ([type, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => selectType(type)}
                        className="flex items-center gap-3 rounded-lg border bg-muted/30 hover:bg-muted px-4 py-3 text-left transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{meta.label}</p>
                          <p className="text-xs text-muted-foreground leading-tight">{meta.description}</p>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </>
          )}

          {/* Step 2 — Question form */}
          {modal.step === "edit-form" && (
            <>
              <DialogHeader className="px-6 pt-5 pb-0">
                <div className="flex items-center gap-2 mb-1">
                  {!modal.editingId && (
                    <button
                      type="button"
                      onClick={() => setModal((m) => ({ ...m, step: "pick-type" }))}
                      className="rounded-md p-1 hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                  <DialogTitle className="text-base">
                    {modal.editingId ? "Edit Question" : "Add Question"}
                  </DialogTitle>
                </div>
                {/* Type badge */}
                <div className="flex items-center gap-2 mt-1 pb-4 border-b">
                  <SelectedIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{TYPE_META[modal.type].label}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{TYPE_META[modal.type].description}</span>
                </div>
              </DialogHeader>

              <div className="px-6 py-4 space-y-4">
                {/* Label */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Question</Label>
                  <Input
                    autoFocus
                    placeholder="e.g. What is your company name?"
                    value={modal.label}
                    onChange={(e) => setModal((m) => ({ ...m, label: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  />
                </div>

                {/* Dropdown options */}
                {modal.type === "dropdown" && (
                  <div className="space-y-2">
                    <Label className="text-sm">Options</Label>
                    <div className="flex flex-wrap gap-1.5 min-h-[36px] rounded-md border bg-background px-3 py-2">
                      {modal.options.map((opt) => (
                        <span
                          key={opt}
                          className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm"
                        >
                          {opt}
                          <button
                            type="button"
                            onClick={() => removeOption(opt)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        placeholder={modal.options.length === 0 ? "Add options…" : "Add another…"}
                        value={modal.optionInput}
                        onChange={(e) => setModal((m) => ({ ...m, optionInput: e.target.value }))}
                        onKeyDown={handleOptionKeyDown}
                        onBlur={addOption}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Press Enter or Tab to add an option.
                    </p>
                  </div>
                )}

                {/* Required toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="required-toggle" className="text-sm">Required</Label>
                  <Switch
                    id="required-toggle"
                    checked={modal.required}
                    onCheckedChange={(v) => setModal((m) => ({ ...m, required: v }))}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6">
                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : modal.editingId ? "Save Changes" : "Add Question"}
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
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const Meta = TYPE_META[question.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/40 transition-colors"
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Type icon */}
      <Meta.icon className="h-4 w-4 text-muted-foreground shrink-0" />

      {/* Label + type */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{question.label}</p>
        <p className="text-xs text-muted-foreground">
          {Meta.label}
          {question.required ? " · Required" : ""}
        </p>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => onEdit(question)}
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(question.id)}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
