OUR UNDERSTANDING OF THE GIVEN PROBLEM STATEMENT:
We understand the problem not as a lack of rules but as a lack of a reliable checkpoint before publication. Teams need a system that reads the content, compares it against approved guidelines, facts and assets, and explains each issue by pointing to the specific source involved. It should suggest corrections that preserve the creator’s original intent rather than simply rejecting the work, and it must never override human judgment. Creators, managers and authorised reviewers need a shared workflow with comments, approvals and revision history, so accountability stays with people while automation handles the repetitive checking. The solution must also handle multiple content formats, surface recurring mistakes and unclear guidelines so the brand rules themselves can improve, and protect confidential brand material with clear disclosure of where AI or external services are used. In short, the goal is to make brand consistency proactive, explainable and trustworthy rather than reactive and manual.

USERS AFFECTED BY THE PROBLEM:
The problem affects people inside the organisation, and the audience outside it.
The main problem here is the brand inconsistency. A problem that we aim to solve.
It affects different groups of people, each in a different way.

Brand and marketing managers are responsible for consistency but cannot manually check every post, email and deck, and they only discover errors after publication
Legal, compliance and regional reviewers become a bottleneck, reviewing high-risk claims without context, version history or a clear audit trail.
External agencies and freelancers work from outdated or incomplete guidelines and have no quick way to check their work against the brand’s latest rules.
Beyond the organisation, customers and the public are affected when they receive conflicting messages, inaccurate claims or inaccessible content, and the organisation itself bears the cost in lost credibility, regulatory risk and rework.
Our platform is designed primarily for the first three groups, with agencies supported through limited-access accounts.


OUR PROPOSED SOLUTION AND WORKFLOW:
We propose VOUCHLY, a web-based brand-governance platform that checks content against an organisation’s approved sources before it is published. Brand managers first build a central knowledge base by uploading guidelines, approved facts, terminology lists and reusable assets. Creators then submit text, images, documents or decks, and the system runs a set of automated checks for tone, terminology, factual accuracy, unsupported promotional claims, visual consistency and accessibility. Each finding explains what was flagged and why, quotes the exact guideline or approved fact involved (or states that no supporting source exists), and offers a suggested rewrite that preserves the creator’s original intent. Nothing is changed automatically: the creator can accept, edit or dispute every suggestion. Content then moves through a role-based approval workflow with comments, revision history and sign-off by authorised reviewers, so high-risk items always get human judgment. Over time, the platform analyses recurring violations and frequently disputed rules, giving managers insights into where creators need training and where the guidelines themselves are unclear. For confidentiality, workspaces can choose between a cloud AI model and a locally hosted one, and the interface clearly discloses where AI is used. Together these features shift brand consistency from slow, reactive correction to fast, explainable prevention.








TECH STACK:
LAYER:				CHOICE:						              WHY?:
Frontend			Next.js, React, Tailwind			Fast to build, accessible, easy to deploy
Backend				FastAPI						(Python)	Same language as the AI and parsing libraries
Database			MYSQL,SQLITE					Users, versions, comments, findings, audit log
Retrieval			ChromaDB					Cited, source-grounded findings
Parsing				PyMuPDF, python-docx, python-pptx		PDF, Word and deck support
Image checks			Pillow, Tesseract, vision LLM			Palette, contrast, logo, embedded text
AI				Claude API, with Ollama as local option		Quality by default, privacy when needed
Auth/roles			JWT with role-based access control		Creator, manager, reviewer, admin
cybersecurity			to stop unwanted and harmful attacks		cloud based bot protection
Deployment			Vercel, Render or Docker, GitHub		Judge-accessible link and repo
A local/cloud ai will be involved in monitoring all of these workflows.


RESPONSIBILTIES OF EACH TEAM MEMBERS:
EKANSH GUPTA---------(FULL STACK AND AI INTEGRATION)
Responsible for the overall developmental process of the project and maintain proper coordination with the backend and frontend.
HARSH KUMAR----------(BACKEND, API ENDPOINTS AND TEST DATA)
Responsible for assistance and development in the backend, especially in api integration and the database.
ADITYA VISWAKARMA----(BACKEND)
Responsible for the logic handling of the products huge and accurate verification systems, whilst carrying out the workflow of the product.
ADITI SHARMA---------(FRONTEND,UI UX)
Responsible for designing the frontend via Tailwind, css, jss, html and handling UI UX.

DEVELOPMENTAL PROCESS FROM ROUND 1 TO 3:
Round 1: The problem statement was approached and a viable and efficient system design was designed with workflow design and team role decision.
Round 2: A fully developed version of the web application will be ready with complete api and ai integration along with all the above mentioned features
Round 3: A critical testing phase will be conducted to make out the developed product's flaws and its entire structure will be made more efficient for the finals.

EXPECTED IMPACT OF OUR SOLUTION:
VOUCHLY is expected to move brand consistency from reactive correction to proactive prevention. By catching tone, terminology, factual and accessibility issues before publication, it should reduce the number of public mistakes, takedowns and corrections that damage credibility. Creators get instant, explained feedback, so they spend less time waiting for reviews and less time reworking content after it is rejected. Managers and reviewers are freed from checking routine issues and can focus on high-risk items, with a full audit trail that supports compliance. Because the platform tracks recurring violations and frequently disputed rules, it also improves the brand guidelines themselves and shows where creators need training. Over time, the organisation gains faster publishing cycles, more consistent messaging across employees, agencies and AI tools, lower legal and regulatory risk from unsupported claims, and more inclusive content through built-in accessibility checks. The human-in-the-loop design keeps accountability with people, so the organisation can adopt AI assistance without losing control over its brand.


FUTURE SCOPE OF THE PRODUCT AFTER THE EVENT:
After the event, BrandGuard can grow from a pre-publication checker into a full brand-governance layer. In the near term, we would integrate with tools teams already use (Slack, Google Workspace, Microsoft 365, Figma, WordPress) so content is reviewed where it is created. Next, we would add multilingual and regional brand variants, video and audio review, and deeper visual checks such as logo misuse. The platform could also learn from approved and disputed decisions to improve checks for each organisation, with humans staying in control, and flag claims that become outdated when source documents change. For enterprise adoption, we would add single sign-on, on-premises deployment and compliance reporting. Longer term, a public API would let agencies and AI content generators check content against the brand automatically, making brand-safe content the default.


TEAM:			ROLE:
EKANSH GUPTA            FULL STACK
HARSH KUMAR             BACKEND 
ADITYA VISHWAKARMA      BACKEND
ADITI SHARMA            FRONTEND















