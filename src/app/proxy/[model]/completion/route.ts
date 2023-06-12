import { ParseError } from "dto-classes";
import { NextResponse } from "next/server";
import { axios } from "~/lib/axios";
import { CompletionDto } from "~/lib/dto";
import { serverManager } from "~/lib/serverManager";

export const POST = async (
  req: Request,
  ctx: { params: { model: string } }
) => {
  const { model } = ctx.params;

  try {
    const dto = await CompletionDto.parse(await req.json());
    const port = await serverManager?.getPortByModelPath(model);
    if (!port)
      return new Response(`Port for ${model} not found`, { status: 404 });
    const response = await axios.post(
      `http://localhost:${port}/completion`,
      dto.getValues()
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
