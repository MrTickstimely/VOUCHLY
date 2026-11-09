import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import SiteDock from "@/components/SiteDock";
import { site } from "@/lib/site";

export default function SiteLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
          <Logo />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/queue" className="btn btn-primary">Open workspace</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-12 lg:px-10 lg:py-16">{children}</main>
      <footer className="site-footer border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 pb-24 lg:px-10 text-sm text-mute">
          <span>{site.company}</span>
          <nav aria-label="Legal" className="flex gap-5">
            <Link href="/privacy" className="underline">Privacy policy</Link>
            <Link href="/terms" className="underline">Terms of use</Link>
            <span>{site.email}</span>
          </nav>
        </div>
      </footer>
      <SiteDock />
    </div>
  );
}
