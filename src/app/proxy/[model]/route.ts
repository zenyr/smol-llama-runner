import { NextResponse } from "next/server";
import { serverManager } from "~/lib/serverManager";

export const dynamic = "force-dynamic";
export const GET = async (req: Request, ctx: { params: { model: string } }) => {
  const { model } = ctx.params;
  let port = await serverManager?.getPortByModelPath(model);
  if (port) {
    await serverManager?.updateT(model);
    const memory = (await serverManager?.getMemoryUsageByModelPath(model)) || 0;
    return NextResponse.json({ port, memory });
  }

  port = await serverManager?.startProcess(model);
  if (!port)
    return NextResponse.json(
      JSON.stringify({ error: `Port for model ${model} not found` }),
      { status: 404 }
    );
  const memory = (await serverManager?.getMemoryUsageByModelPath(model)) || 0;
  return NextResponse.json({ port, memory });
};
