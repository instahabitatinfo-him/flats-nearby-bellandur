import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

function formatDate(date: string | null) {
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

function formatTime(time: string | null) {
  if (!time) return "Not selected";

  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);

  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function VisitResponsePage({
  params,
}: PageProps) {
  const { token } = await params;

  const { data: enquiry, error } = await supabaseServer
    .from("enquiries")
    .select(
      "enquiry_id, property_id, visit_date, visit_time, visit_status, owner_action_expires_at"
    )
    .eq("owner_action_token", token)
    .eq("contact_method", "visit")
    .maybeSingle();

  if (error || !enquiry) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-md bg-white rounded-2xl border p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Visit Request Not Found
          </h1>

          <p className="mt-3 text-gray-600">
            This visit request link is invalid or no longer available.
          </p>
        </div>
      </main>
    );
  }

  if (
    !enquiry.owner_action_expires_at ||
    new Date(enquiry.owner_action_expires_at).getTime() <
      Date.now()
  ) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-md bg-white rounded-2xl border p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Link Expired
          </h1>

          <p className="mt-3 text-gray-600">
            This visit response link has expired.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-md bg-white rounded-2xl border p-6 shadow-sm">
        <p className="text-sm font-semibold text-blue-600">
          HomeEase
        </p>

        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Visit Request
        </h1>

        <div className="mt-5 bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-500">
            Property
          </p>

          <p className="font-semibold text-gray-900 mt-1">
            Property {enquiry.property_id}
          </p>

          <p className="text-sm text-gray-500 mt-4">
            Requested visit
          </p>

          <p className="font-semibold text-gray-900 mt-1">
            {formatDate(enquiry.visit_date)} ·{" "}
            {formatTime(enquiry.visit_time)}
          </p>

          <p className="text-xs text-gray-500 mt-4">
            Enquiry ID: {enquiry.enquiry_id}
          </p>
        </div>

        <div className="grid gap-3 mt-6">
          <Link
            href={`/api/visit-response?token=${encodeURIComponent(
              token
            )}&action=confirm`}
            className="w-full bg-green-600 text-white text-center py-3.5 rounded-xl font-semibold"
          >
            ✅ Confirm Visit
          </Link>

          <Link
            href={`/visit-response/${encodeURIComponent(
              token
            )}/change`}
            className="w-full bg-blue-600 text-white text-center py-3.5 rounded-xl font-semibold"
          >
            🔄 Change Time
          </Link>

          <Link
            href={`/api/visit-response?token=${encodeURIComponent(
              token
            )}&action=decline`}
            className="w-full bg-red-600 text-white text-center py-3.5 rounded-xl font-semibold"
          >
            ❌ Decline
          </Link>
        </div>

        <p className="text-xs text-gray-500 text-center mt-5">
          No HomeEase login is required.
        </p>
      </div>
    </main>
  );
}
