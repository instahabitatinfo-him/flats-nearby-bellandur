import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PropertyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PropertyPage({
  params,
}: PropertyPageProps) {
  const { id } = await params;

  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (error || !property) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-md mx-auto bg-white rounded-2xl p-6">
          <h1 className="text-xl font-bold text-gray-900">
            Property not found
          </h1>

          <Link
            href="/"
            className="text-blue-600 text-sm mt-4 inline-block"
          >
            ← Back to properties
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-md mx-auto px-5 py-4">
          <Link
            href="/"
            className="text-sm text-blue-600"
          >
            ← Back to properties
          </Link>
        </div>
      </header>

      <section className="max-w-md mx-auto">

        {/* Property Photo */}
        <div className="h-64 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-400">
            Property Photos
          </span>
        </div>

        <div className="px-5 py-6">

          {/* Title */}
          <div className="flex justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {property.title}
              </h1>

              <p className="text-sm text-gray-500 mt-2">
                📍 {property.address || "Nearby"}
              </p>
            </div>

            <span className="h-fit text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Available
            </span>
          </div>

          {/* Price */}
          <div className="bg-white rounded-2xl border p-4 mt-5">
            <p className="text-sm text-gray-500">
              {property.listing_type}
            </p>

            <p className="text-2xl font-bold text-gray-900 mt-1">
              ₹{property.price.toLocaleString("en-IN")}

              {property.listing_type === "Rent" && (
                <span className="text-sm font-normal text-gray-500">
                  /month
                </span>
              )}
            </p>
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-2xl border p-4 mt-4">

            <h2 className="font-semibold text-gray-900">
              Property Details
            </h2>

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">

              <div>
                <p className="text-gray-500">Bedrooms</p>
                <p className="font-medium">
                  {property.bhk} BHK
                </p>
              </div>

              <div>
                <p className="text-gray-500">Area</p>
                <p className="font-medium">
                  {property.area_sqft
                    ? `${property.area_sqft} sqft`
                    : "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Furnishing</p>
                <p className="font-medium">
                  {property.furnishing || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Deposit</p>
                <p className="font-medium">
                  {property.deposit
                    ? `₹${property.deposit.toLocaleString("en-IN")}`
                    : "Not specified"}
                </p>
              </div>

            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div className="bg-white rounded-2xl border p-4 mt-4">

              <h2 className="font-semibold text-gray-900">
                Description
              </h2>

              <p className="text-sm text-gray-600 mt-2 leading-6">
                {property.description}
              </p>

            </div>
          )}

          {/* Location */}
          <div className="bg-white rounded-2xl border p-4 mt-4">

            <h2 className="font-semibold text-gray-900">
              Location
            </h2>

            <p className="text-sm text-gray-600 mt-2">
              📍 {property.address || "Location available on request"}
            </p>

            {property.latitude && property.longitude && (
              <a
                href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-gray-100 rounded-xl py-3 mt-4 text-sm font-medium"
              >
                Open in Google Maps
              </a>
            )}

          </div>

          {/* Broker */}
          <div className="bg-white rounded-2xl border p-4 mt-4">

            <h2 className="font-semibold text-gray-900">
              Contact Broker
            </h2>

            <p className="text-sm text-gray-600 mt-2">
              {property.broker_name || "Broker"}
            </p>

            <div className="flex gap-3 mt-4">

              {property.broker_phone && (
                <a
                  href={`tel:${property.broker_phone}`}
                  className="flex-1 bg-blue-600 text-white text-center py-3 rounded-xl font-medium"
                >
                  📞 Call Broker
                </a>
              )}

              {property.broker_whatsapp && (
                <a
                  href={`https://wa.me/${property.broker_whatsapp.replace(
                    /\D/g,
                    ""
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-green-600 text-white text-center py-3 rounded-xl font-medium"
                >
                  💬 WhatsApp
                </a>
              )}

            </div>

          </div>

        </div>
      </section>
    </main>
  );
}