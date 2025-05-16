"use client";

import { forwardRef } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  selected?: Date;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholderText?: string;
  minDate?: Date;
  maxDate?: Date;
  showTimeSelect?: boolean;
  dateFormat?: string;
  disabled?: boolean;
}

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      selected,
      onChange,
      className,
      placeholderText = "选择日期",
      minDate,
      maxDate,
      showTimeSelect = false,
      dateFormat = "yyyy-MM-dd",
      disabled = false,
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn("date-picker-container", className)}>
        <ReactDatePicker
          selected={selected}
          onChange={onChange}
          placeholderText={placeholderText}
          className="date-picker-input"
          minDate={minDate}
          maxDate={maxDate}
          showTimeSelect={showTimeSelect}
          dateFormat={dateFormat}
          disabled={disabled}
          locale="zh-CN"
        />
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
