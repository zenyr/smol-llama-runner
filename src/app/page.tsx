import { Stack } from "@mantine/core";
import { ModelSelector } from "~/comp/index/ModelSelector";

export default function Home() {
  return (
    <Stack p="lg" gap="lg" align="center">
      <ModelSelector />
    </Stack>
  );
}
