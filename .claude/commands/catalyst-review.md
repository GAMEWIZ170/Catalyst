---
description: Review recent changes for bugs, rule breaks and missing docs
argument-hint: [commit range or file, default is the last 5 commits]
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git show:*), Read, Grep, Glob
---

Review the changes in: $ARGUMENTS (if empty, use the last 5 commits on this branch).

Check against CLAUDE.md and report only real findings:

- Rule breaks: answers leaked to students, missing server-side grading, hard deletes, colour literals outside tokens, raw HTML injection.
- Bugs: missing imports, wrong request shapes, missing `order` fields, unhandled errors, race conditions.
- Missing README updates for changed routes or env variables.
- Anything that needs a keyboard or label fix.

Do not edit files. List findings by severity, each with file, line and a one-line fix idea. Explain each in simple words, as if teaching.
