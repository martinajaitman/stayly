"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Send } from "lucide-react";
import type { ChatMessage } from "@/lib/conversation";

type Bubble = { id: string; role: ChatMessage["role"]; content: string; incident?: number };

const SUGGESTIONS = ["¿Cuál es la contraseña del Wi-Fi?", "¿A qué hora es el check-out?", "¿Hay supermercados cerca?"];

export function Chat({ token, initial }: { token: string; initial: ChatMessage[] }) {
  const [bubbles, setBubbles] = useState<Bubble[]>(
    initial.filter((m) => m.role !== "system").map((m) => ({ id: m.id, role: m.role, content: m.content })),
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [bubbles]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    const replyId = crypto.randomUUID();
    setBubbles((b) => [...b, { id: crypto.randomUUID(), role: "guest", content: message }, { id: replyId, role: "assistant", content: "" }]);
    const update = (fn: (b: Bubble) => Bubble) => setBubbles((all) => all.map((b) => (b.id === replyId ? fn(b) : b)));

    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, message }) });
      if (!res.ok || !res.body) {
        const { error } = await res.json().catch(() => ({ error: "No pude enviar el mensaje." }));
        update((b) => ({ ...b, content: error }));
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line) as { type: string; text?: string; number?: number };
          if (event.type === "text") update((b) => ({ ...b, content: b.content + event.text }));
          if (event.type === "incident") update((b) => ({ ...b, incident: event.number }));
        }
      }
    } catch {
      update((b) => ({ ...b, content: b.content || "Se cortó la conexión. Probá de nuevo." }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex flex-1 flex-col gap-3 pb-4">
        {bubbles.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Preguntame lo que necesites sobre tu estadía. Si algo no funciona, contame y aviso al equipo.</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="self-start rounded-full border border-border bg-surface px-3 py-1.5 text-sm">
                {s}
              </button>
            ))}
          </div>
        )}
        {bubbles.map((b) => (
          <div key={b.id} className={clsx("flex flex-col gap-1.5", b.role === "guest" ? "items-end" : "items-start")}>
            {b.role === "admin" && <span className="text-xs text-muted">Equipo del alojamiento</span>}
            <div
              className={clsx(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] whitespace-pre-line",
                b.role === "guest" ? "rounded-br-md bg-accent text-white" : "rounded-bl-md border border-border bg-surface",
              )}
            >
              {b.content || <span className="inline-flex gap-1 text-muted"><span className="animate-pulse">●</span><span className="animate-pulse [animation-delay:150ms]">●</span><span className="animate-pulse [animation-delay:300ms]">●</span></span>}
            </div>
            {b.incident && (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger">
                <AlertTriangle size={12} /> Incidencia #{b.incident} creada
              </span>
            )}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form
        className="sticky bottom-0 flex gap-2 bg-background py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribí tu consulta…"
          maxLength={2000}
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-accent"
        />
        <button aria-label="Enviar" disabled={busy || !input.trim()} className="grid w-12 place-items-center rounded-xl border border-border bg-surface text-accent disabled:opacity-40">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
