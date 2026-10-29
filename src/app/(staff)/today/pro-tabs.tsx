import clsx from "clsx";
import Link from "next/link";

export function ProTabs({ active }: { active: "home" | "availability" }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1 text-sm">
      {[
        { key: "home", href: "/today", label: "Pedidos y visitas" },
        { key: "availability", href: "/today/availability", label: "Mi disponibilidad" },
      ].map((t) => (
        <Link key={t.key} href={t.href} className={clsx("rounded-lg py-2 text-center", active === t.key ? "bg-surface font-medium shadow-sm" : "text-muted")}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
