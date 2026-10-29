"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, CalendarDays, ClipboardList, Home, MessageCircle, NotebookTabs, Users } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/reservations", label: "Reservas", icon: NotebookTabs },
  { href: "/properties", label: "Propiedades", icon: Building2 },
  { href: "/tasks", label: "Tareas", icon: ClipboardList },
  { href: "/team", label: "Equipo", icon: Users },
  { href: null, label: "Comunicación", icon: MessageCircle },
  { href: null, label: "Analytics", icon: BarChart3 },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon: Icon }) =>
        href ? (
          <Link
            key={label}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm whitespace-nowrap",
              pathname.startsWith(href) ? "bg-accent-soft font-medium text-accent" : "hover:bg-surface-muted",
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ) : (
          <span key={label} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm whitespace-nowrap text-muted/60" title="Próximamente">
            <Icon size={18} />
            {label}
          </span>
        ),
      )}
    </nav>
  );
}
