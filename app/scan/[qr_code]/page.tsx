import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ScanPageProps = {
  params: Promise<{
    qr_code: string;
  }>;
};

export default async function ScanPage({
  params,
}: ScanPageProps) {
  const { qr_code } = await params;

  const { data: location, error } = await supabase
    .from("locations")
    .select("*")
    .eq("qr_code", qr_code)
    .single();

  if (error || !location) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-md mx-auto bg-white rounded-2xl p-6">
          <h1 className="text-xl font-bold">
            Location not found
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

  const { data: properties, error: propertiesError } =
    await supabase
      .from("properties")
      .select("*")
      .eq("location_id", location.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50">

      <header className="bg-white border-b">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            Flats Near You
          </h1>

          <p className="text-xs text-gray-500 mt-1">
            Properties near {location.name}
          </p>
        </div>
      </header>

      <section className="max-w-md mx-auto px-5 py-6">

        <div className="bg-blue-50 rounded-2xl p-5 mb-5">

          <p className="text-sm text-gray-500">
            📍 Location
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-1">
            {location.name}
          </h2>

          <p className="text-sm text-gray-600 mt-2">
            {location.address}
          </p>

          <p className="text-xs text-gray-500 mt-2">
            Showing available flats in this location
          </p>

        </div>

        <div className="flex items-center justify-between mb-4">

          <h2 className="font-semibold text-gray-900">
            Available Flats
          </h2>

          <span className="text-xs text-gray-500">
            {properties?.length || 0} properties
          </span>

        </div>

        {propertiesError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <p className="text-sm text-red-600">
              Unable to load properties.
            </p>
          </div>
        )}

        {!properties || properties.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center">
            <p className="text-gray-500">
              No available properties here yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-2xl overflow-hidden border shadow-sm"
              >

                <div className="h-44 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">
                    Property Photo
                  </span>
                </div>

                <div className="p-4">

                  <h3 className="font-semibold text-gray-900">
                    {property.title}
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    {property.address}
                  </p>

                  <div className="flex gap-4 text-sm text-gray-600 mt-3">

                    <span>
                      🛏 {property.bhk} BHK
                    </span>

                    {property.area_sqft && (
                      <span>
                        📐 {property.area_sqft} sqft
                      </span>
                    )}

                    {property.furnishing && (
                      <span>
                        {property.furnishing}
                      </span>
                    )}

                  </div>

                  <div className="flex justify-between items-center mt-4">

                    <p className="font-bold text-lg">
                      ₹{property.price.toLocaleString("en-IN")}
                    </p>

                    <Link
                      href={`/property/${property.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
                    >
                      View Details
                    </Link>

                  </div>

                </div>

              </div>
            ))}

          </div>
        )}

      </section>

    </main>
  );
}