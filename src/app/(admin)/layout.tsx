import { AdminNav } from "@/components/admin-nav";
import { appMetadata, appViewport } from "@/lib/app-metadata";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notification-bell";
import { getMyNotifications, requireAdmin } from "@/lib/session";

export const metadata = appMetadata;
export const viewport = appViewport;

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const { profile, org } = await requireAdmin();
  const notifications = await getMyNotifications();
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-border bg-surface p-4 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col md:border-r md:border-b-0">
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <Logo />
          <NotificationBell items={notifications} align="left" />
        </div>
        <AdminNav />
        <div className="mt-4 hidden border-t border-border pt-4 text-sm md:mt-auto md:block">
          <p className="font-medium">{profile.full_name || "Administrador"}</p>
          <p className="text-muted">{org.name}</p>
          <form action="/auth/signout" method="post">
            <button className="mt-2 text-muted hover:text-foreground">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
