"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Persona,
  type PersonaState,
  type PersonaVariant,
} from "@/components/ui/persona";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const variants = [
  { label: "Obsidian", value: "obsidian" },
  { label: "Mana", value: "mana" },
  { label: "Opal", value: "opal" },
  { label: "Halo", value: "halo" },
  { label: "Glint", value: "glint" },
  { label: "Command", value: "command" },
];

const states: PersonaState[] = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "asleep",
];

const PersonaDemo = () => {
  const [state, setState] = useState<PersonaState>("thinking");
  const [variant, setVariant] = useState<PersonaVariant>("glint");

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 p-6">
      <div className="flex flex-col items-center gap-4">
        <Persona className="size-32" state={state} variant={variant} />
        <Select
          onValueChange={(value) => setVariant(value as PersonaVariant)}
          value={variant}
        >
          <SelectTrigger aria-label="Variant" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {variants.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {states.map((item) => (
          <Button
            aria-pressed={state === item}
            className="capitalize"
            key={item}
            onClick={() => setState(item)}
            size="sm"
            variant={state === item ? "default" : "outline"}
          >
            {item}
          </Button>
        ))}
      </div>
    </div>
  );
};
