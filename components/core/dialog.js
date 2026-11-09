"use client";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

// Compound dialog with the motion-primitives names: Dialog, DialogTrigger, DialogContent, DialogHeader,
// DialogTitle, DialogDescription, DialogClose. It sits on the native <dialog> element, so focus is trapped,
// Escape closes it and screen readers announce the title and description.
// Use it uncontrolled (with a DialogTrigger) or controlled (open and onOpenChange).
const Ctx = createContext(null);
function useDialog() {
  const c = useContext(Ctx);
  if (!c) throw new Error("Dialog parts must be used inside <Dialog>.");
  return c;
}

export function Dialog({ children, open: openProp, defaultOpen = false, onOpenChange }) {
  const [inner, setInner] = useState(defaultOpen);
  const [hasDesc, setHasDesc] = useState(false);
  const id = useId();
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : inner;
  const setOpen = (v) => {
    if (!controlled) setInner(v);
    if (onOpenChange) onOpenChange(v);
  };
  return (
    <Ctx.Provider value={{ open, setOpen, titleId: id + "-title", descId: id + "-desc", hasDesc, setHasDesc }}>
      {children}
    </Ctx.Provider>
  );
}

export function DialogTrigger({ children, className }) {
  const { setOpen } = useDialog();
  return <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={className}>{children}</button>;
}

export function DialogContent({ children, className }) {
  const { open, setOpen, titleId, descId, hasDesc } = useDialog();
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={hasDesc ? descId : undefined}
      onClose={() => { if (open) setOpen(false); }}
      onClick={(e) => { if (e.target === ref.current) setOpen(false); }}
      className="max-h-[90vh] w-[min(92vw,28rem)] overflow-auto rounded border border-line bg-white p-0 text-ink backdrop:bg-ink/40"
    >
      {/* Pass your own padding in className. Without it the content gets p-5. */}
      <div className={"relative " + (className || "p-5")}>{children}</div>
    </dialog>
  );
}

export function DialogHeader({ children, className }) {
  return <div className={"pr-8 " + (className || "")}>{children}</div>;
}

export function DialogTitle({ children, className }) {
  const { titleId } = useDialog();
  return <h2 id={titleId} className={"text-lg font-semibold " + (className || "")}>{children}</h2>;
}

export function DialogDescription({ children, className }) {
  const { descId, setHasDesc } = useDialog();
  useEffect(() => {
    setHasDesc(true);
    return () => setHasDesc(false);
  }, [setHasDesc]);
  return <p id={descId} className={"mt-2 text-sm text-mute " + (className || "")}>{children}</p>;
}

// With children it is a text button (for example Cancel). Without children it is the corner close icon.
export function DialogClose({ children, className }) {
  const { setOpen } = useDialog();
  if (children) return <button type="button" onClick={() => setOpen(false)} className={className}>{children}</button>;
  return (
    <button type="button" aria-label="Close" onClick={() => setOpen(false)}
      className={"absolute right-3 top-3 rounded p-1 text-mute hover:bg-paper hover:text-ink " + (className || "")}>
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
