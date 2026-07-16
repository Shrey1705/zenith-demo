# Interview guide — from build 77fb743

_Generated 2026-07-16. These are HYPOTHESES from simulated personas — the point of the interview is to find out where the simulation was wrong._

## When talking to someone like: Dev — solo technical founder building an AI product

**Simulated verdict:** The product is promising but needs a clear pricing model and more customization options for local AI setup.

**Hypotheses to test (from simulated pain points):**
- H: "No pricing page or payment options, which is a deal-breaker for a product that needs to be self-hosted and local-first." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "The demo login is shared, which is not ideal for confidential work." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "No pricing page or way to pay, which is a significant barrier for a solo founder looking to adopt the tool." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "The demo account is shared, which could lead to data conflicts or privacy issues." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"

**Weak-category probes:**
- navigation scored 3/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.
- trust scored 3/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.
- likelihoodToPay scored 3/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.

**Requested features — validate before building:**
- "Add pricing options and payment methods for a one-time purchase model." — Ask: "If this feature existed, what would you stop using?"
- "Provide more customization options for the local AI model configuration." — Ask: "If this feature existed, what would you stop using?"
- "Add pricing information and a subscription model." — Ask: "If this feature existed, what would you stop using?"

**Money question:** their simulated answer was wouldPay=false. Ask the real one: "If this product disappeared next month, what would you miss? Would you be willing to pay ₹1,500/month to keep it?"

## When talking to someone like: Vikram — CTO at a 200-person fintech, buys for the product org

**Simulated verdict:** The product shows potential but falls short on critical aspects like pricing, data handling, and trust.

**Hypotheses to test (from simulated pain points):**
- H: "No pricing or payment options available, which is a significant barrier to adoption." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "The AI's answers were deterministic and did not admit uncertainty, which is a concern for governance." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "No clear data handling or privacy story provided, making it hard to trust the platform with confidential information." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "No pricing or payment options, which is a deal-breaker for a serious product." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"

**Weak-category probes:**
- likelihoodToPay scored 2/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.
- likelihoodToRecommend scored 2/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.
- trust scored 3/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.

**Requested features — validate before building:**
- "Add pricing and payment options to facilitate adoption." — Ask: "If this feature existed, what would you stop using?"
- "Implement a feature that allows the AI to admit uncertainty in its answers." — Ask: "If this feature existed, what would you stop using?"
- "Provide a clear data handling and privacy policy." — Ask: "If this feature existed, what would you stop using?"

**Money question:** their simulated answer was wouldPay=false. Ask the real one: "If this product disappeared next month, what would you miss? Would you be willing to pay ₹1,500/month to keep it?"

## When talking to someone like: Sana — Engineering Manager partnering with product

**Simulated verdict:** Feasly has potential, but the current demo setup and lack of pricing options make it hard to evaluate its value for real projects.

**Hypotheses to test (from simulated pain points):**
- H: "No pricing page or sign-up option, which makes it hard to evaluate the product's value." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "The demo account uses localStorage, so data is lost between sessions, which is inconvenient for a real project." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "No clear way to connect to a local AI model, which limits the AI's capabilities." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "No pricing or sign-up options; the demo account is shared and data is wiped on reset." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"

**Weak-category probes:**
- likelihoodToRecommend scored 2/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.
- onboarding scored 3/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.
- navigation scored 3/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.

**Requested features — validate before building:**
- "Add a pricing page and sign-up option to evaluate the product's value." — Ask: "If this feature existed, what would you stop using?"
- "Implement a persistent storage solution for demo data." — Ask: "If this feature existed, what would you stop using?"
- "Provide clear instructions on how to connect to a local AI model." — Ask: "If this feature existed, what would you stop using?"

**Money question:** their simulated answer was wouldPay=false. Ask the real one: "If this product disappeared next month, what would you miss? Would you be willing to pay ₹1,500/month to keep it?"

## When talking to someone like: Rajesh — Senior PM at a 5,000-person enterprise

**Simulated verdict:** Interesting tool, but the lack of a payment option and detailed privacy information makes it non-viable for our enterprise needs.

**Hypotheses to test (from simulated pain points):**
- H: "No pricing page or payment option, which is a significant barrier for adoption." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "Traceability matrix and audit trail features are not clearly demonstrated or explained." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "The demo data resets periodically, which could be problematic for a real-world enterprise use case." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "No pricing page or way to pay, which is a significant barrier for adoption." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"

**Weak-category probes:**
- likelihoodToRecommend scored 1/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.
- likelihoodToPay scored 2/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.
- trust scored 3/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.

**Requested features — validate before building:**
- "Need more detailed information on data handling and privacy policies." — Ask: "If this feature existed, what would you stop using?"
- "A pricing page and payment option should be available for enterprise customers." — Ask: "If this feature existed, what would you stop using?"
- "Option to export audit trails and traceability matrices in a more structured format." — Ask: "If this feature existed, what would you stop using?"

**Money question:** their simulated answer was wouldPay=false. Ask the real one: "If this product disappeared next month, what would you miss? Would you be willing to pay ₹1,500/month to keep it?"

## When talking to someone like: Meera — Product Manager at a health insurer

**Simulated verdict:** Feasly has potential but lacks transparency on pricing and payment, which are critical for a regulated industry like mine.

**Hypotheses to test (from simulated pain points):**
- H: "The compliance blocks any tool that sends data outside, but Feasly processes data locally. This is a red flag for me." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "The navigation could be more intuitive. I had to look around a bit to find where to save research notes and generate project documents." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "There is no pricing page or way to pay. I'm not sure if this is a free trial or a permanent demo." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"
- H: "The demo account is shared, which could lead to data conflicts or privacy issues." — Ask: "Can you walk me through the last time you encountered a similar issue with another product? What did you do to resolve it?"

**Weak-category probes:**
- likelihoodToRecommend scored 2/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.
- navigation scored 3/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.
- trust scored 3/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.

**Requested features — validate before building:**
- "A pricing page and payment option would be necessary for me to consider using this tool in a production environment." — Ask: "If this feature existed, what would you stop using?"
- "More detailed documentation on how to connect local models, especially for those who are not technically savvy." — Ask: "If this feature existed, what would you stop using?"
- "A clear pricing page and payment option to facilitate adoption."

_(polished by local model)_