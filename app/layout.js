import "./globals.css";
import { Provider } from "@/lib/store";
import { site } from "@/lib/site";

export const metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Vouchly: check content against your brand rules", template: "%s | Vouchly" },
  description: "Vouchly checks drafts against your approved guidelines, facts and terminology before they are published, and keeps a person in charge of every decision.",
  openGraph: { title: "Vouchly", siteName: "Vouchly", url: site.url, type: "website" },
};

// Runs before the first paint so the page never flashes the wrong theme.
const THEME_SCRIPT = `try{var t=localStorage.getItem("vouchly-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body><Provider>{children}</Provider></body>
    </html>
  );
}
