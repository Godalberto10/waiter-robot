"""ScriptedModel: a fake chat model that replies from a fixed list (no network)."""
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult


class ScriptedModel(BaseChatModel):
    """Returns `replies` in order, one per call, and records the messages it received."""

    replies: list[AIMessage]
    calls: list[list[BaseMessage]] = []

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def _generate(self, messages: list[BaseMessage], stop: list[str] | None = None,
                  run_manager: Any = None, **kwargs: Any) -> ChatResult:
        if len(self.calls) >= len(self.replies):
            raise AssertionError("ScriptedModel ran out of replies")
        reply = self.replies[len(self.calls)]
        self.calls.append(list(messages))
        return ChatResult(generations=[ChatGeneration(message=reply)])

    def bind_tools(self, tools: Any, **kwargs: Any) -> "ScriptedModel":
        return self


def tool_call(name: str, args: dict, call_id: str) -> AIMessage:
    """An AI reply that only calls one tool."""
    return AIMessage(content="", tool_calls=[{"name": name, "args": args, "id": call_id}])
