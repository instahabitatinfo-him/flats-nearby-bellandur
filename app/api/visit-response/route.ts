import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const action = url.searchParams.get("action");

  if (!token || !action) {
    return NextResponse.json(
      { error: "Invalid visit response link" },
      { status: 400 }
    );
  }

  const allowedActions = [
    "confirm",
    "decline",
    "change",
  ];

  if (!allowedActions.includes(action)) {
    return NextResponse.json(
      { error: "Invalid visit action" },
      { status: 400 }
    );
  }

  const { data: enquiry, error } = await supabaseServer
    .from("enquiries")
    .select(
      "id, enquiry_id, property_id, contact_method, visit_date, visit_time, visit_status, owner_action_expires_at"
    )
    .eq("owner_action_token", token)
    .eq("contact_method", "visit")
    .maybeSingle();

  if (error) {
    console.error(
      "VISIT RESPONSE LOOKUP ERROR:",
      JSON.stringify(error, null, 2)
    );

    return NextResponse.json(
      { error: "Unable to find visit request" },
      { status: 500 }
    );
  }

  if (!enquiry) {
    return NextResponse.json(
      { error: "Visit request not found" },
      { status: 404 }
    );
  }

  if (
    !enquiry.owner_action_expires_at ||
    new Date(enquiry.owner_action_expires_at).getTime() <
      Date.now()
  ) {
    return NextResponse.json(
      { error: "This visit response link has expired" },
      { status: 410 }
    );
  }

  if (action === "confirm") {
    const { error: updateError } = await supabaseServer
      .from("enquiries")
      .update({
        visit_status: "confirmed",
        status: "visit_confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", enquiry.id);

    if (updateError) {
      console.error(
        "VISIT CONFIRM ERROR:",
        JSON.stringify(updateError, null, 2)
      );

      return NextResponse.json(
        { error: "Unable to confirm visit" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action: "confirmed",
      enquiryId: enquiry.enquiry_id,
    });
  }

  if (action === "decline") {
    const { error: updateError } = await supabaseServer
      .from("enquiries")
      .update({
        visit_status: "declined",
        status: "visit_declined",
        updated_at: new Date().toISOString(),
      })
      .eq("id", enquiry.id);

    if (updateError) {
      console.error(
        "VISIT DECLINE ERROR:",
        JSON.stringify(updateError, null, 2)
      );

      return NextResponse.json(
        { error: "Unable to decline visit" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action: "declined",
      enquiryId: enquiry.enquiry_id,
    });
  }

  return NextResponse.json({
    success: true,
    action: "change",
    enquiry: {
      enquiryId: enquiry.enquiry_id,
      propertyId: enquiry.property_id,
      visitDate: enquiry.visit_date,
      visitTime: enquiry.visit_time,
    },
  });
}
