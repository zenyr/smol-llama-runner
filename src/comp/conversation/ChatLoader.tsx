import { Loader, Text } from "@mantine/core";
import { Fragment } from "react";
import { Updater, useChatLoader } from "~/lib/hooks/useChat";
import c from "./style.module.css";

export const ConversationChatLoader = ({
  model,
  id,
  updater,
  finalize,
}: {
  model: string;
  id: string;
  updater: Updater;
  finalize(): void;
}) => {
  const [state, connected] = useChatLoader(model, id, updater, finalize);
  return (
    <Text>
      {state?.text?.map((t, i) => (
        <Fragment key={i}>{t}</Fragment>
      ))}
      {connected && <Loader type="dots" size={12} className={c.loader} />}
    </Text>
  );
};
