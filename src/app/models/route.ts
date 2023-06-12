import { NextResponse } from "next/server";
import { serverManager } from "~/lib/serverManager";

export const dynamic = "force-dynamic";
export const GET = async () => {
  const models = await serverManager?.getModelPaths();
  return NextResponse.json(models);
};
