// Due to a bug in Next.js, this file must be inside pages router :(

import { NextApiRequest, NextApiResponse } from "next";
import { axios } from "~/lib/axios";
import { SseDto } from "~/lib/dto";

const connections = new Set<NextApiResponse<any>>();

const serializeSSE = (data: {
  data?: string | Record<string, unknown>;
  event?: string;
  id?: string;
  retry?: number;
}) => {
  const lines = [];
  if (data.event) lines.push(`event: ${data.event}`);
  if (data.id) lines.push(`id: ${data.id}`);
  if (data.retry) lines.push(`retry: ${data.retry}`);
  if (data.data)
    lines.push(`data: ${JSON.stringify(data.data).replace(/\n/g, "\ndata:")}`);
  lines.push("");
  lines.push("");
  return lines.join("\n");
};

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  if (req.method === "DELETE") {
    // force-close all connections
    connections.clear();
    return void res.status(200).end();
  }
  if (req.method !== "GET") {
    return void res.status(405).end(`Method ${req.method} not allowed`);
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  connections.add(res);
  const { model } = req.query;

  let text = [] as string[];
  try {
    while (true) {
      const connectionLost = !connections.has(res);
      const response = await axios.get(
        `http://localhost:3000/proxy/${model}/next-token${
          connectionLost ? "?stop=true" : ""
        }`
      );
      const { content, stop: done } = response.data;
      if (content) text.push(content);
      const data = await SseDto.format({ text, done });
      res.write(serializeSSE({ data }));
      if (connectionLost || done) break;
    }
  } finally {
    connections.delete(res);
    res.end();
  }
};

export default handler;
