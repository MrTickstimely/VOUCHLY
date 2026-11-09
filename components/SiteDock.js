"use client";
import { usePathname } from "next/navigation";
import { House, ListChecks, FileCheck, ShieldCheck, ScrollText, Mail } from "lucide-react";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/core/dock";
import { site } from "@/lib/site";

// Set to false to stop the icons growing toward the cursor.
const MAGNIFY = true;

const hasEmail = !site.email.startsWith("[");
const LINKS = [
  ["Home", "/", House],
  ["Review queue", "/queue", ListChecks],
  ["Check content", "/submit", FileCheck],
  ["Privacy policy", "/privacy", ShieldCheck],
  ["Terms of use", "/terms", ScrollText],
  ...(hasEmail ? [["Contact", "mailto:" + site.email, Mail]] : []),
];

export default function SiteDock() {
  const path = usePathname();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center">
      <div className="pointer-events-auto max-w-full">
        <Dock magnify={MAGNIFY}>
          {LINKS.map(([title, href, Icon]) => {
            const active = href === path;
            return (
              <DockItem key={href} title={title} href={href} active={active}
                className={"rounded-md border " + (active ? "border-ink bg-ink" : "border-line bg-paper")}>
                <DockLabel>{title}</DockLabel>
                <DockIcon><Icon className={"h-full w-full " + (active ? "text-white" : "text-ink")} strokeWidth={1.75} aria-hidden="true" /></DockIcon>
              </DockItem>
            );
          })}
        </Dock>
      </div>
    </div>
  );
}
