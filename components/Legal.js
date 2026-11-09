import { site } from "@/lib/site";
export default function Legal({ title, children }) {
  return (
    <article className="legal max-w-3xl">
      <h1 className="font-serif text-4xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-mute">Last updated {site.updated}</p>
      {children}
    </article>
  );
}
