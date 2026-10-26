"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { syncPropertyNow } from "./actions";

export function SyncButton({ propertyId }: { propertyId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-sm text-muted">{msg}</span>}
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await syncPropertyNow(propertyId);
            if ("error" in r) setMsg(r.error);
            else
              setMsg(
                r.errors.length
                  ? `Error: ${r.errors[0]}`
                  : `${r.inserted} nuevas · ${r.updated} actualizadas · ${r.cancelled} canceladas`,
              );
          })
        }
      >
        <RefreshCw size={16} className={pending ? "animate-spin" : ""} /> Sincronizar ahora
      </Button>
    </div>
  );
}
