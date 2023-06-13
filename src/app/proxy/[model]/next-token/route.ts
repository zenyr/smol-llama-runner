import { ParseError } from "dto-classes";
import { NextResponse } from "next/server";
import { axios } from "~/lib/axios";
import { serverManager } from "~/lib/serverManager";

export const GET = async (req: Request, ctx: { params: { model: string } }) => {
  const { model } = ctx.params;

  try {
    const port = await serverManager?.getPortByModelPath(model);
    if (!port)
      return new Response(`Port for ${model} not found`, { status: 404 });
    const response = await axios.get(`http://localhost:${port}/next-token`);
    return NextResponse.json(response.data, {
      status: response.status,
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e instanceof ParseError) {
        return NextResponse.json(e, { status: 400 });
      }
      return NextResponse.json(e, { status: 500 });
    }
  }
};
export const DELETE = async (
  req: Request,
  ctx: { params: { model: string } }
) => {
  const { model } = ctx.params;

  try {
    const port = await serverManager?.getPortByModelPath(model);
    if (!port)
      return new Response(`Port for ${model} not found`, { status: 404 });
    const response = await axios.get(
      `http://localhost:${port}/next-token?stop=true`
    );
    return NextResponse.json(response.data, {
      status: response.status,
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e instanceof ParseError) {
        return NextResponse.json(e, { status: 400 });
      }
      return NextResponse.json(e, { status: 500 });
    }
  }
};
