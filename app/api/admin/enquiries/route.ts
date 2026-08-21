import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-server";

type EnquiryRow = {
  id: number;
  enquiry_id: string;
  customer_user_id: string;
  property_id: number;
  contact_method: string;
  status: string;
  created_at: string;
  updated_at: string;
  visit_date: string | null;
  visit_time: string | null;
  visit_status: string | null;
  proposed_visit_date: string | null;
  proposed_visit_time: string | null;
};

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) {
    return NextResponse.json(
      { error: "Admin authentication required." },
      { status: 401 }
    );
  }

  const { data: userData, error: userError } =
    await supabaseServer.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: "Admin authentication is invalid or expired." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const authenticatedClient = createClient(
    supabaseUrl,
    publishableKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );

  const { data: adminResult, error: adminError } =
    await authenticatedClient.rpc("is_admin");

  if (adminError || !adminResult) {
    return NextResponse.json(
      { error: "This account is not authorized as an administrator." },
      { status: 403 }
    );
  }

  const { data: enquiries, error: enquiryError } =
    await supabaseServer
      .from("enquiries")
      .select(
        "id, enquiry_id, customer_user_id, property_id, contact_method, status, created_at, updated_at, visit_date, visit_time, visit_status, proposed_visit_date, proposed_visit_time"
      )
      .order("created_at", { ascending: false });

  if (enquiryError) {
    console.error("ADMIN ENQUIRIES ERROR:", enquiryError);
    return NextResponse.json(
      { error: enquiryError.message },
      { status: 500 }
    );
  }

  const rawEnquiries = (enquiries || []) as EnquiryRow[];
  const customerIds = Array.from(
    new Set(rawEnquiries.map((enquiry) => enquiry.customer_user_id).filter(Boolean))
  );
  const propertyIds = Array.from(
    new Set(rawEnquiries.map((enquiry) => enquiry.property_id).filter(Number.isInteger))
  );

  const [{ data: customers, error: customerError }, { data: properties, error: propertyError }] =
    await Promise.all([
      customerIds.length
        ? supabaseServer.from("customer_profiles").select("id, full_name, phone").in("id", customerIds)
        : Promise.resolve({ data: [], error: null }),
      propertyIds.length
        ? supabaseServer.from("properties").select("id, title, broker_name, broker_phone").in("id", propertyIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (customerError || propertyError) {
    const error = customerError || propertyError;
    console.error("ADMIN ENQUIRY DETAILS ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to load enquiry details." },
      { status: 500 }
    );
  }

  const customerMap = new Map(
    (customers || []).map((customer) => [customer.id, customer])
  );
  const propertyMap = new Map(
    (properties || []).map((property) => [property.id, property])
  );

  return NextResponse.json({
    enquiries: rawEnquiries.map((enquiry) => {
      const customer = customerMap.get(enquiry.customer_user_id);
      const property = propertyMap.get(enquiry.property_id);

      return {
        ...enquiry,
        customer_name: customer?.full_name || "Not provided",
        customer_phone: customer?.phone || "Not provided",
        property_title: property?.title || `Property ${enquiry.property_id}`,
        broker_name: property?.broker_name || "Not provided",
        broker_phone: property?.broker_phone || "Not provided",
      };
    }),
  });
}
