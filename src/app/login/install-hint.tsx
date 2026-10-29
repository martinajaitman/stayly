"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void> };

/** Invitación a instalar la app (Android: botón; iPhone: instrucciones). */
export function InstallHint() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "other" | "installed">("other");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de APIs del navegador, no se conoce en el servidor
    setPlatform(standalone ? "installed" : /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "other");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (platform === "installed") return null;
  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm">
      <p className="font-medium">Instalá la app de Stayly</p>
      {event ? (
        <button onClick={() => event.prompt()} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 font-medium text-white">
          <Download size={16} /> Instalar en este dispositivo
        </button>
      ) : platform === "ios" ? (
        <p className="mt-1 text-muted">
          Tocá <Share size={14} className="inline align-text-bottom" /> Compartir y después <strong>Agregar a inicio</strong>.
        </p>
      ) : (
        <p className="mt-1 text-muted">Desde el celular: menú del navegador → <strong>Instalar app</strong> o <strong>Agregar a la pantalla de inicio</strong>.</p>
      )}
      <p className="mt-2 text-xs text-muted">Para administradores, personal de limpieza y profesionales. Los huéspedes no necesitan instalar nada: usan su link.</p>
    </div>
  );
}
