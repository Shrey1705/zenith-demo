# Build report — fe3c680

_Evaluated 2026-07-17 · 7 personas × 2 runs · judge: mlx-community/Qwen2.5-Coder-14B-Instruct-4bit (local)_

## Overall Product Score: 3.53 / 5 — **NOT-READY** (confidence: high)

Would pay today: nobody (0/7)

## Critical blockers
- **likelihoodToPay** scored ≤2 by: cto, enterprise-pm, insurance-pm, product-analyst
- **likelihoodToRecommend** scored ≤2 by: ai-founder, cto, enterprise-pm, insurance-pm, product-analyst, startup-pm

## Bugs reported
- The 'Reset demo data' option doesn't clearly indicate that it will erase all local data, which could be risky for users. (ai-founder)
- The 'Reset demo data' option is not clearly labeled, and its implications are not explained. (cto)
- The 'Reset demo data' option is available in the settings, which could lead to accidental data loss. (eng-manager)
- The 'Reset demo data' option does not clear the local storage, leaving the workspace unchanged. (eng-manager)
- The 'Reset demo data' option does not clear the localStorage on another device, leading to confusion. (enterprise-pm)
- The demo data reset option is not clearly labeled or accessible, causing confusion. (enterprise-pm)
- The 'Reset demo data' option is not clearly labeled or explained. (insurance-pm)
- The 'Configure local AI' section assumes prior knowledge of Ollama and model setup. (insurance-pm)
- The 'Reset demo data' option is available, but it's unclear what happens to the data on another device. (product-analyst)
- The 'Reset demo data' option does not clearly indicate what data will be lost, which could lead to accidental data loss. (product-analyst)
- The 'Reset demo data' option is not clearly labeled; it's easy to accidentally reset your work. (startup-pm)

## Persona breakdown

| Persona | Weighted | Pay? | Recommend? | Lowest categories |
|---|---|---|---|---|
| Arjun — Product Analyst supporting three PMs | 3.75 | ❌ | ❌ | likelihoodToPay 2, likelihoodToRecommend 2 |
| Dev — solo technical founder building an AI product | 3.65 | ❌ | ❌ | likelihoodToRecommend 2, navigation 3 |
| Sana — Engineering Manager partnering with product | 3.65 | ❌ | ❌ | navigation 3, trust 3 |
| Priya — PM at a 15-person B2B SaaS startup | 3.65 | ❌ | ❌ | likelihoodToRecommend 2, navigation 3 |
| Vikram — CTO at a 200-person fintech, buys for the product org | 3.4 | ❌ | ❌ | likelihoodToPay 2, likelihoodToRecommend 2 |
| Rajesh — Senior PM at a 5,000-person enterprise | 3.3 | ❌ | ❌ | likelihoodToRecommend 1, likelihoodToPay 2 |
| Meera — Product Manager at a health insurer | 3.3 | ❌ | ❌ | likelihoodToRecommend 1, likelihoodToPay 2 |

### Dev — solo technical founder building an AI product — 3.65/5
> This tool is promising, but the lack of a clear pricing model and payment option is a significant barrier.

**Pain points:**
- No pricing page or way to pay, which is a deal-breaker for a tool I might want to use long-term.
- The demo account feels like a shared resource, which could lead to data conflicts or loss.
- The lack of a guided installer for the local AI model setup is a bit frustrating.
- The lack of a pricing page and the inability to pay for a personal workspace is a significant barrier.
- The demo data resets periodically, which is inconvenient for trying out features.

**Feature requests:**
- Add pricing information and a way to pay for a personal account.
- Implement a more robust local AI model setup guide or installer.
- Offer more control over data storage and management, especially for sensitive information.
- Add a pricing page and the ability to pay for a personal workspace.
- Allow for persistent storage of demo data.

### Vikram — CTO at a 200-person fintech, buys for the product org — 3.4/5
> This tool is promising, but the lack of a payment option and transparency around data handling is a deal-breaker.

**Pain points:**
- No pricing page or payment option, which is a significant barrier for adoption.
- The AI's responses are deterministic and do not admit uncertainty, which is a concern for complex financial products.
- No clear data handling or privacy story, which is a critical issue for handling sensitive financial data.
- No pricing page or sign-up process, which is a significant barrier to adoption.
- The AI's responses are deterministic and do not admit uncertainty, which is a concern for a CTO.

**Feature requests:**
- Add a pricing page and payment option to facilitate adoption.
- Implement a feature that allows the AI to admit uncertainty in its responses.
- Provide a clear data handling and privacy policy to build trust.
- Add a pricing page and sign-up process.
- Provide more detailed information about data storage and security.

### Sana — Engineering Manager partnering with product — 3.65/5
> This tool seems promising, but I need more clarity on how to use it in a real-world scenario.

**Pain points:**
- No pricing page or sign-up process, which makes it hard to assess the product's value.
- The demo account is shared, and data is stored in localStorage, which could be a concern for confidential work.
- No clear indication of how to adopt the product for a real project.
- No pricing or payment options available, which is a significant barrier to adoption.
- The demo account is shared, and data is stored locally, which could be problematic for real work.

**Feature requests:**
- A pricing page and sign-up process to facilitate adoption and payment.
- A clear adoption path for integrating the product into a real project.
- A more robust data handling and privacy policy to build trust.
- Add pricing and payment options to facilitate adoption.
- Implement a persistent workspace that allows for real work without relying on local storage.

### Rajesh — Senior PM at a 5,000-person enterprise — 3.3/5
> This tool seems promising, but the lack of a payment option and shared demo account are major red flags.

**Pain points:**
- No pricing page or way to pay, which is a deal-breaker for an enterprise.
- The demo account is shared, which could lead to data conflicts and security issues.
- The AI model requires a local setup, which might be challenging for IT departments.
- No pricing or payment options available, which is a significant barrier to adoption.
- Traceability and audit trail features are not as robust as expected, especially for complex enterprise workflows.

**Feature requests:**
- Option to export and import data for backup and version control.
- Integration with existing enterprise security protocols and compliance frameworks.
- Add pricing and payment options to facilitate adoption.
- Enhance traceability and audit trail features to better support enterprise requirements.
- Provide on-prem or local data guarantees to address security concerns.

### Meera — Product Manager at a health insurer — 3.3/5
> I appreciate the deterministic engine and the ability to trace documents, but I need more assurance about data handling.

**Pain points:**
- No clear indication of where data is stored or whether it complies with internal policies.
- No pricing or payment options, limiting the ability to evaluate the tool's value.
- The demo account uses localStorage, which is not suitable for regulated environments.
- The compliance blocks any tool that sends data outside, but this tool seems to rely on a local model which is not clear.
- The navigation is somewhat confusing, especially with the sidebar and the project lifecycle strip.

**Feature requests:**
- Add clear data storage and compliance information.
- Provide pricing and payment options for evaluation.
- Enable local-only data processing to comply with internal policies.
- A clear privacy policy and data handling statement.
- A guided installer for setting up the local AI model.

### Arjun — Product Analyst supporting three PMs — 3.75/5
> This tool has potential, but the lack of a payment option is a deal-breaker for me.

**Pain points:**
- No pricing or payment options available, which is a significant barrier to adoption.
- The demo account is shared, which could lead to data conflicts or privacy concerns.
- The AI's responses are deterministic, which might not always align with real-world scenarios.
- The demo data resets periodically, which disrupts the workflow and makes it difficult to build trust in the tool.
- The trust in the AI's answers is slightly compromised due to the lack of a clear privacy policy or data handling statement.

**Feature requests:**
- Implement a pricing model and payment options to allow for actual use.
- Provide a way to create a personal workspace with data isolation.
- Introduce more flexible AI responses to better handle real-world complexities.
- Implement a pricing page and payment options to allow for a more realistic evaluation of the tool.
- Provide a more detailed privacy policy and data handling statement to build trust.

### Priya — PM at a 15-person B2B SaaS startup — 3.65/5
> This tool is promising, but it needs more customization and a way to save my work without losing it.

**Pain points:**
- No pricing page or sign-up option; the demo account is shared and data is wiped on reset.
- The AI's knowledge seems generic and not deeply integrated with the product's specific domain.
- The navigation is somewhat clunky, especially when trying to find specific documents.
- No pricing page or sign-up option, which is a deal-breaker for a tool I might want to use regularly.
- The demo data resets periodically, which makes it hard to build a continuous workflow.

**Feature requests:**
- Ability to connect a local AI model without a guided installer.
- Pricing and sign-up options for a personal workspace.
- More detailed and product-specific AI responses.
- Add a pricing page and sign-up option.
- Implement a persistent workspace that doesn't reset periodically.

---
_Suggested improvements = intersection of pain points across personas; run `npm run sim:interview` to turn this report into real-user interview guides._