import { NextResponse } from "next/server";

export async function GET() {
  const token =
    process.env.MSG91_WIDGET_TOKEN ||
    process.env.NEXT_PUBLIC_MSG91_WIDGET_TOKEN;

  if (!token) {
    console.error("MSG91 widget token is missing from Vercel environment");

    return NextResponse.json(
      { configured: false },
      { status: 500 }
    );
  }

  return NextResponse.json({
    configured: true,
    widgetId: "366871707557363233343135",
    token,
  });
}