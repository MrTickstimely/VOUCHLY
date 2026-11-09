import Legal from "@/components/Legal";
import { site } from "@/lib/site";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <Legal title="Privacy policy">
      <p>This policy explains what personal data Vouchly collects, why, who else handles it, and what choices you have. {site.company} runs Vouchly and is responsible for the data described here.</p>

      <h2>What we collect</h2>
      <ul>
        <li>Account data: your email address, your role in the workspace and a hashed password. We never store your password in readable form.</li>
        <li>Content you submit: the text, documents, decks and images you upload for checking, every saved version of them, and the findings, comments and approval decisions attached to them.</li>
        <li>Brand sources: the guidelines, approved facts, terminology lists and assets your workspace uploads.</li>
        <li>Audit records: who did what and when inside a workspace, so that reviews can be traced.</li>
        <li>Technical data: your IP address and basic request information, kept in server logs for security and to keep the service running.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To run the service: checking drafts, showing findings and managing review and approval.</li>
        <li>To show workspace managers which rules are broken or disputed most often.</li>
        <li>To keep the service secure and to investigate abuse.</li>
      </ul>
      <p>We do not sell personal data, and we do not use your content to train AI models.</p>

      <h2>Where AI is used</h2>
      <p>Checking a draft uses an AI model. A workspace administrator chooses one of two options, and the choice is shown inside the workspace.</p>
      <ul>
        <li>Cloud: the draft and the passages from your sources that match it are sent to the cloud AI provider the workspace is set up with, to produce findings and suggested rewrites. Depending on the workspace, that provider is Anthropic (Claude), Groq or OpenRouter, and the workspace shows which one is in use.</li>
        <li>Local: a model hosted on your own infrastructure does the checking. Content is not sent to an outside AI service.</li>
      </ul>
      <p>AI output is a suggestion. People in your workspace make every final decision.</p>

      <h2>Who else handles your data</h2>
      <ul>
        <li>The cloud AI provider named in your workspace (Anthropic, Groq or OpenRouter), only when the workspace uses the cloud AI option.</li>
        <li>Our hosting and infrastructure providers, who store and serve the data on our behalf.</li>
      </ul>
      <p>We do not share personal data with advertisers.</p>

      <h2>Cookies and tracking</h2>
      <p>Vouchly uses only the storage needed to keep you signed in. It does not use advertising cookies or third party analytics. Fonts are served from our own domain, so visiting the site does not send your address to a font provider.</p>

      <h2>How long we keep data</h2>
      <p>We keep workspace data while the workspace is active. A workspace administrator can ask us to delete the workspace, and we delete its content within 30 days, except where the law requires us to keep a record. Server logs are kept for a short period for security.</p>

      <h2>Your rights</h2>
      <p>You can ask us to give you a copy of your personal data, correct it or delete it, and you can object to how we use it. Depending on where you live, laws such as India's Digital Personal Data Protection Act, 2023 or the GDPR give you these rights formally, including the right to complain to your data protection authority. Email {site.email} to make a request.</p>

      <h2>Security</h2>
      <p>Access is controlled by role, passwords are hashed, connections are encrypted, and every review action is logged. No system is perfectly secure, so if we learn of a breach affecting your data we will tell you.</p>

      <h2>Children</h2>
      <p>Vouchly is built for organisations and is not intended for anyone under 18.</p>

      <h2>Changes to this policy</h2>
      <p>If we change this policy in a way that matters, we will update the date above and tell workspace administrators.</p>

      <h2>Contact</h2>
      <p>{site.company}, {site.email}</p>
    </Legal>
  );
}
