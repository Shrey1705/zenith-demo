# Feasly integrations (n8n)

Feasly exposes two tiny endpoints; [n8n](https://n8n.io)'s 400+ connectors do the rest.
n8n is **self-hostable**, so the whole chain can run on your own machines — consistent
with Feasly's "your documents never leave your laptop" promise.

## The two endpoints

| What | Call |
|---|---|
| Send anything into your **Inbox** project | `POST /api/ai/inbox` — body `{ "title", "content", "source"? }` |
| Fetch a finished **stakeholder update** | `GET /api/ai/playbooks/stakeholder-update?project=first` |

Base URL: your Feasly deployment (e.g. `https://zenith-health-demo.vercel.app`).
Auth: `Authorization: Bearer <integration token>` — mint one in **Feasly → Settings → Integrations**
(requires signing in with your email; the shared demo account has no private workspace to write to).

Inbox items appear in an auto-created **Inbox** project as research notes labeled
"Sent via integration" the next time you open Feasly.

## Quick start

```bash
npx n8n          # runs n8n locally at http://localhost:5678
```

1. In n8n: **Workflows → Import from file** → pick a template from this folder.
2. Open the HTTP Request node and replace `YOUR_FEASLY_INTEGRATION_TOKEN`.
3. Connect the trigger's account (Slack / IMAP) where applicable, then **Activate**.

## Templates

- **slack-saved-to-inbox.json** — react with 📌 to any Slack message → it lands as a research note.
- **email-forward-to-inbox.json** — watch a mailbox (e.g. a dedicated `notes@` address) → every mail becomes a research note.
- **friday-stakeholder-update.json** — every Friday 4pm, fetch the deterministic stakeholder-update playbook for your first project and post it to Slack. Swap the Slack node for email/Teams — the markdown is ready to send.

## Trying it without n8n

```bash
curl -X POST https://zenith-health-demo.vercel.app/api/ai/inbox \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello from curl","content":"This will appear in my Inbox project.","source":"curl"}'
```

## Notes

- Tokens live 365 days and are stateless — rotate by changing `AI_AUTH_SECRET` on the server (invalidates all tokens).
- Inbox caps: 32KB per item, 200 queued items (oldest dropped).
- The stakeholder update builds from your **synced** workspace — open Feasly at least once after making changes so the sync pushes them.
