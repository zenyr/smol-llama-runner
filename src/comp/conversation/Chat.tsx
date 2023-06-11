"use client";

import { ActionIcon, Box, Paper, Stack, TextInput } from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { ChangeEvent, FormEvent, MouseEvent, useCallback } from "react";
import { useChat } from "~/lib/hooks/useChat";
import { ConversationChatLoader } from "./ChatLoader";
import { ConversationMessage } from "./Message";
import c from "./style.module.css";

export const ConversationChat = ({ model }: { model: string }) => {
  const { messages, sendMessage, input, setInput, busy, updater, finalize } =
    useChat(model);
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      sendMessage();
    },
    [sendMessage]
  );
  const handleSubmitClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      sendMessage();
    },
    [sendMessage]
  );
  const handleInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setInput(e.currentTarget.value),
    [setInput]
  );
  return (
    <>
      <Stack gap="sm">
        {messages.map((m) =>
          m.state === "loading" ? (
            <ConversationMessage key={m.id} {...m}>
              <ConversationChatLoader
                model={model}
                id={m.id}
                updater={updater}
                finalize={finalize}
              />
            </ConversationMessage>
          ) : (
            <ConversationMessage key={m.id} {...m} />
          )
        )}
      </Stack>
      <Paper
        p="sm"
        shadow="xl"
        component="form"
        onSubmit={handleSubmit}
        className={c.form}
      >
        <TextInput
          variant="filled"
          size="xs"
          label="Prompt"
          placeholder="Ask llama..."
          autoComplete="off"
          autoFocus
          disabled={busy}
          value={input}
          onInput={handleInput}
          rightSection={
            <ActionIcon disabled={busy} onClick={handleSubmitClick} size="xs">
              <IconSend size={12} />
            </ActionIcon>
          }
        />
      </Paper>
    </>
  );
};
