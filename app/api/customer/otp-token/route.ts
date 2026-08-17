import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.MSG91_WIDGET_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "MSG91 widget token is not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({ token });
}
