import { appMetadata, appViewport } from "@/lib/app-metadata";

export const metadata = appMetadata;
export const viewport = appViewport;

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return children;
}
