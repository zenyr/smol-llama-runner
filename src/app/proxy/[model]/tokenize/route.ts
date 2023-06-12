import { ParseError } from "dto-classes";
import { NextResponse } from "next/server";
import { axios } from "~/lib/axios";
import { TokenizeDto } from "~/lib/dto";
import { serverManager } from "~/lib/serverManager";

export const POST = async (
  req: Request,
  ctx: { params: { model: string } }
) => {
  const { model } = ctx.params;

  try {
    const dto = await TokenizeDto.parse(await req.json());
    const port = await serverManager?.getPortByModelPath(model);
    if (!port)
      return NextResponse.json(
        { error: `Port for ${model} not found.` },
        { status: 404 }
      );
    const response = await axios.post(
      `http://localhost:${port}/tokenize`,
      dto.getValues()
    );
    return NextResponse.json(response.data, { status: response.status });
  } catch (e) {
    if (e instanceof Error) {
      const errJson = { error: e.message };
      if (e instanceof ParseError) {
        return NextResponse.json(errJson, { status: 400 });
      }
      return NextResponse.json(errJson, { status: 500 });
    }
  }
};
