import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PropertyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PropertyPhoto = {
  id: number;
  property_id: number;
  photo_url: string;
  sort_order: number;
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

  const { data: photos, error: photoError } = await supabase
    .from("property_photos")
    .select("id, property_id, photo_url, sort_order")
    .eq("property_id", property.id)
    .order("sort_order", { ascending: true });

  if (photoError) {
    console.error("PROPERTY PHOTO LOAD ERROR:", photoError);
  }

  const propertyPhotos = (photos || []) as PropertyPhoto[];

  const mainPhoto = propertyPhotos[0]?.photo_url || null;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-md mx-auto px-5 py-4">
          <Link href="/" className="text-sm text-blue-600">
            ← Back to properties
          </Link>
        </div>
      </header>

      <section className="max-w-md mx-auto">
        {/* Main Photo */}
        <div className="h-72 bg-gray-200 relative overflow-hidden">
          {mainPhoto ? (
            <img
              src={mainPhoto}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400">
                No property photo
              </span>
            </div>
          )}

          {propertyPhotos.length > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs">
              📷 {propertyPhotos.length} photos
            </div>
          )}
        </div>

        {/* Photo Gallery */}
        {propertyPhotos.length > 1 && (
          <div className="bg-white px-4 py-4 border-b">
            <div className="grid grid-cols-4 gap-2">
              {propertyPhotos.map((photo, index) => (
                <a
                  key={photo.id}
                  href={photo.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="h-20 rounded-lg overflow-hidden bg-gray-200 relative">
                    <img
                      src={photo.photo_url}
                      alt={`${property.title} photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {index === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                        Main
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 py-6">
          {/* Title */}
          <div className="flex justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">
                {property.title}
              </h1>

              <p className="text-sm text-gray-500 mt-2">
                📍 {property.address || "Nearby"}
              </p>
            </div>

            <span className="h-fit text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
              Available
            </span>
          </div>

          {/* Price */}
          <div className="bg-white rounded-2xl border p-4 mt-5">
            <p className="text-sm text-gray-500">
              {property.listing_type}
            </p>

            <p className="text-2xl font-bold text-gray-900 mt-1">
              ₹{Number(property.price).toLocaleString("en-IN")}

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
                <p className="text-gray-500">Property Type</p>
                <p className="font-medium">
                  {property.property_type || "Apartment"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Listing</p>
                <p className="font-medium">
                  {property.listing_type}
                </p>
              </div>

              {property.area_sqft && (
                <div>
                  <p className="text-gray-500">Area</p>
                  <p className="font-medium">
                    {property.area_sqft} sqft
                  </p>
                </div>
              )}

              {property.furnishing && (
                <div>
                  <p className="text-gray-500">Furnishing</p>
                  <p className="font-medium">
                    {property.furnishing}
                  </p>
                </div>
              )}

              {property.floor != null && (
                <div>
                  <p className="text-gray-500">Floor</p>
                  <p className="font-medium">
                    {property.total_floors != null
                      ? `${property.floor} of ${property.total_floors}`
                      : property.floor}
                  </p>
                </div>
              )}

              {property.availability_date && (
                <div>
                  <p className="text-gray-500">Available From</p>
                  <p className="font-medium">
                    {new Date(
                      `${property.availability_date}T00:00:00`
                    ).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}

              {property.deposit && (
                <div>
                  <p className="text-gray-500">Deposit</p>
                  <p className="font-medium">
                    ₹{Number(property.deposit).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div className="bg-white rounded-2xl border p-4 mt-4">
              <h2 className="font-semibold text-gray-900">
                Description
              </h2>

              <p className="text-sm text-gray-600 mt-2 leading-6 whitespace-pre-line">
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

            {property.latitude != null &&
              property.longitude != null && (
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
              {property.broker_name || "Property Contact"}
            </p>

            <div className="flex gap-3 mt-4">
              {property.broker_phone && (
                <a
                  href={`tel:${property.broker_phone}`}
                  className="flex-1 bg-blue-600 text-white text-center py-3 rounded-xl font-medium"
                >
                  📞 Call
                </a>
              )}

              {property.broker_whatsapp && (
                <a
                  href={`https://wa.me/${String(
                    property.broker_whatsapp
                  ).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-green-600 text-white text-center py-3 rounded-xl font-medium"
                >
                  💬 WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Bottom spacing */}
          <div className="h-8" />
        </div>
      </section>
    </main>
  );
}