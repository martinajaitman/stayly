"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { markNotificationsRead } from "@/app/notification-actions";
import type { Notification } from "@/lib/types";

/** Campana de avisos (admin, limpieza y profesionales). */
export function NotificationBell({ items, align = "right" }: { items: Notification[]; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read_at);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div ref={box} className="relative">
      <button
        aria-label={`Avisos${unread.length ? ` (${unread.length} sin leer)` : ""}`}
        onClick={() => {
          setOpen(!open);
          if (!open && unread.length) start(() => markNotificationsRead(unread.map((n) => n.id)));
        }}
        className="relative grid size-9 place-items-center rounded-xl hover:bg-surface-muted"
      >
        <Bell size={19} />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className={clsx("absolute z-30 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-border bg-surface shadow-lg", align === "right" ? "right-0" : "left-0")}>
          <p className="border-b border-border px-4 py-3 text-sm font-semibold">Avisos</p>
          {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">No tenés avisos.</p>}
          {items.map((n) => {
            const body = (
              <div className={clsx("border-b border-border px-4 py-3 text-sm last:border-0", !n.read_at && "bg-accent-soft/40")}>
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 text-muted">{n.body}</p>}
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block hover:bg-surface-muted/60">{body}</Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
