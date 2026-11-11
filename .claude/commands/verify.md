---
description: Verify a feature against the real backend using the catalyst_test database
argument-hint: <what to verify, e.g. "student lesson hub and test flow">
allowed-tools: Bash, Read, Grep, Glob
---

Verify this against the real backend: $ARGUMENTS

Follow the "Verification protocol" in CLAUDE.md exactly. In short:

1. Check the branch with `git branch --show-current` and tell me what it is.
2. Start the backend and frontend with a launcher kept outside the repo, pointed at `catalyst_test`. Never print the database address.
3. Create throwaway users, run the checks in a real browser, and print one `CHECK name => result` line each with real values.
4. Mark anything you did not run as `NOT RUN`.
5. Clean up data, servers and temporary scripts.
6. If a check fails, fix it with at most one small commit after two retries, then report.

Do not change anything unrelated to what failed.
