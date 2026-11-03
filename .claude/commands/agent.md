---
description: H5 · the LLM agent and its tests with the ScriptedModel double
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(uv run pytest:*)
---
Milestone H5. Contract: CLAUDE.md, sections "Tools (R4)", "LLM agent (R5)" and "Cases (R5, H6)".
1. Write `src/waiter_robot/agent.py` (`uv run agent "<request>"`): `create_agent` with `ChatOllama(model="qwen2.5:7b", temperature=0)`, the two tool wrappers (the `run_policy` one returns `"error: ..."` instead of raising) and the system prompt of the contract. The model is a parameter so tests can inject the double.
2. Write `tests/scripted_model.py`: `ScriptedModel`, a fake chat model with a fixed list of replies and a `bind_tools` that returns itself.
3. Write `tests/test_agent.py`: case 1 end to end (tool calls `list_places` and `run_policy(0, 0, "T")`; the tool result has 13 steps; the final answer says 13 steps); case 4 does not call `run_policy`; a `run_policy` error comes back to the model as text and the program does not stop.
4. Add the entry point and the command to `README.md`. Run `uv run pytest` with Ollama closed. Expected: every test passes.

The student reviews: the system prompt line by line against the contract, and that the tests would fail if the agent invented figures or called `run_policy` in case 4.
