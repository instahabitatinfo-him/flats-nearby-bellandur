import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function ChangeVisitPage({
  params,
}: PageProps) {
  const { token } = await params;

  const { data: enquiry } = await supabaseServer
    .from("enquiries")
    .select(
      "enquiry_id, property_id, visit_date, visit_time, owner_action_expires_at"
    )
    .eq("owner_action_token", token)
    .eq("contact_method", "visit")
    .maybeSingle();

  if (!enquiry) {
    return <VisitResponseMessage title="Visit Request Not Found" message="This visit request link is invalid or no longer available." />;
  }

  if (
    !enquiry.owner_action_expires_at ||
    new Date(enquiry.owner_action_expires_at).getTime() < Date.now()
  ) {
    return <VisitResponseMessage title="Link Expired" message="This visit response link has expired." />;
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-md bg-white rounded-2xl border p-6 shadow-sm">
        <Link
          href={`/visit-response/${encodeURIComponent(token)}`}
          className="text-sm font-semibold text-blue-600"
        >
          ← Back to visit request
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mt-4">
          Suggest a New Visit Time
        </h1>

        <p className="text-sm text-gray-600 mt-2">
          Enquiry {enquiry.enquiry_id} · Property {enquiry.property_id}
        </p>

        <form
          action="/api/visit-response/change"
          method="post"
          className="mt-6 space-y-4"
        >
          <input type="hidden" name="token" value={token} />

          <label className="block text-sm font-medium text-gray-700">
            Proposed date
            <input
              type="date"
              name="proposedVisitDate"
              required
              className="mt-2 w-full border border-gray-300 rounded-xl px-4 py-3"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Proposed time
            <input
              type="time"
              name="proposedVisitTime"
              required
              className="mt-2 w-full border border-gray-300 rounded-xl px-4 py-3"
            />
          </label>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold"
          >
            Send New Time
          </button>
        </form>
      </div>
    </main>
  );
}

function VisitResponseMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-md bg-white rounded-2xl border p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-3 text-gray-600">{message}</p>
      </div>
    </main>
  );
}