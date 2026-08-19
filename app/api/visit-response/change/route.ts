import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const token = String(
      formData.get("token") || ""
    ).trim();

    const proposedVisitDate = String(
      formData.get("proposedVisitDate") || ""
    ).trim();

    const proposedVisitTime = String(
      formData.get("proposedVisitTime") || ""
    ).trim();

    if (
      !token ||
      !proposedVisitDate ||
      !proposedVisitTime
    ) {
      return NextResponse.json(
        {
          error:
            "Token, date and time are required.",
        },
        { status: 400 }
      );
    }

    const { data: enquiry, error } =
      await supabaseServer
        .from("enquiries")
        .select(
          "id, enquiry_id, owner_action_expires_at"
        )
        .eq("owner_action_token", token)
        .eq("contact_method", "visit")
        .maybeSingle();

    if (error || !enquiry) {
      return NextResponse.json(
        { error: "Visit request not found." },
        { status: 404 }
      );
    }

    if (
      !enquiry.owner_action_expires_at ||
      new Date(
        enquiry.owner_action_expires_at
      ).getTime() < Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "This visit response link has expired.",
        },
        { status: 410 }
      );
    }

    const { error: updateError } =
      await supabaseServer
        .from("enquiries")
        .update({
          visit_status: "change_requested",
          status: "visit_change_requested",
          proposed_visit_date: proposedVisitDate,
          proposed_visit_time: proposedVisitTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", enquiry.id);

    if (updateError) {
      console.error(
        "VISIT CHANGE REQUEST ERROR:",
        JSON.stringify(updateError, null, 2)
      );

      return NextResponse.json(
        {
          error:
            "Unable to save the proposed visit time.",
        },
        { status: 500 }
      );
    }

    return new Response(
      `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>HomeEase - Time Change Sent</title>
        </head>
        <body style="font-family: system-ui, sans-serif; padding: 32px; text-align: center; background: #f8fafc;">
          <div style="max-width: 420px; margin: 60px auto; background: white; padding: 24px; border-radius: 18px; border: 1px solid #e5e7eb;">
            <h1 style="margin: 0; color: #111827;">HomeEase</h1>
            <h2 style="color: #111827;">New time sent</h2>
            <p style="color: #4b5563;">
              The customer can now see your proposed visit time in My HomeEase.
            </p>
            <p style="font-size: 13px; color: #6b7280;">
              Enquiry ID: ${enquiry.enquiry_id}
            </p>
          </div>
        </body>
      </html>
      `,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  } catch (error) {
    console.error(
      "VISIT CHANGE API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to process the visit time change.",
      },
      { status: 500 }
    );
  }
}
