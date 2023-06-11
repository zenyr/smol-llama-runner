"use client";

import { Badge, Box } from "@mantine/core";
import { useInterval } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { axios } from "~/lib/axios";

export const ConversationServerStatus = ({ model }: { model: string }) => {
  const [status, setStatus] = useState<{ port: number } | null>(null);
  const [ticker, setTicker] = useState(0);
  const interval = useInterval(() => setTicker((s) => s + 1), 30000);

  useEffect(() => {
    interval.start();
    axios
      .get(`/proxy/${model}`)
      .then((j) => setStatus(j.data))
      .catch(() => setStatus(null));
    return interval.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, ticker]);
  const port = status?.port || "N/A";
  const online = !!status?.port;
  return (
    <Box mb="xl" pb="xl">
      <Badge variant="dot" color={online ? "green" : "red"}>
        Port {port}
      </Badge>
    </Box>
  );
};
