---
description: H10 · places given by code and one retry when the model describes instead of acting; attempt 6
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(uv run pytest:*), Bash(uv run agent:*)
---
Milestone H10. Contract: CLAUDE.md, sections "LLM agent (R5)" (line "Reinforced in code (H10)") and "Cases (R5, H6)".
1. In `src/waiter_robot/agent.py`: build the system prompt with the places from `list_places()` appended, and update step 2 as in the contract; keep `list_places` as a tool.
2. Add the retry: if the final answer names `list_places` or `run_policy` as text, send `Call the tool; do not describe the steps.` once and keep the new answer; the printed trace shows both turns.
3. In `tests/test_agent.py`, with `ScriptedModel`: the system prompt contains the three places; an answer that names a tool triggers exactly one retry and the retried answer is kept; a normal answer triggers none. The existing tests keep passing.
4. Run `uv run pytest` with Ollama closed.
5. Attempt 6: keep the attempt-5 traces as `case<N>_attempt5.txt`, run the four cases with the real model (all four, even if one fails), save `results/traces/case<N>.txt` and update `results/cases.md` (table and "Previous attempts").

The student reviews: the system prompt, that the retry fires only when a tool is named, and the four traces.
