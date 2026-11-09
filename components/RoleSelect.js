"use client";
import { useEffect, useRef, useState } from "react";
import { User, Briefcase, ClipboardCheck, ShieldCheck, Building2, Check, ChevronDown } from "lucide-react";

// Select box for "Signed in as". Same look as the Uiverse list by reglobby (.input and .value in globals.css),
// but it opens as a drop-down. Works from the keyboard: Arrow keys open and move, Enter or Space picks,
// Escape closes, Tab leaves. Clicking outside closes it.
const ICONS = { creator: User, manager: Briefcase, reviewer: ClipboardCheck, admin: ShieldCheck, agency: Building2 };

export default function RoleSelect({ value, onChange, options, label = "Signed in as" }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const btn = useRef(null);
  const opts = useRef([]);
  const current = Math.max(0, options.indexOf(value));
  const Current = ICONS[value] || User;

  useEffect(() => {
    if (!open) return;
    opts.current[current]?.focus();
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (o) => { onChange(o); setOpen(false); btn.current?.focus(); };
  const onTriggerKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); }
  };
  const onOptionKey = (e, i) => {
    const n = options.length;
    const go = (k) => { e.preventDefault(); opts.current[k]?.focus(); };
    if (e.key === "ArrowDown") go((i + 1) % n);
    else if (e.key === "ArrowUp") go((i - 1 + n) % n);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(n - 1);
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); btn.current?.focus(); }
    else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <span id="role-select-label" className="text-mute">{label}</span>
      <div className="input role-radio mt-2">
        <button ref={btn} id="role-select-btn" type="button" className="value" aria-haspopup="listbox" aria-expanded={open}
          aria-labelledby="role-select-label role-select-btn" onClick={() => setOpen((o) => !o)} onKeyDown={onTriggerKey}>
          <Current aria-hidden="true" strokeWidth={1.75} />
          <span className="capitalize">{value}</span>
          <ChevronDown className="chev" aria-hidden="true" strokeWidth={2} />
        </button>
      </div>
      {open && (
        <div className="input role-radio select-panel" role="listbox" aria-labelledby="role-select-label">
          {options.map((o, i) => {
            const Icon = ICONS[o] || User;
            const on = o === value;
            return (
              <button key={o} type="button" role="option" aria-selected={on} tabIndex={-1} className="value"
                ref={(el) => (opts.current[i] = el)} onClick={() => choose(o)} onKeyDown={(e) => onOptionKey(e, i)}>
                <Icon aria-hidden="true" strokeWidth={1.75} />
                <span className="capitalize">{o}</span>
                {on && <Check className="tick" aria-hidden="true" strokeWidth={2.25} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
