import Link from "next/link";
import { appMetadata, appViewport } from "@/lib/app-metadata";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notification-bell";
import { getMyNotifications, getSession } from "@/lib/session";

export const metadata = appMetadata;
export const viewport = appViewport;

export default async function StaffLayout({ children }: LayoutProps<"/">) {
  const { profile } = await getSession();
  const notifications = await getMyNotifications();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <Link href="/today"><Logo size={28} /></Link>
        <div className="flex items-center gap-3 text-sm">
          <NotificationBell items={notifications} />
          {profile.role === "admin" && <Link href="/dashboard" className="text-accent">Panel</Link>}
          <form action="/auth/signout" method="post"><button className="text-muted">Salir</button></form>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
    </div>
  );
}
