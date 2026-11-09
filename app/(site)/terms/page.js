import Legal from "@/components/Legal";
import { site } from "@/lib/site";

export const metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <Legal title="Terms of use">
      <p>These terms govern your use of Vouchly, run by {site.company}. By creating an account or using the service you agree to them. If you use Vouchly for an organisation, you confirm that you can accept these terms for it.</p>

      <h2>Your account</h2>
      <p>Keep your sign-in details private and tell us if you think someone else has used them. Workspace administrators decide who joins a workspace and which role each person has. You are responsible for activity under your account.</p>

      <h2>Your content</h2>
      <p>You keep all rights to the content and brand material you upload. You give us permission to store and process it only to provide Vouchly to you, including sending it to the AI service your workspace has chosen. You confirm you have the right to upload it.</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not upload unlawful content or content that infringes someone else's rights.</li>
        <li>Do not try to break, overload or gain unauthorised access to the service or other workspaces.</li>
        <li>Do not use Vouchly to produce or approve deceptive, harmful or discriminatory material.</li>
      </ul>

      <h2>AI suggestions and human responsibility</h2>
      <p>Vouchly's findings and rewrites are generated automatically and can be wrong or incomplete. They are not legal, regulatory or professional advice. A passing check does not mean content is accurate, lawful or approved. Your reviewers remain responsible for what you publish.</p>

      <h2>Availability and changes</h2>
      <p>We work to keep Vouchly running, but we do not promise it will always be available or error free. We may change or remove features, and we will give notice of changes that significantly affect you.</p>

      <h2>Ending your use</h2>
      <p>You can stop using Vouchly at any time and ask us to delete your workspace. We may suspend or end access if these terms are broken or if the service is misused. Our privacy policy explains what happens to your data afterwards.</p>

      <h2>Liability</h2>
      <p>To the extent the law allows, Vouchly is provided as it is, and {site.company} is not liable for indirect or consequential loss, or for loss arising from content you publish. Nothing in these terms limits liability that cannot be limited by law.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of {site.jurisdiction}, and its courts have jurisdiction over disputes, unless your local consumer law says otherwise.</p>

      <h2>Changes and contact</h2>
      <p>If we update these terms we will change the date above, and continued use after that means you accept the update. Questions go to {site.email}.</p>
    </Legal>
  );
}
