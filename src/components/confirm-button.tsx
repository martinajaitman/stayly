"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui";

/** Botón de submit que pide confirmación antes de enviar el formulario. */
export function ConfirmButton({ message, ...props }: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
