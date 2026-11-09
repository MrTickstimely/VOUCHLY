import Link from "next/link";
export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Vouchly home">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="6" fill="rgb(var(--c-ink))" /><path d="M8 11l8 12 8-12" fill="none" stroke="rgb(var(--c-white))" strokeWidth="3.5" strokeLinecap="square" /></svg>
      <span className="font-serif text-2xl font-semibold tracking-tight">Vouchly</span>
    </Link>
  );
}
