"use client";
import { useEffect, useState } from "react";

// Light/dark switch. The theme lives in <html data-theme> (set before paint in app/layout.js)
// and is remembered in localStorage. Checked = dark.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  const change = (e) => {
    const next = e.target.checked ? "dark" : "light";
    setDark(e.target.checked);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("vouchly-theme", next); } catch (err) {}
  };
  return (
    <label className="ui-switch">
      <input type="checkbox" role="switch" checked={dark} onChange={change} aria-label="Dark mode" />
      <span className="slider"><span className="circle" /></span>
    </label>
  );
}
