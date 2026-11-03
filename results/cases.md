# Agent cases with the real model (H6)

Final attempt (attempt 5): `qwen2.5:14b`, `temperature=0`, system prompt as the ordered procedure of CLAUDE.md ("LLM agent (R5)"). Traces: `results/traces/case1.txt` … `case4.txt`.

| # | Request | Tools actually called | Figures in the answer | Meets "The answer must"? |
|---|---|---|---|---|
| 1 | "Take this dish from the kitchen to the terrace" | `list_places`, `run_policy(0, 0, "T")` → reached, 13 steps, return 8.0 | 13 steps | yes |
| 2 | "The robot is at the bar; send it back to the kitchen" | none | none: the model answered in Thai, describing the procedure it would follow, and stopped without calling any tool | no |
| 3 | "Take the dish from the kitchen to the storeroom" | none | none; says the storeroom is not a listed place and asks to specify one of the three | yes (no `run_policy`, asks); but it did not call `list_places` first (step 2) |
| 4 | "What wine do you recommend?" | none | none; says the robot only carries things between kitchen, bar and terrace door | yes |

Result: 3 of 4 cases. No `run_policy` call was made in cases 3 and 4, and no answer contained a figure that did not come from a tool.

## Previous attempts

| Attempt | Model | Prompt change | Cases that failed | Traces |
|---|---|---|---|---|
| 1 | qwen2.5:7b | original list of five rules | 1: asked where the terrace door is, called no tool (cases 2-4 not run) | `case1_attempt1.txt` |
| 2 | qwen2.5:7b | rule 1 "call list_places before answering or asking anything"; rule 3 "terrace is the terrace door" | 4: "I can help you with that", asked where the robot is | `case1-4_attempt2.txt` |
| 3 | qwen2.5:7b | rules rewritten as an ordered procedure (steps 1-5) | 4: same as attempt 2; case 2 also copied the path wrongly in its answer | `case1-4_attempt3.txt` |
| 4 | qwen2.5:14b | model changed; step 4 asks to describe the route in words | 3: said the robot cannot go to the storeroom, did not ask (case 4 not run); route descriptions in cases 1-2 were invented | `case1-3_attempt4.txt` |
| 5 | qwen2.5:14b | step 1 defines "moving the robot" (any request to take something somewhere); step 4 only steps and return | 2: answered in Thai with no tool call | `case1-4.txt` |

No attempt passed all four cases. Each prompt change fixed the case it targeted, but another case changed behaviour; with `temperature=0` the result is repeatable for a given prompt, but sensitive to small changes in it.
