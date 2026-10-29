import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";
import { InstallHint } from "./install-hint";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo size={40} />
          <p className="mt-3 text-sm text-muted">Una plataforma. Un recorrido. Cero trabajo manual innecesario.</p>
        </div>
        <Card>
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </Card>
        <InstallHint />
      </div>
    </main>
  );
}
