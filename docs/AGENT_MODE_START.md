# Starting a new Arena Agent Mode chat

## What is and is not automatic

Arena's [coding guide](https://help.arena.ai/articles/1655691990-how-to-use-coding-in-agent-mode) describes creating a separate repository copy at session start. It does not document automatic loading of repository instruction files. Root [AGENTS.md](../AGENTS.md) follows a common cross-agent convention, but its automatic discovery in Arena Agent Mode has **not been verified**. An agent that reads it can follow the project startup and skill-routing instructions; the file itself does not start an agent or execute a workflow.

This session cannot create or inspect a separate Agent Mode chat, so fresh-session behavior remains untested. Repository changes must first be committed and made available in the revision selected by the new chat; an uncommitted change in this workspace or a different branch may not be present. Ask for approval before pushing or merging. Do not assume these instructions apply to chats that cannot see the relevant revision.

## Reusable initialization prompt

Connect this GitHub repository in a new Arena Agent Mode chat, make sure it uses a revision containing these files, and paste the following before your task:

```text
For this task, first read the repository-root AGENTS.md and then read
AI_AGENT_INSTRUCTIONS.md, PROJECT_CONTEXT.md, CURRENT_STATUS.md, and
docs/SKILL_SYSTEM.md. Follow applicable project guidance subject to my
instructions and the environment's higher-priority rules. Check the actual
Git branch, status and revision before editing; preserve unrelated work.

Discover the skills and workflows relevant to my task using the catalog and
CLI. Read the original instructions for selected skills, use only appropriate
and authorized helpers, verify results, and state what you actually used and
any limitations. If no skill applies, say so rather than forcing one. Do not
push, publish, or perform destructive operations without my approval.

My task: [describe the task here]
```

## Fresh-chat verification (manual)

After the changes are available on the revision the new chat selects, start a new chat **without** the initialization prompt and ask a benign project task that does not name these files. Inspect the agent's tool activity and response for evidence that it independently read `AGENTS.md`, all four startup documents, and selected appropriate skills. A plausible answer or merely mentioning a file is not proof that it was loaded. If any evidence is absent, automatic initialization is unverified; use the explicit prompt above. Even a successful one-chat trial demonstrates only that session, not a guarantee across models or future sessions. If testing with the explicit prompt instead, report that as a manual-prompt test, not an automatic-loading test.
