import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  CUSTOMER_SESSION_COOKIE,
  verifyCustomerSession,
} from "@/lib/customer-session";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const sessionValue = cookieStore.get(
      CUSTOMER_SESSION_COOKIE
    )?.value;

    if (!sessionValue) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    const session = verifyCustomerSession(sessionValue);

    if (!session?.customerId) {
      return NextResponse.json({
        authenticated: false,
      });
    }

    return NextResponse.json({
      authenticated: true,
      customerId: session.customerId,
    });
  } catch (error) {
    console.error("CUSTOMER SESSION ERROR:", error);

    return NextResponse.json(
      {
        authenticated: false,
      },
      { status: 500 }
    );
  }
}