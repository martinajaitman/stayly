"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui";

/** Select que ejecuta una server action al cambiar de valor. */
export function AutoSubmitSelect({
  action,
  defaultValue,
  options,
  placeholder,
  label,
}: {
  action: (value: string) => Promise<void>;
  defaultValue: string;
  options: { value: string; label: string }[];
  placeholder: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label={label}
      defaultValue={defaultValue}
      disabled={pending}
      className="py-1.5 text-xs"
      onChange={(e) => start(() => action(e.target.value))}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  );
}
