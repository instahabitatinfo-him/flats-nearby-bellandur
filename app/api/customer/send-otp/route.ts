import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Phone verification is not configured yet. Please configure an SMS provider before using customer login.",
    },
    { status: 503 }
  );
}
