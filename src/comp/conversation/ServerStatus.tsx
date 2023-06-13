"use client";

import { Badge, Box } from "@mantine/core";
import { useInterval } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { axios } from "~/lib/axios";
import { beautfyFilesize } from "~/lib/utils";

export const ConversationServerStatus = ({ model }: { model: string }) => {
  const [status, setStatus] = useState<{ port: number; memory: number } | null>(
    null
  );
  const [ticker, setTicker] = useState(0);
  const interval = useInterval(() => setTicker((s) => s + 1), 30000);

  useEffect(() => {
    interval.start();
    axios
      .get(`/proxy/${model}?_=${Math.random()}`)
      .then((j) => setStatus(j.data))
      .catch(() => setStatus(null));
    return () => {
      axios.delete(`/proxy/${model}/next-token`);
      interval.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, ticker]);
  const port = status?.port || "N/A";
  const memory = (status?.memory && beautfyFilesize(status.memory)) || "N/A";
  const online = !!status?.port;
  return (
    <Box mb="xl" pb="xl">
      <Badge variant="dot" color={online ? "green" : "red"}>
        Port {port} / memory {memory}
      </Badge>
    </Box>
  );
};
