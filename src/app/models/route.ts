import { NextResponse } from "next/server";
import { serverManager } from "~/lib/serverManager";

export const GET = async () => {
  const models = await serverManager?.getAvailableModels();
  return NextResponse.json(models);
};
