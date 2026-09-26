# Cavalry plugin improvements from the Institute-Of-AI run

**Date:** 2026-09-26  
**Plugin version reviewed:** `cavalry` 0.1.0 (`skills/{recon,fortify,charge,regroup,status,breach}/SKILL.md`, `shared/TRACKER-CONVENTION.md`)  
**Run reviewed:** Recon → Fortify → Charge Q1–Q8 → Regroup (mid-Charge) → Charge Q9–Q11, PRs #1–#29, paused before promoting Q9–Q11 to main.  
**Purpose:** list where the plugin should change so that the next program uses less context and fewer model turns, catches setup problems during pre-flight, and loops less. Each proposal names the file and section to edit.

---

## 1. Headline numbers

These come from this session's transcript (`2c80d8f1…jsonl`) and from `gh pr list`.

| Metric | Value | Why it matters |
|---|---|---|
| Model turns (main session) | **1,560** | Each turn re-sends the whole context |
| Mean context per turn | **~516k tokens** (median 518k, p90 821k, max 963k) | Context stayed near the top of the window for most of the run |
| Cached input tokens read | **~801M** (+4.1M cache writes, 1.45M output) | ≈ turns × context. This is where most of the cost went |
| Recon subagents | 5 agents, **112k–182k tokens each (~720k)** | The same bugs were reported in up to 3 docs |
| Tool calls | 792 (Bash 543, Edit 98, Write 89) | Bash dominates, and much of it was plumbing |
| Sandbox "too complex" rejections | **18** | Each rejection cost a retry turn |
| Tool errors | 29 | |
| ci-monitor wake-ups | **20**, of which **13** were `vercel[bot]` deploy comments | Mostly no-op turns |
| Tracker-touching tool calls | **116** (44 reads, 72 writes/scripts) | `CAVALRY-TRACKER.md` is now **41.9 KB (~10k tokens)** across 34 commits |
| PRs total | 29 | |
| PRs that were plumbing only (no code change) | **4**: #5 (main→staging), #6 (Q1 re-sent to main), #12 and #13 (history reconcile/relink) | Caused by merge-method and ruleset surprises |
| Promotion PRs (staging→main) | 7: #1, #3, #9, #11, #19, #24, #26 | #11 and #12 were squash-merged by mistake, which forced the #13 relink |
| Compactions/resumes | 2 (plus one model switch, Opus→Sonnet→Opus) | Scratchpad helper scripts were lost on resume |

**Cost model.** Spend is roughly *turns × average context*. At ~516k context per turn:
- every avoided turn saves about **0.5M input tokens**, and
- every 10k tokens of standing context (the whole tracker, for example) costs about **15M tokens** over a run this long.

So there are two levers, and the plugin controls both:
1. **Fewer turns**: predict problems, batch the work, and skip no-op wake-ups.
2. **Smaller standing context**: a leaner tracker, no whole-file echoes, and subagents that return summaries.

---

## 2. Top 10 changes, ranked

Savings are order-of-magnitude estimates for a run of this size and are marked as such.

| # | Change | Where | Est. saving | Priority |
|---|---|---|---|---|
| 1 | **Environment pre-flight** (worktree isolation, git identity, rulesets and merge methods, CI, live production state, infra stability) that runs once before Recon | New `shared/PREFLIGHT.md`; referenced from `recon/SKILL.md` § Pre-flight checklist and `charge/SKILL.md` § Preconditions | 4 plumbing PRs, ~60–100 turns (~30–50M tokens), and one live exposure found late | **P0** |
| 2 | **Charge Mode C**: sequential auto-merge into an integration branch, stop at promotion, honor "pause after X" | `charge/SKILL.md` § Branch modes | ~5–10 turns per item spent waiting and re-checking; the user never has to babysit merges | **P0** |
| 3 | **Tracker v2**: capped Notes cells, an append-only Log, one-line item rows, and PR/merge state read from `gh` instead of stored | `shared/TRACKER-CONVENTION.md` § Phase-status table, § Follow-up backlog, new § Log | Tracker drops from ~10k to under 3k tokens per read (~10M+ over a run); ends the stale "PR open" reports | **P0** |
| 4 | **Ship helper scripts** in the plugin (`bin/tracker`, `bin/status`, `bin/verify-pure-move`, `bin/decl-diff`) | New `bin/` directory; referenced from the tracker convention, status, and regroup | Removes about 72 ad-hoc tracker-script calls, 18 sandbox retries, and helpers lost on resume | **P0** |
| 5 | **Recon ownership map and dedupe**: one agent owns the cross-cutting auth and rules matrix, IDs share one namespace, agents return a short summary, and one dedupe pass follows | `recon/SKILL.md` § Execution mode, § Synthesizing | ~720k → ~450k subagent tokens; no triple-reported findings | **P1** |
| 6 | **Per-item deploy coupling** (`code-only` / `rules` / `config` / `console`, plus order) declared in the queue and carried into the PR body and Rally Point | `charge/SKILL.md` § Per-item loop and § Rally Point; tracker backlog column | Q9-style ordering risk ("code before rules or the forms break") becomes routine, not ad hoc | **P1** |
| 7 | **Queue coupling pass** before Charge starts: list the files each item touches and put items that share files or APIs next to each other | `charge/SKILL.md` § Preconditions | Avoids deferrals like Q8→Q9 and Q9 deleting Q10's code | **P1** |
| 8 | **Operating notes for agents**: one simple command per Bash call, logic in script files, Edit instead of `sed -i` on large files, check the declaration list after a scripted block replace, ignore `vercel[bot]` comments | New `shared/OPERATING-NOTES.md`, referenced from every skill | 18 sandbox retries, ~13 no-op wake-ups, 2 silent code deletions | **P1** |
| 9 | **Recon verifies its checks and its claims**: does lint actually type-check, and is each finding marked verified or unverified; Fortify corrects Recon on the record | `recon/SKILL.md` § Per-module audit pass; `fortify/SKILL.md` § Step 2 | Would have caught the missing `@types/react` gap in Recon, and the FB-15 claim | **P1** |
| 10 | **Regroup plans for the remaining queue**, and **Fortify ships shared test mocks** | `regroup/SKILL.md` § Step 1; `fortify/SKILL.md` § Step 2 | Avoids a second regroup and the 5-mock breakage when `serverTimestamp` was introduced | **P2** |

---

## 3. Findings and proposed changes

Every entry follows the same format: **Problem** · **Evidence** · **Root cause** in the plugin · **Change** · **Saving** · **Priority**.

### 3.1 Predict early (pre-flight)

**P-1 Worktree isolation broke subagent writes** (evidence #1)
- **Evidence:** The session was pinned to worktree A while the audit targeted worktree B, so a hook blocked writes. I had to run EnterWorktree and SendMessage all 5 subagents in the middle of the run.
- **Root cause:** `recon/SKILL.md` § Pre-flight item 1 asks for "repository and branch" but never checks that the session can write there.
- **Change:** add a pre-flight step, "Resolve the target path and confirm this session can write to it (write and remove a probe file). If the session is isolated to a different worktree, switch into the target worktree before spawning any subagent."
- **Saving:** ~10 turns plus 5 agent round-trips.
- **Priority:** P0

**P-2 Live production state was unknown until late** (#2)
- **Evidence:** Production was running permissive rules, a critical live exposure, and this only surfaced when the user asked for status.
- **Root cause:** Recon is read-only on code, and only `breach/SKILL.md` § Step 1 looks at live state, which is too late.
- **Change:** in pre-flight, ask (or read, read-only) what's actually deployed: the rules and policies in effect, the auth providers, whether open signup is allowed, and whether the deployed commit matches the audited branch. Any critical finding that is live today gets tagged `LIVE` and triggers a stopgap question immediately.
- **Saving:** a stopgap on day 1 instead of mid-program.
- **Priority:** P0

**P-3 Placeholder git identity** (#3)
- **Evidence:** The author was "Your Name", so Vercel blocked the deploy on the first PR.
- **Root cause:** the plugin has no identity check.
- **Change:** pre-flight checks `git config user.name` and `user.email` and flags placeholders or mismatches with the hosting account.
- **Saving:** 1 blocked deploy plus a re-commit cycle.
- **Priority:** P0

**P-4 Rulesets and merge-method policy caused phantom conflicts** (#4)
- **Evidence:** A required-linear-history ruleset on ~ALL branches blocked a push. Promotions #11 and #12 were squash-merged, which split history and needed #12 and #13 to relink. #5 and #6 were also plumbing.
- **Root cause:** `charge/SKILL.md` § Branch modes assumes merging just works, and nothing reads the branch protection.
- **Change:** pre-flight reads the rulesets and branch protection (`gh api repos/{o}/{r}/rulesets`) and recommends the policy up front:
  - squash for feature → integration,
  - a **merge commit** for integration → production,
  - rulesets per branch, not on ~ALL,
  - required CI checks named.

  Record the policy in the tracker header.
- **Saving:** 4 PRs and ~40 turns.
- **Priority:** P0

**P-5 There was no CI** (#5)
- **Evidence:** CI was added mid-Charge (#8), after Q1 and Q2 had already shipped on local test runs only.
- **Root cause:** `fortify/SKILL.md` § Step 2 checks that tests run but not that anything *enforces* them.
- **Change:** Fortify's done-criteria includes "the gate is automated: CI runs the full test gate on PRs to the integration and production branches, and those checks are required." If there's no CI, propose it as Fortify's last PR.
- **Saving:** a scope insertion avoided, and every Charge PR gated from Q1.
- **Priority:** P1

**P-6 Infra churn wasn't anticipated** (#6)
- **Evidence:** a new Firebase project, a Vercel project recreate, and lockdown of the old project, with the tracker header patched ad hoc.
- **Root cause:** `recon/SKILL.md` § Pre-flight item 4 asks what the backend *is*, not whether it's stable.
- **Change:** add the question "Is hosting or backend being migrated, recreated, or split into environments soon?" and a tracker header field `Environments:` listing projects, IDs, and domains per environment.
- **Saving:** fewer header rewrites and mid-program surprises.
- **Priority:** P2

**P-7 Checks didn't check what they claimed** (#7)
- **Evidence:** `npm run lint` didn't type-check JSX because `@types/react` was missing. Fortify found this, not Recon, and it masked the GWS-2 crash.
- **Root cause:** `recon/SKILL.md` § Per-module audit pass has no item about the project's own quality gates.
- **Change:** add an audit item, "For each gate the project claims (lint, typecheck, tests), confirm it actually covers the code in scope, e.g. introduce a deliberate type error in a scratch copy, or check that the needed type packages are present."
- **Saving:** a masked bug found in Recon.
- **Priority:** P1

**P-8 A Recon claim was wrong** (#8)
- **Evidence:** FB-15 was reported as a "crash" but actually rendered "[object Object]". Fortify corrected it.
- **Root cause:** `recon/SKILL.md` § Per-module audit pass says "verified by reading code" but has no marker for how each claim was verified.
- **Change:** each finding carries `Verified: read | ran | unverified`. Fortify's § Step 3 explicitly includes "correct Recon findings that don't reproduce; record the correction in the findings doc."
- **Saving:** no rework on a mis-scoped item.
- **Priority:** P2

### 3.2 Context economy

**C-1 Recon subagents overlapped** (#9)
- **Evidence:** ~720k tokens across 5 agents:
  - FB-1, ADM-1 and PUB-2 were the same bug.
  - GWS-1 and PUB-5 were duplicates.
  - application_workflows appeared in 3 docs.
  - The audit-log gap appeared in 3 docs.
- **Root cause:** `recon/SKILL.md` § Execution mode says to give each agent "a narrow, specific brief" but splits by *module*, while the worst findings are *cross-cutting* (the authorization boundary).
- **Change:** in the parallel brief template (§ 7 below):
  - one agent owns the auth and rules matrix, and other agents link to its IDs instead of re-reporting;
  - one shared ID namespace;
  - each agent returns only a 20-line summary, with its full doc written to disk;
  - the main session runs one dedupe pass before synthesis.
- **Saving:** ~35% of Recon tokens, plus smaller synthesis context.
- **Priority:** P1

**C-2 The tracker is too big and gets re-read constantly** (#12, #15)
- **Evidence:**
  - The tracker is 41.9 KB, about 10k tokens.
  - The phase-table Notes cell grew to a ~1.5k-char paragraph, and backlog rows were 500+ chars.
  - Tracker calls happened 116 times, and status ran ~8 times.
- **Root cause:** `shared/TRACKER-CONVENTION.md` § Phase-status table shows short notes but sets no limit, and there's no place for history other than Notes.
- **Change:** use tracker v2 (§ 6):
  - a 120-character cap on Notes;
  - history goes to an append-only `## Log` at the bottom, which skills don't read unless resuming;
  - item rows stay one line with detail in linked docs;
  - status reads only the top sections.
- **Saving:** ~7k tokens per read × dozens of reads, and ~7k less standing context.
- **Priority:** P0

**C-3 Whole-file echoes after shell edits** (#25)
- **Evidence:** `sed -i` and script edits on BulkEmailModal (~800 lines) and ApplicationDetailModal (~1,000 lines) triggered "file changed on disk" re-injections of the whole file.
- **Root cause:** the plugin gives no guidance on editing.
- **Change:** in `shared/OPERATING-NOTES.md`: "Use the Edit tool for targeted changes to files over 300 lines. Never `sed -i` or rewrite a large file that is already in context."
- **Saving:** 10–20k tokens per avoided echo.
- **Priority:** P1

**C-4 Subagent results land in the main context** (#9, #10)
- **Evidence:** 5 full agent reports were merged into the main thread before synthesis.
- **Change:** the same as C-1. Agents write their docs to disk and return a summary plus the list of critical IDs. The main session opens a full doc only to spot-verify a critical finding.
- **Priority:** P1

### 3.3 Loop reduction (workflow)

**L-1 No Charge mode matched the user's operating model** (#16)
- **Evidence:** The user said "continue continually until I'm back… merge to staging, I review main" and later "pause after Q11". Mode A waits for a human merge, and Mode B stacks unmerged branches, so neither fits. I ran it by hand: open the PR, wait for CI, merge, sync, next.
- **Root cause:** `charge/SKILL.md` § Branch modes only defines A and B.
- **Change:** add Mode C (spec in § 5).
- **Saving:** ~5–10 turns per item; 11 items gives ~80 turns, about 40M tokens.
- **Priority:** P0

**L-2 Deploy coupling and order were ad hoc** (#17)
- **Evidence:** Q9's rules must deploy only *after* the code reaches production, or the public forms break. This was tracked by hand in chat and Rally Points.
- **Root cause:** § Per-item loop has no "what must happen in production, in what order" field, and § Hard rule simply stops live actions.
- **Change:** each queue item declares a `Deploy:` field:
  - `code-only`;
  - `rules-after-code`;
  - `rules-before-code`;
  - `console-config`;
  - `none`.

  Charge copies it into the PR body under **Rollout** and into the Rally Point ⚠️ block. Breach consumes the list as its runbook skeleton.
- **Saving:** no order mistakes, and Breach starts from a ready list.
- **Priority:** P1

**L-3 No-op CI wake-ups** (#18)
- **Evidence:** 20 ci-monitor events, 13 of them `vercel[bot]` deployment comments.
- **Change:** in OPERATING-NOTES and Mode C, when the PR monitor is on, act only on required-check completion or review events, and ignore bot deployment comments without replying. Better still, in Mode C poll the required checks once with a single blocking `gh pr checks --watch --required` instead of subscribing.
- **Saving:** ~13 turns, about 6M tokens.
- **Priority:** P1

**L-4 Slicing edits deleted adjacent code** (#19)
- **Evidence:** Q8 lost `handleReset` and Q11 lost `mailtoUrl`. Typecheck and tests caught both, but only after a failed gate.
- **Change:** in OPERATING-NOTES and the per-item loop step 3: "After any scripted or multi-line block replacement, diff the file's top-level declaration list against `HEAD` (`bin/decl-diff <file>`) before running tests."
- **Saving:** 2 fix-up cycles.
- **Priority:** P1

**L-5 Test-mock drift** (#20)
- **Evidence:** introducing `serverTimestamp` broke 5 unrelated test mocks.
- **Root cause:** `fortify/SKILL.md` § Step 2 builds the test layer but not shared fakes.
- **Change:** Fortify creates one shared backend fake (`tests/helpers/<backend>Mock.ts`) that re-exports the real module's sentinel helpers, so new API use doesn't break every mock.
- **Saving:** a cycle of multi-file test fixes per new API.
- **Priority:** P2

**L-6 Dependencies between items were found late** (#21)
- **Evidence:** Q8's `serverTimestamp` had to be deferred to Q9 because readers weren't ready, and Q9 deleted a dead exporter that Q10 had targeted.
- **Change:** Charge preconditions add a **coupling pass**. For each queued item, list the files and APIs it touches, then order the queue so items that share files are adjacent and the producer comes before the consumer. Write the order into the tracker once.
- **Saving:** deferrals and re-plans.
- **Priority:** P1

**L-7 Mid-program scope insertions had no standard flow** (#22)
- **Evidence:** CI, the bundle split, the Firebase migration and Regroup were all inserted mid-program.
- **Change:** the tracker convention adds § Inserting work. Give the item an ID, add a one-line queue row with a `Deploy:` value, a Resolved-Decisions entry naming who asked, and put it in the queue at a stated position. Charge treats it like any other item.
- **Priority:** P2

**L-8 Tracker status lagged a PR behind** (#14)
- **Evidence:** item status was updated in the *next* item's PR, so status kept reporting "PR open" and cross-checking `gh`.
- **Change:** tracker v2 doesn't store PR or merge state. `bin/status` derives it from `gh pr list --search "head:<branch>"`. The tracker stores only the item → branch mapping.
- **Priority:** P0 (part of C-2)

### 3.4 Ship tooling instead of re-deriving it

**T-1 Tracker CLI** (#13, #27)
- **Evidence:** the tracker was edited by an ad-hoc `tracker-update.cjs` in the scratchpad. It was lost on resume and rewritten, a regex missed, and rows landed under the wrong section once.
- **Change:** ship `bin/tracker` with stable section anchors:
  - `set-phase <n> <status> [note]`
  - `add-item`
  - `resolve-item <id> <pr>`
  - `add-decision`
  - `add-question`
  - `log <text>`
  - `rally-point <file>`
- **Priority:** P0

**T-2 Status script** (#15)
- **Change:** ship `bin/status`. It parses only the tracker's top sections, joins them with `gh` PR state, and prints the fixed report defined in `status/SKILL.md` § Step 2. The skill becomes "run `bin/status`, then add judgement."
- **Priority:** P0

**T-3 Pure-move verification** (#24)
- **Evidence:** this worked well (the check that diffs changed only imports, plus identical chunk hashes), but the codemod and verifier were hand-written this run.
- **Change:** ship `bin/move-codemod` and `bin/verify-pure-move`, referenced from `regroup/SKILL.md` § Step 3.
- **Priority:** P1

**T-4 Declaration diff** (#19)
- **Change:** ship `bin/decl-diff <file>`, which lists top-level declarations at `HEAD` against the working tree.
- **Priority:** P1

### 3.5 Regroup

**R-1 Regroup should plan for the queue** (#23)
- **Evidence:** the user had to ask for the layout to anticipate the remaining Charge items ("future work only adds files").
- **Change:** `regroup/SKILL.md` § Step 1 adds: "Read the remaining Charge queue and place every file those items will create or touch in the new layout, so no second regroup is needed."
- **Priority:** P2

---

## 4. Proposed `shared/PREFLIGHT.md` (drop-in)

This runs once per program, is owned by Recon, and is re-checked by Charge only if the tracker header says `Preflight: stale`. Results go into the tracker header.

```markdown
# Cavalry environment pre-flight

Run every check; record results in the tracker header under **Environment**. Ask the human only for items marked (ask).

1. Target & isolation — resolve the target repo path; write+delete a probe file there. If this session is isolated to another worktree, switch into the target before spawning subagents.
2. Git identity — `git config user.name` / `user.email` are real and match the hosting account; flag placeholders.
3. Branch model (ask) — integration branch and production branch names. Recommend: feature→integration = squash; integration→production = merge commit.
4. Protection — read rulesets/branch protection (`gh api repos/{owner}/{repo}/rulesets`). Flag rules on ~ALL, linear-history on the integration branch, merge methods that contradict item 3, missing required checks.
5. CI — does CI run the full test gate on PRs to both branches, and are those checks required? If not, Fortify's last PR adds it.
6. Gates really gate — lint/typecheck/test cover the code in scope (e.g. JSX types present).
7. Live state (ask or read-only) — what is deployed now: backend rules/policies, auth providers, open signup, deployed commit vs audited branch. Any critical finding that is live gets tag `LIVE` and an immediate stopgap question.
8. Environments (ask) — list hosting/backend projects per environment; is any migration/recreate planned?
9. Operating constraints — sandbox limits (test one compound command), PR monitor bots to ignore, who may merge/promote/deploy.
```

## 5. Proposed Charge Mode C (drop-in for `charge/SKILL.md` § Branch modes)

```markdown
**Mode C — sequential auto-merge to integration (opt-in; phrases like "merge to staging yourself", "keep going, I'll promote later"):**

1. Branch the next item from the up-to-date integration branch.
2. Run the per-item loop; open the PR against the integration branch with a **Rollout** section (the item's `Deploy:` value).
3. Wait once for required checks (`gh pr checks <n> --watch --required`); on green, merge with the integration branch's configured method; on red, fix on the same branch (max 2 attempts, then halt with a Rally Point).
4. Sync local integration branch; record `resolve-item` in the tracker in the same step.
5. Before starting the next item, honor any stop condition the human set ("pause after X", a time, a count) and stop at any item whose `Deploy:` is not `code-only` or `none` if the human asked to review those.
6. Never merge to the production branch, never deploy — promotion is a separate, human-approved step. Halt with a Rally Point listing: merged items, promotion PR readiness, and every pending production step in required order.
```

## 6. Proposed tracker convention v2

Changes to `shared/TRACKER-CONVENTION.md`:

1. **Header** gains `Environment` (from pre-flight), `Branch policy`, and `Queue order` (one line of IDs).
2. **Phase-status Notes** are limited to **120 characters**. Anything longer goes to the Log.
3. **Queue / backlog rows** stay one line:
   ```
   | ID | Title (≤60 chars) | Files | Deploy | Depends | Branch | Status |
   ```
   Detail belongs in the findings doc, linked by ID. The PR number and merge state are **not stored**; they're derived.
4. **New `## Log`** section, always last and append-only, one line per event (`2026-09-26 Q11 merged #29`). Skills read it only when resuming after a gap.
5. **Reading rule:** a phase skill reads the header, the phase table, the open questions, and the rows for its own items. It never re-reads the whole file for a status line.
6. **Writes go only through `bin/tracker`.** Hand edits are allowed, but the CLI keeps the anchors stable.

Expected effect: the standing tracker read drops from ~10k to ~2–3k tokens, and status can't be stale.

## 7. Proposed Recon subagent brief (parallel mode)

```markdown
You audit <module> at <path> for a Cavalry Recon. Read code; never assume.
- Cross-cutting owner: the auth/authorization matrix is owned by agent AUTH. If you find an authz issue, reference AUTH's area ("see AUTH: <rule/collection>") instead of writing a full finding.
- IDs: use prefix <PFX>-n. Before writing a finding, check ids-registry.md for an existing one covering the same root cause; link it instead.
- Each finding: file:line, what happens, impact, Verified: read|ran|unverified, suggested decision (if any).
- Write your full doc to <docs path>. Return ONLY: ≤20 lines — counts by severity, the IDs of criticals with one line each, and any open questions.
```

Then the main session:
1. Dedupes by root cause.
2. Spot-verifies each critical finding by opening the cited lines. (This worked well in this run; keep it.)
3. Asks the decisions in batches of four with a recommendation. (This also worked; keep it.)

## 8. Proposed `shared/OPERATING-NOTES.md`

- One simple command per Bash call. Put pipes, loops, and multi-step logic into a script file in a stable location (`.cavalry/tmp/` in the repo, git-ignored), not the session scratchpad, which can change on resume.
- Use Edit for targeted changes to files over 300 lines. Don't use `sed -i` or whole-file rewrites on large files already in context.
- After any scripted block replacement, run `bin/decl-diff` before running tests.
- PR monitoring: act only on required-check results and human reviews. Ignore bot deployment comments (`vercel[bot]` and the like).
- On long unattended runs, post a one-line progress note per merged item instead of silence.
- Keep the tracker the single source of truth for resuming. Keep chat summaries short.

---

## 9. What worked, and should stay

- **Test-first per item with named characterization tests** ("BUG … flips in Qn") gave unambiguous before/after evidence. Keep it and make the naming a written convention in `fortify/SKILL.md` § Step 4.
- **Emulator rules tests plus byte-identical verification of the live ruleset** after each rules deploy. Add this to Breach's verify step as the default for rules-type backends.
- **Rally Point reports, the Resolved-Decisions table, and the path map after Regroup.** Keep all three.
- **The main agent spot-verifying subagent critical findings** before reporting (#10). Make it a named step, as in § 7.
- **Decisions asked in batches of four with recommendations** (#11).
- **The tracker as memory across two compactions and a model switch** (#28). The format works; it's just too large (C-2).

---

## 10. Evidence coverage checklist

Items 1–28 are from the run's raw evidence log.

| # | Evidence | Addressed in |
|---|---|---|
| 1 | Worktree isolation blocked writes | P-1, § 4 item 1 |
| 2 | Live production state unknown | P-2, § 4 item 7 |
| 3 | Placeholder git identity | P-3, § 4 item 2 |
| 4 | Rulesets and merge-method phantom conflicts | P-4, § 4 items 3–4 |
| 5 | No CI | P-5, § 4 item 5 |
| 6 | Infra churn | P-6, § 4 item 8 |
| 7 | Lint didn't check JSX | P-7, § 4 item 6 |
| 8 | Recon claim error (FB-15) | P-8 |
| 9 | Recon agent overlap, ~720k tokens | C-1, § 7 |
| 10 | Classifier blocks; main agent re-verified | C-4, § 7, § 9 |
| 11 | Batched decisions worked | § 7, § 9 |
| 12 | Oversized Notes and backlog rows | C-2, § 6 |
| 13 | Ad-hoc tracker scripts | T-1 |
| 14 | Tracker lagging a PR behind | L-8, § 6 item 3 |
| 15 | Status run ~8 times | C-2, T-2 |
| 16 | No mode for auto-merge to staging | L-1, § 5 |
| 17 | Deploy coupling and order ad hoc | L-2, § 5 |
| 18 | No-op vercel[bot] wake-ups | L-3, § 8 |
| 19 | Slicing edits deleted code | L-4, T-4 |
| 20 | Test-mock drift | L-5 |
| 21 | Late cross-item dependencies | L-6 |
| 22 | Mid-program insertions | L-7 |
| 23 | Regroup should plan for the queue | R-1 |
| 24 | Pure-move verification worked; ship scripts | T-3, § 9 |
| 25 | Whole-file echoes | C-3, § 8 |
| 26 | Sandbox "too complex" rejections | § 8, T-1 |
| 27 | Scratchpad path changed on resume | T-1, § 8 |
| 28 | Nudges, compactions, model switch; tracker-as-memory worked | § 8, § 9 |
| G | Things to keep | § 9 |
