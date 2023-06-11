"use client";

import { Anchor, Table } from "@mantine/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { axios } from "~/lib/axios";

const beautfyFilesize = (size: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unit = 0;
  while (size > 1024) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(2)} ${units[unit]}`;
};

export const ModelSelector = () => {
  const [models, setModels] = useState<{ filename: string; size: number }[]>(
    []
  );
  useEffect(() => {
    axios("/models")
      .then((r) => r.data)
      .then(setModels);
  }, []);
  return (
    <Table striped highlightOnHover>
      <thead>
        <tr>
          <th>Model</th>
          <th>Size</th>
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
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
