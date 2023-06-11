import { useEffect, useState } from "react";

const safeParseJson = <T extends unknown>(data: string): T | null => {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const useEvtSrc = <T extends unknown = string>({
  path,
  enabled = true,
  asJson = true,
  onFinish,
}: {
  path: string;
  asJson?: boolean;
  enabled?: boolean;
  onFinish?(): void;
}): [T | null, boolean] => {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource(path);
    const handleMessage = (e: MessageEvent) => {
      const data = asJson ? safeParseJson(e.data) : e.data;
      setData(data);
      if ("done" in data && data.done) {
        es.close();
      }
    };
    const handleOpen = () => setConnected(true);
    const handleClose = () => (setConnected(false), onFinish?.());
    es.addEventListener("open", handleOpen);
    es.addEventListener("message", handleMessage);
    es.addEventListener("end", handleClose);

    return () =>
      void (es.removeEventListener("open", handleOpen),
      es.removeEventListener("message", handleMessage),
      es.removeEventListener("close", handleClose),
      es.close());
  }, [enabled, asJson, onFinish, path]);
  return [data, connected];
};