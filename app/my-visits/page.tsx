import Link from "next/link";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";
import {
  CUSTOMER_SESSION_COOKIE,
  verifyCustomerSession,
} from "@/lib/customer-session";

type Enquiry = {
  id: number;
  enquiry_id: string;
  property_id: number;
  contact_method: "call" | "whatsapp" | "maps" | "visit";
  status: string;
  visit_date: string | null;
  visit_time: string | null;
  visit_status: string | null;
  created_at: string;
};

type Property = {
  id: number;
  title: string;
  address: string | null;
};

function formatVisitDate(date: string | null) {
  if (!date) return "Date not selected";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatVisitTime(time: string | null) {
  if (!time) return "Time not selected";

  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getVisitStatusLabel(status: string | null) {
  switch (status) {
    case "confirmed":
      return "✅ Confirmed";
    case "declined":
      return "❌ Declined";
    case "change_requested":
      return "🔄 Time change requested";
    case "cancelled":
      return "🚫 Cancelled";
    case "completed":
      return "✅ Visit completed";
    default:
      return "⏳ Awaiting confirmation";
  }
}

export default async function MyVisitsPage() {
  const cookieStore = await cookies();

  const sessionValue = cookieStore.get(
    CUSTOMER_SESSION_COOKIE
  )?.value;

  if (!sessionValue) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-5 py-10">
          <Link href="/" className="text-sm font-semibold text-blue-600">
            ← Back to Home
          </Link>

          <div className="mt-10 bg-white rounded-2xl p-6 shadow-sm border">
            <h1 className="text-2xl font-bold text-gray-900">
              My HomeEase
            </h1>

            <p className="mt-3 text-gray-600">
              Please login to view your visits and enquiries.
            </p>

            <Link
              href="/"
              className="inline-block mt-6 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold"
            >
              Login from Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const session = verifyCustomerSession(sessionValue);

  if (!session?.customerId) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-5 py-10">
          <Link href="/" className="text-sm font-semibold text-blue-600">
            ← Back to Home
          </Link>

          <div className="mt-10 bg-white rounded-2xl p-6 shadow-sm border">
            <h1 className="text-2xl font-bold text-gray-900">
              Session expired
            </h1>

            <p className="mt-3 text-gray-600">
              Please return to HomeEase and login again.
            </p>

            <Link
              href="/"
              className="inline-block mt-6 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: enquiries, error } = await supabaseServer
    .from("enquiries")
    .select(
      "id, enquiry_id, property_id, contact_method, status, visit_date, visit_time, visit_status, created_at"
    )
    .eq("customer_user_id", session.customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "MY VISITS ENQUIRY LOAD ERROR:",
      JSON.stringify(error, null, 2)
    );
  }

  const enquiryRows = (enquiries || []) as Enquiry[];

  const propertyIds = Array.from(
    new Set(enquiryRows.map((enquiry) => enquiry.property_id))
  );

  let properties: Property[] = [];

  if (propertyIds.length > 0) {
    const { data: propertyData } = await supabaseServer
      .from("properties")
      .select("id, title, address")
      .in("id", propertyIds);

    properties = (propertyData || []) as Property[];
  }

  const propertyMap = new Map(
    properties.map((property) => [Number(property.id), property])
  );

  const visitEnquiries = enquiryRows.filter(
    (enquiry) =>
      enquiry.contact_method === "visit" &&
      enquiry.visit_date &&
      enquiry.visit_time
  );

  const otherEnquiries = enquiryRows.filter(
    (enquiry) => enquiry.contact_method !== "visit"
  );

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-5 py-4">
          <Link href="/" className="text-sm font-semibold text-blue-600">
            ← HomeEase
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mt-4">
            My HomeEase
          </h1>

          <p className="text-sm text-gray-600 mt-1">
            Your visits and property enquiries
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6">
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            My Visits
          </h2>

          {visitEnquiries.length === 0 ? (
            <div className="mt-3 bg-white border rounded-2xl p-5">
              <p className="text-gray-600">
                You don&apos;t have any visit requests yet.
              </p>

              <Link
                href="/"
                className="inline-block mt-4 text-blue-600 font-semibold"
              >
                Find a property →
              </Link>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {visitEnquiries.map((enquiry) => {
                const property = propertyMap.get(enquiry.property_id);

                return (
                  <div
                    key={enquiry.id}
                    className="bg-white border rounded-2xl p-5 shadow-sm"
                  >
                    <h3 className="font-bold text-gray-900">
                      {property?.title ||
                        `Property ${enquiry.property_id}`}
                    </h3>

                    {property?.address && (
                      <p className="text-sm text-gray-500 mt-1">
                        {property.address}
                      </p>
                    )}

                    <div className="mt-4 bg-blue-50 rounded-xl p-4">
                      <p className="text-sm text-gray-600">
                        Requested visit
                      </p>

                      <p className="font-semibold text-gray-900 mt-1">
                        {formatVisitDate(enquiry.visit_date)} ·{" "}
                        {formatVisitTime(enquiry.visit_time)}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">
                        {getVisitStatusLabel(enquiry.visit_status)}
                      </span>

                      <span className="text-xs text-gray-500">
                        {enquiry.enquiry_id}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900">
            My Enquiries
          </h2>

          {otherEnquiries.length === 0 ? (
            <div className="mt-3 bg-white border rounded-2xl p-5">
              <p className="text-gray-600">
                No other enquiries yet.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {otherEnquiries.map((enquiry) => {
                const property = propertyMap.get(enquiry.property_id);

                const actionLabel =
                  enquiry.contact_method === "whatsapp"
                    ? "💬 WhatsApp"
                    : enquiry.contact_method === "call"
                    ? "📞 Call"
                    : "🗺️ Maps";

                return (
                  <div
                    key={enquiry.id}
                    className="bg-white border rounded-2xl p-5 shadow-sm"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {property?.title ||
                        `Property ${enquiry.property_id}`}
                    </h3>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {actionLabel}
                      </span>

                      <span className="text-sm font-semibold text-gray-700">
                        {enquiry.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-3">
                      Enquiry ID: {enquiry.enquiry_id}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
