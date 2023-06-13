import { NextResponse } from "next/server";
import { serverManager } from "~/lib/serverManager";

export const dynamic = "force-dynamic";
export const DELETE = async (
  req: Request,
  ctx: { params: { port: string } }
) => {
  const { port: _port } = ctx.params;
  if (_port === "all") {
    const done = await serverManager?.stopAll();
    return NextResponse.json({ done });
  }

  const port = parseInt(_port, 10);
  try {
    const done = await serverManager?.stopByPort(port);
    return NextResponse.json({ done });
  } catch (e) {
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 500 });
  }
};
