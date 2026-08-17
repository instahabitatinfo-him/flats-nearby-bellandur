import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    const { data: customer, error: customerError } = await supabase
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
      console.error("CUSTOMER PROFILE ERROR:", customerError);

      return NextResponse.json(
        { error: "Unable to save customer profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verified: true,
      customer: {
        id: customer.id,
        fullName: customer.full_name,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return NextResponse.json(
      { error: "Unable to verify OTP" },
      { status: 500 }
    );
  }
}