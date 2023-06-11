import { Avatar, Group, Paper, Stack, Text } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";
import { ReactNode } from "react";
import { ChatMessage } from "~/lib/hooks/useChat";
import c from "./style.module.css";
type Props = ChatMessage & { children?: ReactNode };
export const ConversationMessage = ({ type, text, children }: Props) => {
  const justify =
    type === "user" ? "flex-end" : type === "system" ? "center" : "flex-start";
  const align =
    type === "user" ? "right" : type === "system" ? "center" : "left";
  const avatar =
    type === "user" ? (
      <Avatar size={24} color="green" />
    ) : type === "system" ? (
      <Avatar size={24} color="lime">
        Sys
      </Avatar>
    ) : (
      <Avatar size={24} color="orange">
        <IconCpu size={14} />
      </Avatar>
    );
  const dataAttr = { [`data-${type}`]: true };
  return (
    <Paper shadow="md" p="xs" className={c.message} {...dataAttr}>
      <Stack gap="xs">
        <Group align="center" justify={justify}>
          {avatar}
        </Group>
        {children ? children : <Text ta={align}>{text}</Text>}
      </Stack>
    </Paper>
  );
};
