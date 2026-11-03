"""Waiter robot agent: the LLM reads the request, the tools give the route."""
import inspect
import sys

from langchain.agents import create_agent
from langchain.tools import tool
from langchain_core.language_models import BaseChatModel
from langchain_ollama import ChatOllama

from waiter_robot.tools import list_places, run_policy

MODEL_NAME = "qwen2.5:7b"

SYSTEM_PROMPT = (
    "You control a waiter robot in a restaurant that carries dishes and drinks "
    "between the kitchen, the bar and the terrace door. Always answer in English.\n"
    "Rules:\n"
    "1. Always call list_places first to map place names to letters and cells. "
    "Never assume a cell.\n"
    "2. Call run_policy for every route and answer only with the figures it "
    "returns (steps, return, path). Never compute routes or give your own figures.\n"
    "3. If the request does not say where the robot is, ask where the robot is. "
    "If a place is not in list_places, ask which place is meant. In both cases "
    "do not call run_policy.\n"
    "4. If the request is not about moving the robot, say that the robot only "
    "carries things between the kitchen, the bar and the terrace door, and do "
    "not call run_policy.\n"
    "5. If a tool returns \"error: ...\", explain the error to the user instead "
    "of retrying with invented values."
)


# Same docstring as tools.run_policy, but the wrapper returns errors as text instead of raising.
ERRORS_SECTION = (
    "Errors:\n"
    "    if the start is off the map, a table or the fryer area, the destination\n"
    "    is not a place letter, or the start is the destination, it returns a\n"
    "    text starting with \"error:\" that says the cause; explain it to the user\n"
    "    and do not retry with invented values."
)
RUN_POLICY_DOC = inspect.cleandoc(run_policy.__doc__).split("Raises:")[0] + ERRORS_SECTION


def run_policy_wrapper(start_row: int, start_col: int, destination: str) -> dict | str:
    try:
        return run_policy(start_row, start_col, destination)
    except ValueError as error:
        return f"error: {error}"  # back to the LLM; the program does not stop


run_policy_wrapper.__name__ = "run_policy"  # the name the LLM calls
run_policy_wrapper.__doc__ = RUN_POLICY_DOC  # the description the LLM reads

TOOLS = [tool(list_places), tool(run_policy_wrapper)]


def build_agent(model: BaseChatModel | None = None):  # noqa: ANN201  (compiled LangGraph graph)
    """Agent with the two tools; `model` defaults to the local Ollama model."""
    if model is None:
        model = ChatOllama(model=MODEL_NAME, temperature=0)
    return create_agent(model=model, tools=TOOLS, system_prompt=SYSTEM_PROMPT)


def main() -> None:
    if len(sys.argv) < 2:
        print('usage: uv run agent "<request>"')
        sys.exit(2)
    request = " ".join(sys.argv[1:])
    answer = build_agent().invoke({"messages": [{"role": "user", "content": request}]})
    for message in answer["messages"]:
        message.pretty_print()  # the request, each tool call and the answer


if __name__ == "__main__":
    main()
