"use client";

import { Button, Stack, Text } from "@mantine/core";
import { useToggle } from "@mantine/hooks";
import { useEffect } from "react";
import { useEvtSrc } from "~/lib/hooks/useEvtSrc";

const Inner = ({ model }: { model: string }) => {
  const [es, online] = useEvtSrc<string[]>({
    path: `/api/proxy/${model}/sse`,
    asJson: true,
  });
  useEffect(() => {
    return () => void fetch(`/api/proxy/${model}/sse`, { method: "DELETE" });
  }, [model]);

  return <>{es ? <Text>{JSON.stringify(es)}</Text> : <Text>No data</Text>}</>;
};

export const Test = () => {
  const [active, toggle] = useToggle();

  return (
    <Stack>
      <Button onClick={() => toggle()}>Toggle</Button>
      {active && <Inner model="asdf" />}
    </Stack>
  );
};
