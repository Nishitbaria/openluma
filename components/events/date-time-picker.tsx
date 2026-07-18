"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const date = new Date(2000, 0, 1, hours, minutes);
  return {
    value: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    label: format(date, "h:mm a"),
  };
});

export function DateTimePicker({ value, onChange, label }: DateTimePickerProps) {
  const timeValue = useMemo(
    () =>
      `${String(value.getHours()).padStart(2, "0")}:${String(
        value.getMinutes(),
      ).padStart(2, "0")}`,
    [value],
  );

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    const next = new Date(date);
    next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    onChange(next);
  }

  function handleTimeChange(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    const next = new Date(value);
    next.setHours(hours, minutes, 0, 0);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {label && (
        <span className="block text-sm font-medium">{label}</span>
      )}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="flex-1 justify-start font-normal"
            >
              <CalendarIcon className="size-4 text-muted-foreground" />
              {format(value, "EEE, MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>

        <Select value={timeValue} onValueChange={handleTimeChange}>
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
