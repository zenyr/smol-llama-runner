import { ActionIcon, Container, Group, Stack, Text } from "@mantine/core";
import { IconBackspace } from "@tabler/icons-react";
import Link from "next/link";
import { ConversationChat } from "~/comp/conversation/Chat";
import { ConversationServerStatus } from "~/comp/conversation/ServerStatus";

export default function Conversations({
  searchParams,
}: {
  searchParams: { model: string };
}) {
  const model = searchParams.model;
  return (
    <Container>
      <Stack p="lg" gap="lg" align="center">
        <Group preventGrowOverflow>
          <ActionIcon component={Link} href="/" variant="subtle">
            <IconBackspace />
          </ActionIcon>
          <Text ta="center" size="xs">
            Model: {model}
          </Text>
        </Group>
        <ConversationChat model={model} />
        <ConversationServerStatus model={model} />
      </Stack>
    </Container>
  );
}
