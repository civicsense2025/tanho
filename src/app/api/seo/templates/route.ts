import { NextResponse } from "next/server";
import { listSeoTemplates } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await listSeoTemplates());
}
