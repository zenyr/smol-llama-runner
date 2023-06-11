import { NextResponse } from "next/server";
import { serverManager } from "~/lib/serverManager";

export const GET = async (req: Request, ctx: { params: { model: string } }) => {
  const { model } = ctx.params;
  let port = await serverManager.getPortByModelPath(model);
  if (port) {
    serverManager.resetTTL(model);
    return NextResponse.json({ port });
  }

  port = await serverManager.startServer(model);
  if (!port)
    return NextResponse.json(
      JSON.stringify({ error: `Model ${model} not found` }),
      { status: 404 }
    );
  return NextResponse.json({ port });
};
