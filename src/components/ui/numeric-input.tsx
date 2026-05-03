import * as React from "react"
import { Input } from "./input"
import { formatNumberInput, sanitizeNumberInput, parseNumberInput } from "@/utils/numberFormatting"

export interface NumericInputProps extends Omit<React.ComponentProps<"input">, 'value' | 'onChange'> {
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  min?: number;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/**
 * A numeric input that displays thousands separators (commas) while typing.
 * It uses type="text" and inputMode="decimal" as per requirements.
 * Internal state is managed as numbers.
 */
export function NumericInput({ value, onChange, min, onBlur, className, ...props }: NumericInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync display value with external value
  React.useEffect(() => {
    const formatted = formatNumberInput(value);
    // Only update display value if it represents a different number than what's currently shown,
    // or if the display is empty and we have a non-null value.
    const currentParsed = parseNumberInput(displayValue);
    const newParsed = parseNumberInput(formatted);
    
    if (currentParsed !== newParsed || (displayValue === "" && value !== null && value !== undefined)) {
      setDisplayValue(formatted);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const originalValue = input.value;
    const cursorPosition = input.selectionStart || 0;
    
    // Sanitize and format
    const sanitized = sanitizeNumberInput(originalValue);
    const formatted = formatNumberInput(sanitized);
    
    // Calculate new cursor position to prevent jumping
    // Count non-digit characters (commas) before cursor in original and new formatted string
    const beforeCursor = originalValue.substring(0, cursorPosition);
    const digitsBeforeCursor = beforeCursor.replace(/[^\d.-]/g, "").length;
    
    setDisplayValue(formatted);
    
    // Propagate change
    const parsed = parseNumberInput(sanitized);
    // If empty or invalid, treat as 0 or null? Most app logic seems to use 0.
    const finalValue = parsed !== null ? parsed : 0;
    onChange(finalValue);

    // Restore cursor position in next tick
    setTimeout(() => {
      if (inputRef.current) {
        let newCursorPos = 0;
        let digitsCount = 0;
        const newFormatted = inputRef.current.value;
        
        for (let i = 0; i < newFormatted.length; i++) {
          if (/[\d.-]/.test(newFormatted[i])) {
            digitsCount++;
          }
          if (digitsCount === digitsBeforeCursor) {
            newCursorPos = i + 1;
            // If the next character is a comma, we might want to skip it
            break;
          }
        }
        
        // Adjust if we are at the end of digits but there are more chars (like trailing decimal)
        if (digitsCount < digitsBeforeCursor) {
           newCursorPos = newFormatted.length;
        }

        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Enforce min value on blur if specified
    if (min !== undefined) {
      const parsed = parseNumberInput(displayValue);
      if (parsed === null || parsed < min) {
        onChange(min);
        setDisplayValue(formatNumberInput(min));
      }
    }
    if (onBlur) onBlur(e);
  };

  return (
    <Input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}
