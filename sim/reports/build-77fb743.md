# Build report — 77fb743

_Evaluated 2026-07-16 · 7 personas × 3 runs · judge: mlx-community/Qwen2.5-Coder-14B-Instruct-4bit (local)_

## Overall Product Score: 3.56 / 5 — **NOT-READY** (confidence: medium)

Would pay today: nobody (0/7)

## Critical blockers
- **likelihoodToPay** scored ≤2 by: cto, enterprise-pm, product-analyst
- **likelihoodToRecommend** scored ≤2 by: cto, eng-manager, enterprise-pm, insurance-pm, product-analyst, startup-pm

## Bugs reported
- The 'Reset demo data' option is not clearly labeled or explained, leading to potential confusion. (ai-founder)
- The 'Reset demo data' option doesn't clearly indicate that it will wipe all local data. (ai-founder)
- The 'Configure local AI' section assumes Ollama is already installed and models pulled, which isn't obvious. (ai-founder)
- The 'Reset demo data' button does not clear all data, as another device shows nothing. (cto)
- The 'Reset demo data' option does not clear the local storage completely, leaving some data behind. (eng-manager)
- The 'Reset demo data' option does not clear the localStorage on another device, which is confusing. (eng-manager)
- The 'Reset demo data' option does not clearly indicate what data will be lost, which could lead to accidental data loss. (enterprise-pm)
- The 'Reset demo data' option is not clearly labeled or explained, leading to confusion. (enterprise-pm)
- The 'Reset demo data' option is not clearly labeled. It's easy to miss and could lead to accidental data loss. (insurance-pm)
- The 'Reset demo data' option does not clearly indicate what data will be reset or how it affects other devices. (insurance-pm)
- The 'Reset demo data' button does not clear the localStorage data, which is misleading. (insurance-pm)
- The 'Reset demo data' option doesn't clearly indicate what data will be lost, which could be confusing for users. (product-analyst)
- The 'Reset demo data' option is not clearly labeled as destructive, which could lead to accidental data loss. (product-analyst)
- The 'Reset demo data' option is not clearly explained, and its impact on data is not made explicit. (startup-pm)
- The 'Reset demo data' option doesn't clearly indicate that all workspace data will be wiped. (startup-pm)
- The 'Configure local AI' section assumes the user has Ollama installed and models pulled, which might not be the case for everyone. (startup-pm)
- The 'Reset demo data' option does not clearly indicate that it will wipe all local storage data. (startup-pm)
- The 'Configure local AI' section assumes the user has Ollama installed and running, which is not obvious. (startup-pm)

> Noisy judges (variance ≥2 in some category — treat their scores with care): eng-manager

## Persona breakdown

| Persona | Weighted | Pay? | Recommend? | Lowest categories |
|---|---|---|---|---|
| Dev — solo technical founder building an AI product | 3.75 | ❌ | ❌ | navigation 3, trust 3 |
| Arjun — Product Analyst supporting three PMs | 3.75 | ❌ | ❌ | likelihoodToPay 2, likelihoodToRecommend 2 |
| Priya — PM at a 15-person B2B SaaS startup | 3.65 | ❌ | ❌ | likelihoodToRecommend 2, navigation 3 |
| Sana — Engineering Manager partnering with product | 3.5 | ❌ | ❌ | likelihoodToRecommend 2, onboarding 3 |
| Meera — Product Manager at a health insurer | 3.45 | ❌ | ❌ | likelihoodToRecommend 2, navigation 3 |
| Vikram — CTO at a 200-person fintech, buys for the product org | 3.4 | ❌ | ❌ | likelihoodToPay 2, likelihoodToRecommend 2 |
| Rajesh — Senior PM at a 5,000-person enterprise | 3.4 | ❌ | ❌ | likelihoodToRecommend 1, likelihoodToPay 2 |

### Dev — solo technical founder building an AI product — 3.75/5
> This tool is pretty solid for a local-first approach, but the lack of a clear pricing model is a major roadblock.

**Pain points:**
- No pricing page or payment options, which is a deal-breaker for a product that needs to be self-hosted and local-first.
- The demo login is shared, which is not ideal for confidential work.
- No pricing page or way to pay, which is a significant barrier for a solo founder looking to adopt the tool.
- The demo account is shared, which could lead to data conflicts or privacy issues.
- The lack of a guided installer for the local model setup is a friction point.

**Feature requests:**
- Add pricing options and payment methods for a one-time purchase model.
- Provide more customization options for the local AI model configuration.
- Add pricing information and a subscription model.
- Implement a more robust account management system for solo users.
- Provide a more detailed explanation of the 'Reset demo data' option.

### Vikram — CTO at a 200-person fintech, buys for the product org — 3.4/5
> The platform is promising, but the lack of pricing and payment options is a deal-breaker.

**Pain points:**
- No pricing or payment options available, which is a significant barrier to adoption.
- The AI's answers were deterministic and did not admit uncertainty, which is a concern for governance.
- No clear data handling or privacy story provided, making it hard to trust the platform with confidential information.
- No pricing or payment options, which is a deal-breaker for a serious product.
- No clear data handling or privacy story, which is a concern for handling sensitive financial documents.

**Feature requests:**
- Add pricing and payment options to facilitate adoption.
- Implement a feature that allows the AI to admit uncertainty in its answers.
- Provide a clear data handling and privacy policy.
- Add pricing and payment options.
- Support offline AI models for secure usage.

### Sana — Engineering Manager partnering with product — 3.5/5
> The AI is quite helpful, but the lack of a pricing page and persistent storage makes it difficult to use for real projects.

**Pain points:**
- No pricing page or sign-up option, which makes it hard to evaluate the product's value.
- The demo account uses localStorage, so data is lost between sessions, which is inconvenient for a real project.
- No clear way to connect to a local AI model, which limits the AI's capabilities.
- No pricing or sign-up options; the demo account is shared and data is wiped on reset.
- The navigation can be confusing, especially with multiple levels of documents and versions.

**Feature requests:**
- Add a pricing page and sign-up option to evaluate the product's value.
- Implement a persistent storage solution for demo data.
- Provide clear instructions on how to connect to a local AI model.
- Add pricing and sign-up options for a dedicated workspace.
- Implement a more intuitive navigation system with clear labels and search functionality.

### Rajesh — Senior PM at a 5,000-person enterprise — 3.4/5
> This tool seems promising, but the lack of a payment option and detailed privacy information is a deal-breaker for our enterprise.

**Pain points:**
- No pricing page or payment option, which is a significant barrier for adoption.
- Traceability matrix and audit trail features are not clearly demonstrated or explained.
- The demo data resets periodically, which could be problematic for a real-world enterprise use case.
- No pricing page or way to pay, which is a significant barrier for adoption.
- The AI model is not connected by default, requiring manual configuration which is not intuitive.

**Feature requests:**
- Need more detailed information on data handling and privacy policies.
- A pricing page and payment option should be available for enterprise customers.
- Option to export audit trails and traceability matrices in a more structured format.
- Add a pricing page and payment options.
- Improve the traceability matrix and audit trail features with more detailed examples.

### Meera — Product Manager at a health insurer — 3.45/5
> This tool seems promising, but I need more assurance about data handling and privacy.

**Pain points:**
- The compliance blocks any tool that sends data outside, but Feasly processes data locally. This is a red flag for me.
- The navigation could be more intuitive. I had to look around a bit to find where to save research notes and generate project documents.
- There is no pricing page or way to pay. I'm not sure if this is a free trial or a permanent demo.
- The demo account is shared, which could lead to data conflicts or privacy issues.
- The lack of a pricing page and payment option makes it unclear how to proceed with actual use.

**Feature requests:**
- A pricing page and payment option would be necessary for me to consider using this tool in a production environment.
- More detailed documentation on how to connect local models, especially for those who are not technically savvy.
- A clear pricing page and payment option to facilitate adoption.
- A guided installer or setup assistant for the local model configuration.
- An option to export or save work in a more persistent manner than localStorage.

### Arjun — Product Analyst supporting three PMs — 3.75/5
> This tool has potential, but the lack of a payment option is a significant barrier.

**Pain points:**
- No pricing or payment options available, which is a deal-breaker for my budget-sensitive role.
- The demo account data is stored locally, meaning it's not accessible across devices, which limits its usefulness for collaborative work.
- The lack of a guided installer for connecting local AI models adds complexity for users who may not be technically adept.
- No pricing or payment options available, which is a significant barrier for budget-sensitive users like me.
- The demo account is shared, which could lead to data conflicts or privacy issues.

**Feature requests:**
- Add pricing and payment options to allow for budget approval.
- Implement a cloud-based storage solution to preserve data across devices.
- Provide a more detailed guided installer for connecting local AI models.
- Implement a more flexible AI that can handle a wider range of research scenarios.
- Provide more detailed documentation on how to connect local models, as the current setup assumes prior knowledge.

### Priya — PM at a 15-person B2B SaaS startup — 3.65/5
> This tool is promising, but the lack of a pricing page and the shared demo account are deal-breakers.

**Pain points:**
- No pricing page or sign-up option, which is a significant barrier to adoption.
- The demo account is shared, which could lead to data conflicts or privacy concerns.
- No clear indication of how to connect a local AI model, which is a technical barrier.
- No pricing or sign-up options, which is a deal-breaker for a tool I might want to use regularly.
- The demo data resets periodically, which makes it hard to build a consistent workflow.

**Feature requests:**
- Add a pricing page and sign-up option to facilitate adoption.
- Provide more detailed instructions on connecting a local AI model.
- Implement a more robust data management system to handle personal workspaces.
- Add pricing and sign-up options to allow for a free trial or subscription.
- Provide more detailed information on data handling and privacy to build trust.

---
_Suggested improvements = intersection of pain points across personas; run `npm run sim:interview` to turn this report into real-user interview guides._