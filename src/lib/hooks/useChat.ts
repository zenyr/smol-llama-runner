import { useDidUpdate, useToggle } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ulid } from "ulid";
import { CompletionDto } from "../dto";
import { useEvtSrc } from "./useEvtSrc";

export type ChatMessage = {
  id: string;
  type: "system" | "user" | "assistant";
  state: "settled" | "loading" | "error";
  text: string;
  createdAt: number;
  settledAt?: number;
};

// todo: extract me
const usePromptSchema = (model: string) => {
  const initialText = `The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.`;
  const promptHeader = "\nInstruction: ";
  const answerHeader = "\nResponse:";
  const promptFormat = `${promptHeader}{{prompt}}\n${answerHeader}`;

  return useMemo(
    () => ({ initialText, promptHeader, answerHeader, promptFormat }),
    [initialText, promptFormat]
  );
};

const useMessages = (schema: PromptSchema) => {
  const historyRef = useRef<string[]>([schema.initialText]);
  const [list, setList] = useState<ChatMessage[]>(
    !schema.initialText
      ? []
      : [
          {
            type: "system",
            text: schema.initialText,
            state: "settled",
            createdAt: Date.now(),
            id: ulid(),
          },
        ]
  );

  const handlers = useMemo(
    () => ({
      checkUnmount: () => historyRef.current.length === 0,
      append: (message: ChatMessage) =>
        setList((current) => [...current, message]),
      appendHistory: (text: string, asPrompt: boolean) =>
        historyRef.current.push(
          asPrompt ? schema.promptFormat.replace("{{prompt}}", text) : text
        ),
      updater: (
        predicate: (message: ChatMessage) => boolean,
        updater: (message: ChatMessage) => ChatMessage
      ) =>
        setList((current) =>
          current.map((message) =>
            predicate(message) ? updater(message) : message
          )
        ),
      finalize: () =>
        setList((current) =>
          current.map((message) =>
            message.state === "loading"
              ? (handlers.appendHistory(message.text, false),
                { ...message, state: "settled", settledAt: Date.now() })
              : message
          )
        ),
    }),
    [schema.promptFormat]
  );

  return [list, historyRef, handlers] as const;
};
export type PromptSchema = ReturnType<typeof usePromptSchema>;
export type Messages = ReturnType<typeof useMessages>;
export type Updater = Messages[2]["updater"]; // alias

export const useChat = (model: string) => {
  const schema = usePromptSchema(model);
  const [busy, toggle] = useToggle();
  const [messages, historyRef, handlers] = useMessages(schema);

  const [input, setInput] = useState("What is the day after Monday?");
  const { append, appendHistory, updater, finalize, checkUnmount } = handlers;

  const sendMessage = useCallback(async () => {
    if (!input || busy) return;
    append({
      id: ulid(),
      type: "user",
      state: "settled",
      text: input,
      createdAt: Date.now(),
    });
    setInput("");
    appendHistory(input, true);
    toggle(true);
    const id = ulid();
    try {
      const data = await CompletionDto.format({
        prompt: historyRef.current.join("\n"),
        as_loop: true,
        stop: [`\n${schema.promptHeader}`],
        exclude: [`\n${schema.answerHeader}`],
        interactive: true,
      });
      const headers = new Headers();
      headers.append("Content-Type", "application/json");
      const response = await fetch(`/proxy/${model}/completion`, {
        headers,
        method: "POST",
        body: JSON.stringify(data),
      });
      const json = await response.json();
      if (checkUnmount()) return;
      if (json.status !== "done") throw new Error("Unexpected response");
      append({
        id,
        type: "assistant",
        state: "loading",
        text: "",
        createdAt: Date.now(),
      });
    } catch (e) {
      if (checkUnmount()) return;
      if (e instanceof Error) {
        const text = e.message;
        updater(
          (m) => m.id === id,
          (m) => ({ ...m, state: "error", text, settledAt: Date.now() })
        );
      }
    } finally {
      if (checkUnmount()) return;
      toggle(false);
    }
  }, [
    input,
    busy,
    append,
    updater,
    schema,
    toggle,
    model,
    appendHistory,
    historyRef,
    checkUnmount,
  ]);
  useEffect(() => {
    // use historyRef to stop async operations
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => void (historyRef.current.length = 0);
  }, [historyRef]);
  return {
    messages,
    busy,
    sendMessage,
    input,
    setInput,
    updater,
    finalize,
    historyRef,
  };
};

export const useChatLoader = (
  model: string,
  id: string,
  updater: Updater,
  finalize: () => void
) => {
  const es = useEvtSrc<{
    error?: string;
    text: string[];
    done: boolean;
  }>({
    path: `/api/proxy/${model}/sse`,
    asJson: true,
  });
  const [data] = es;
  const done = data?.done || false;
  const text = useMemo(() => data?.text || [], [data?.text]);
  const stop = useCallback(
    () => void fetch(`/api/proxy/${model}/sse`, { method: "DELETE" }),
    [model]
  );
  const itemUpdater = useCallback(
    (partial: Partial<ChatMessage>) =>
      updater(
        (m) => m.id === id,
        (m) => ({ ...m, ...partial })
      ),
    [id, updater]
  );

  // effects

  // call stop on unmount
  useDidUpdate(() => stop, [stop]);

  useEffect(
    // update settled text
    () => void (done && finalize()),
    [done, finalize]
  );
  useEffect(
    // update loading text
    () => void itemUpdater({ text: text.join("") }),
    [text, itemUpdater]
  );

  return es;
};
