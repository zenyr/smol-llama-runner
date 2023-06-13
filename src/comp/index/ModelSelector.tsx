"use client";

import { Anchor, Button, Table, TableCaption } from "@mantine/core";
import { useCounter, useForceUpdate } from "@mantine/hooks";
import { IconHandStop } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { axios } from "~/lib/axios";
import { beautfyFilesize } from "~/lib/utils";

export const ModelSelector = () => {
  const [models, setModels] = useState<
    { filename: string; size: number; port?: number }[]
  >([]);
  const [c, setCounter] = useCounter(0);
  const handleStopAll = useCallback(
    () => axios.delete(`/proxy/servers/all`).then(() => setCounter.increment()),
    [setCounter]
  );
  useEffect(() => {
    axios(`/models?_=${Math.random()}`)
      .then((r) => r.data)
      .then(setModels);
  }, [c]);
  return (
    <Table striped highlightOnHover>
      <TableCaption>
        <Button leftSection={<IconHandStop />} onClick={handleStopAll}>
          Stop all
        </Button>
      </TableCaption>
      <thead>
        <tr>
          <th>Model</th>
          <th>Size</th>
          <th>Port</th>
        </tr>
      </thead>
      <tbody>
        {models.map((m) => (
          <tr key={m.filename}>
            <td>
              <Anchor component={Link} href={`/c/?model=${m.filename}`}>
                {m.filename}
              </Anchor>
            </td>
            <td>{beautfyFilesize(m.size)}</td>
            <td>{m.port || "-"}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
