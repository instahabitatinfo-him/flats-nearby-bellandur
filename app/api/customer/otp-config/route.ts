import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.MSG91_WIDGET_TOKEN;

  if (!token) {
    console.error("MSG91 widget token is missing from environment");

    return NextResponse.json(
      { configured: false },
      { status: 500 }
    );
  }

  return NextResponse.json({
    configured: true,
    widgetId: "3668736d7a50343935393230",
    token,
  });
}