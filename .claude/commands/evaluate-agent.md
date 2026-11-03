---
description: H6 · run the four cases with the real model and save the traces
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Bash(uv run agent:*)
---
Milestone H6. Contract: CLAUDE.md, section "Cases (R5, H6)". Needs Ollama running with `qwen2.5:14b`.
1. Run `uv run agent "<request>"` for each of the four cases, in order.
2. Save each full output to `results/traces/case<N>.txt`.
3. Write `results/cases.md`: one row per case with the request, the tools actually called, the figures in the answer and whether it meets the "The answer must" column (yes/no).
4. Do not change any code. If a case fails, report it and stop.

The student reviews: each trace against the table, and picks the two traces for the report.
