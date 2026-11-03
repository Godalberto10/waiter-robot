import json

from langchain_core.messages import AIMessage, SystemMessage, ToolMessage

from scripted_model import ScriptedModel, tool_call
from waiter_robot.agent import SYSTEM_PROMPT, TOOLS, build_agent


def run(model: ScriptedModel, request: str) -> list:
    answer = build_agent(model).invoke({"messages": [{"role": "user", "content": request}]})
    return answer["messages"]


def tool_messages(messages: list, name: str) -> list[ToolMessage]:
    return [m for m in messages if isinstance(m, ToolMessage) and m.name == name]


def test_case1_end_to_end() -> None:
    model = ScriptedModel(replies=[
        tool_call("list_places", {}, "c1"),
        tool_call("run_policy", {"start_row": 0, "start_col": 0, "destination": "T"}, "c2"),
        AIMessage(content="The robot took the dish from the kitchen to the terrace door in 13 steps (return 8.0)."),
    ])
    messages = run(model, "Take this dish from the kitchen to the terrace")

    # the model got the system prompt
    assert isinstance(model.calls[0][0], SystemMessage)
    assert model.calls[0][0].content == SYSTEM_PROMPT

    # list_places ran for real and gave the kitchen and terrace cells
    places = json.loads(tool_messages(messages, "list_places")[0].content)
    assert {"letter": "T", "name": "terrace door", "row": 5, "col": 8} in places

    # run_policy ran for real: its figures come from the Q table, not from the script
    [policy_msg] = tool_messages(messages, "run_policy")
    result = json.loads(policy_msg.content)
    assert (result["reached"], result["steps"], result["return"]) == (True, 13, 8.0)
    assert result["path"][0] == [0, 0] and result["path"][-1] == [5, 8]

    # the model saw that result before writing the answer, and the answer uses its figure
    assert model.calls[2][-1].content == policy_msg.content
    final = messages[-1]
    assert isinstance(final, AIMessage) and not final.tool_calls
    assert f"{result['steps']} steps" in final.content


def test_case4_does_not_call_run_policy() -> None:
    model = ScriptedModel(replies=[
        AIMessage(content="Sorry, the robot only carries things between the kitchen, "
                          "the bar and the terrace door."),
    ])
    messages = run(model, "What wine do you recommend?")

    assert tool_messages(messages, "run_policy") == []
    assert not any(isinstance(m, AIMessage) and any(c["name"] == "run_policy" for c in m.tool_calls)
                   for m in messages)
    assert "only carries things" in messages[-1].content


def test_run_policy_error_goes_back_to_model() -> None:
    model = ScriptedModel(replies=[
        tool_call("run_policy", {"start_row": 0, "start_col": 5, "destination": "T"}, "c1"),
        AIMessage(content="The robot cannot start at (0, 5): that cell is a table."),
    ])
    messages = run(model, "The robot is at (0, 5); send it to the terrace")

    [policy_msg] = tool_messages(messages, "run_policy")
    assert policy_msg.content.startswith("error: start (0, 5) is a table")
    assert model.calls[1][-1].content == policy_msg.content  # the model received the text
    assert isinstance(messages[-1], AIMessage)  # the agent finished normally


def test_run_policy_description_mentions_error_text() -> None:
    [run_policy_tool] = [t for t in TOOLS if t.name == "run_policy"]
    assert "error:" in run_policy_tool.description
    assert "Raises" not in run_policy_tool.description
