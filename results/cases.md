# Agent cases with the real model (H6, H10)

Final attempt (attempt 6, H10): `qwen2.5:14b`, `temperature=0`, system prompt as the ordered procedure of CLAUDE.md ("LLM agent (R5)") with the places from `list_places()` appended by the code, and one retry if the answer names a tool instead of calling it. Traces: `results/traces/case1.txt` … `case4.txt`.

| # | Request | Expected tools | Tools actually called | Figures in the answer | Meets "The answer must"? |
|---|---|---|---|---|---|
| 1 | "Take this dish from the kitchen to the terrace" | `run_policy(0, 0, "T")` | `list_places`, `run_policy(0, 0, "T")` → reached, 13 steps, return 8.0 | 13 steps | yes |
| 2 | "The robot is at the bar; send it back to the kitchen" | `run_policy(0, 8, "K")` | `run_policy(0, 8, "K")` → reached, 12 steps, return 9.0 | 12 steps, return 9.0, and the full path, copied correctly from the tool (step 4 says not to list it) | yes |
| 3 | "Take the dish from the kitchen to the storeroom" | no `run_policy` | none | none; says the storeroom is not a listed place and asks which of the three is meant | yes |
| 4 | "What wine do you recommend?" | none | none | none; says the robot only carries things between kitchen, bar and terrace door | yes |

Result: 4 of 4 cases. The retry did not fire in any case (no answer named a tool instead of calling it); it is covered by the `ScriptedModel` tests. No answer contained a figure that did not come from a tool.

## Previous attempts

| Attempt | Model | Change | Cases that failed | Traces |
|---|---|---|---|---|
| 1 | qwen2.5:7b | original list of five rules | 1: asked where the terrace door is, called no tool (cases 2-4 not run) | `case1_attempt1.txt` |
| 2 | qwen2.5:7b | rule 1 "call list_places before answering or asking anything"; rule 3 "terrace is the terrace door" | 4: "I can help you with that", asked where the robot is | `case1-4_attempt2.txt` |
| 3 | qwen2.5:7b | rules rewritten as an ordered procedure (steps 1-5) | 4: same as attempt 2; case 2 also copied the path wrongly in its answer | `case1-4_attempt3.txt` |
| 4 | qwen2.5:14b | model changed; step 4 asks to describe the route in words | 3: said the robot cannot go to the storeroom, did not ask (case 4 not run); route descriptions in cases 1-2 were invented | `case1-3_attempt4.txt` |
| 5 | qwen2.5:14b | step 1 defines "moving the robot" (any request to take something somewhere); step 4 only steps and return | 2: answered in Thai with no tool call | `case1-4_attempt5.txt` |
| 6 | qwen2.5:14b | H10, in code: places from `list_places()` in the system prompt; one retry if a tool is named instead of called | none | `case1-4.txt` |

Attempts 2-5 changed only the wording of the prompt: each fixed the case it targeted and another case changed behaviour. Attempt 6 moved one decision (looking up the places) from the model to the code, and the four cases passed.
