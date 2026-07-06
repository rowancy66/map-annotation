# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260705-001] best_practice

**Logged**: 2026-07-05T00:00:00+08:00
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
`git commit` 和 `git push` 不能并行执行，否则可能把旧状态推到远端并误报“已推送”

### Details
本次在推送修复时，把 `git commit` 与 `git push` 放进并行执行。结果是 `push` 先发生，远端显示 `Everything up-to-date`，随后本地提交才成功，导致我错误地向用户汇报“已推送”。真实状态是本地分支 `ahead 1`，需要再补一次串行 `git push`。

### Suggested Action
任何需要“提交后推送”的流程，必须按 `git add` → `git commit` → `git status/ log 确认` → `git push` 串行执行；只有在 push 成功并返回新提交范围后，才能对用户声称“已经推送”。

### Metadata
- Source: user_feedback
- Related Files: AGENTS.md
- Tags: git, push, workflow, verification
- Pattern-Key: workflow.git_push_after_commit
- Recurrence-Count: 1
- First-Seen: 2026-07-05
- Last-Seen: 2026-07-05

---
