import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { supabaseServer } from "@/lib/supabase-server";
import {
  CUSTOMER_SESSION_COOKIE,
  verifyCustomerSession,
} from "@/lib/customer-session";

function formatPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  return cleaned;
}

function formatDateForMessage(date: string | null) {
  if (!date) return "Not selected";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTimeForMessage(time: string | null) {
  if (!time) return "Not selected";

  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date();

  d.setHours(hours, minutes, 0, 0);

  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

async function sendVisitRequestWhatsApp(params: {
  brokerWhatsApp: string;
  propertyTitle: string;
  visitDate: string | null;
  visitTime: string | null;
  enquiryId: string;
  ownerActionToken: string;
}) {
  const authKey =
    process.env.MSG91_WHATSAPP_AUTH_KEY;

  const integratedNumber =
    process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER;

  const templateName =
    process.env.MSG91_WHATSAPP_TEMPLATE_NAME;

  const templateLanguage =
    process.env.MSG91_WHATSAPP_TEMPLATE_LANGUAGE ||
    "en";

  const templateNamespace =
    process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE;

  const publicUrl =
    process.env.HOMEEASE_PUBLIC_URL;

  if (
    !authKey ||
    !integratedNumber ||
    !templateName ||
    !templateNamespace ||
    !publicUrl
  ) {
    throw new Error(
      "MSG91 WhatsApp environment variables are not configured."
    );
  }

  const recipient = formatPhone(
    params.brokerWhatsApp
  );

  if (recipient.length < 12) {
    throw new Error(
      "Invalid broker WhatsApp number."
    );
  }

  const responseUrl =
    `${publicUrl.replace(/\/$/, "")}/visit-response/` +
    encodeURIComponent(params.ownerActionToken);

  const payload = {
    integrated_number: integratedNumber,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
          policy: "deterministic",
        },
        namespace: templateNamespace,
        to_and_components: [
          {
            to: [recipient],
            components: {
              body_1: {
                type: "text",
                value: params.propertyTitle,
              },
              body_2: {
                type: "text",
                value: formatDateForMessage(
                  params.visitDate
                ),
              },
              body_3: {
                type: "text",
                value: formatTimeForMessage(
                  params.visitTime
                ),
              },
              body_4: {
                type: "text",
                value: params.enquiryId,
              },
              button_1: {
                type: "text",
                subtype: "url",
                value: params.ownerActionToken,
              },
            },
          },
        ],
      },
    },
  };

  const response = await fetch(
    "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: authKey,
      },
      body: JSON.stringify(payload),
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `MSG91 WhatsApp error ${response.status}: ${responseText}`
    );
  }

  console.log(
    "VISIT WHATSAPP SENT:",
    responseText
  );

  return responseText;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const propertyId = Number(body.propertyId);
    const contactMethod = body.contactMethod;
    const visitDate = String(
      body.visitDate || ""
    ).trim();
    const visitTime = String(
      body.visitTime || ""
    ).trim();

    if (
      !Number.isInteger(propertyId) ||
      ![
        "call",
        "whatsapp",
        "maps",
        "visit",
      ].includes(contactMethod)
    ) {
      return NextResponse.json(
        { error: "Invalid enquiry data" },
        { status: 400 }
      );
    }

    if (
      contactMethod === "visit" &&
      (!visitDate || !visitTime)
    ) {
      return NextResponse.json(
        {
          error:
            "Visit date and time are required",
        },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const sessionValue = cookieStore.get(
      CUSTOMER_SESSION_COOKIE
    )?.value;

    if (!sessionValue) {
      return NextResponse.json(
        {
          error:
            "Customer login required",
        },
        { status: 401 }
      );
    }

    const session =
      verifyCustomerSession(sessionValue);

    if (!session?.customerId) {
      return NextResponse.json(
        {
          error:
            "Customer session is invalid or expired",
        },
        { status: 401 }
      );
    }

    const customerUserId =
      session.customerId;

    const since = new Date(
      Date.now() - 12 * 60 * 60 * 1000
    ).toISOString();

    const {
      data: recentEnquiries,
      error: recentError,
    } = await supabaseServer
      .from("enquiries")
      .select("property_id")
      .eq(
        "customer_user_id",
        customerUserId
      )
      .gte("created_at", since);

    if (recentError) {
      console.error(
        "ENQUIRY LIMIT CHECK ERROR:",
        JSON.stringify(
          recentError,
          null,
          2
        )
      );

      return NextResponse.json(
        {
          error:
            "Unable to check enquiry limit",
        },
        { status: 500 }
      );
    }

    const recentPropertyIds =
      new Set(
        (recentEnquiries || []).map(
          (enquiry) =>
            Number(enquiry.property_id)
        )
      );

    const isNewProperty =
      !recentPropertyIds.has(
        propertyId
      );

    if (
      isNewProperty &&
      recentPropertyIds.size >= 5
    ) {
      return NextResponse.json(
        {
          error:
            "You have reached the limit of 5 properties in the last 12 hours. Please try again later.",
          limitReached: true,
        },
        { status: 429 }
      );
    }

    const enquiryId =
      `HE-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;

    const {
      data,
      error,
    } = await supabaseServer
      .from("enquiries")
      .insert({
        enquiry_id: enquiryId,
        customer_user_id:
          customerUserId,
        property_id: propertyId,
        contact_method:
          contactMethod,
        status:
          contactMethod === "visit"
            ? "visit_requested"
            : "contacted",
        visit_date:
          contactMethod === "visit"
            ? visitDate
            : null,
        visit_time:
          contactMethod === "visit"
            ? visitTime
            : null,
        visit_status:
          contactMethod === "visit"
            ? "requested"
            : null,
      })
      .select(
        `
        id,
        enquiry_id,
        customer_user_id,
        property_id,
        contact_method,
        status,
        visit_date,
        visit_time,
        visit_status,
        owner_action_token,
        created_at
        `
      )
      .single();

    if (error) {
      console.error(
        "ENQUIRY CREATE ERROR:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

      return NextResponse.json(
        {
          error:
            "Unable to create enquiry",
        },
        { status: 500 }
      );
    }

    if (
      contactMethod === "visit"
    ) {
      const {
        data: property,
        error: propertyError,
      } = await supabaseServer
        .from("properties")
        .select(
          "title, broker_name, broker_whatsapp"
        )
        .eq("id", propertyId)
        .maybeSingle();

      if (propertyError) {
        console.error(
          "VISIT BROKER LOOKUP ERROR:",
          JSON.stringify(
            propertyError,
            null,
            2
          )
        );
      } else if (
        property?.broker_whatsapp &&
        data?.owner_action_token
      ) {
        try {
          await sendVisitRequestWhatsApp({
            brokerWhatsApp:
              String(
                property.broker_whatsapp
              ),
            propertyTitle:
              property.title ||
              `Property ${propertyId}`,
            visitDate:
              data.visit_date,
            visitTime:
              data.visit_time,
            enquiryId:
              data.enquiry_id,
            ownerActionToken:
              data.owner_action_token,
          });
        } catch (whatsappError) {
          console.error(
            "VISIT WHATSAPP NOTIFICATION ERROR:",
            whatsappError
          );

          // The enquiry remains successfully created.
          // WhatsApp delivery failure must not erase the customer's visit request.
        }
      }
    }

    let ownerResponseUrl: string | null = null;

    if (
      contactMethod === "visit" &&
      data?.owner_action_token
    ) {
      const origin =
        process.env.HOMEEASE_PUBLIC_URL ||
        new URL(request.url).origin;

      ownerResponseUrl =
        `${origin.replace(/\/$/, "")}/visit-response/${encodeURIComponent(
          data.owner_action_token
        )}`;
    }

    return NextResponse.json({
      enquiry: {
        ...data,
        owner_action_token: undefined,
      },
      ownerResponseUrl,
      propertiesUsed:
        isNewProperty
          ? recentPropertyIds.size + 1
          : recentPropertyIds.size,
      propertiesLimit: 5,
    });
  } catch (error) {
    console.error(
      "ENQUIRY API ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
