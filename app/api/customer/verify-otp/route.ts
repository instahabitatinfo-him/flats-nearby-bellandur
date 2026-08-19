import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import {
  createCustomerSession,
  CUSTOMER_SESSION_COOKIE,
} from "@/lib/customer-session";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").replace(/\D/g, "");
    const accessToken = String(body.accessToken || "").trim();

    if (!fullName || phone.length !== 10 || !accessToken) {
      return NextResponse.json(
        { error: "Invalid verification data" },
        { status: 400 }
      );
    }

    const authKey = process.env.MSG91_AUTH_KEY;

    if (!authKey) {
      return NextResponse.json(
        { error: "OTP verification service is not configured" },
        { status: 500 }
      );
    }

    const msg91Response = await fetch(
      "https://control.msg91.com/api/v5/widget/verifyAccessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authkey: authKey,
          "access-token": accessToken,
        }),
      }
    );

    if (!msg91Response.ok) {
      return NextResponse.json(
        { error: "Mobile number verification failed" },
        { status: 401 }
      );
    }

    const { data: customer, error: customerError } = await supabaseServer
      .from("customer_profiles")
      .upsert(
        {
          full_name: fullName,
          phone,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "phone",
        }
      )
      .select("id, full_name, phone")
      .single();

    if (customerError) {
 console.error(
  "CUSTOMER PROFILE ERROR:",
  JSON.stringify(customerError, null, 2)
);

      return NextResponse.json(
        { error: "Unable to save customer profile" },
        { status: 500 }
      );
    }

    const session = createCustomerSession(customer.id);

const response = NextResponse.json({
  verified: true,
  customer: {
    id: customer.id,
    fullName: customer.full_name,
    phone: customer.phone,
  },
});

response.cookies.set({
  name: CUSTOMER_SESSION_COOKIE,
  value: session,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
});

return response;
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return NextResponse.json(
      { error: "Unable to verify OTP" },
      { status: 500 }
    );
  }
}