import Link from "next/link";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";
import PhotoGallery from "./PhotoGallery";
import ContactActions from "./ContactActions";
import ProtectedMapButton from "./ProtectedMapButton";

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

type PropertyVideo = {
  id: number;
  property_id: number;
  video_url: string;
};

export default async function PropertyPage({
  params,
}: PropertyPageProps) {
  const { id } = await params;

  const requestHeaders = await headers();

  const protocol =
    requestHeaders.get("x-forwarded-proto") || "http";

  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";

  const listingUrl = `${protocol}://${host}/property/${id}`;

  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (error || !property) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl p-5 md:p-6">
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

  const { data: videoData, error: videoError } = await supabase
    .from("property_videos")
    .select("id, property_id, video_url")
    .eq("property_id", property.id)
    .maybeSingle();

  if (videoError) {
    console.error("PROPERTY VIDEO LOAD ERROR:", videoError);
  }

  const propertyVideo = videoData as PropertyVideo | null;

  const mainPhoto = propertyPhotos[0]?.photo_url || null;

  const googleMapsUrl =
    property.latitude != null && property.longitude != null
      ? `https://www.google.com/maps?q=${property.latitude},${property.longitude}`
      : null;

  const whatsappUrl = property.broker_whatsapp
    ? `https://wa.me/${String(property.broker_whatsapp).replace(
        /\D/g,
        ""
      )}?text=${encodeURIComponent(
        `Hey ${
          property.broker_name || "Property Contact"
        }, I want to visit the ${
          property.title
        } flat. Can you arrange the visit for me today?\n\nListing: ${listingUrl}`
      )}`
    : null;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="w-full max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-4">
          <Link
            href="/"
            className="text-sm text-blue-600 font-medium"
          >
            ← Back to properties
          </Link>
        </div>
      </header>

      <section className="w-full max-w-7xl mx-auto px-5 md:px-8 lg:px-10">
        {/* PHOTO */}
        <div className="h-72 md:h-80 bg-gray-200 relative overflow-hidden">
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

        {/* PHOTO GALLERY */}
        {propertyPhotos.length > 1 && (
          <PhotoGallery
            photos={propertyPhotos}
            title={property.title}
          />
        )}

        {/* PROPERTY VIDEO */}
        {propertyVideo?.video_url && (
          <div className="px-5 pt-5">
            <div className="bg-white rounded-2xl border p-4">
              <h2 className="font-semibold text-gray-900 mb-3">
                Property Video
              </h2>

              <video
                src={propertyVideo.video_url}
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-xl bg-black"
              >
                Your browser does not support video playback.
              </video>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="px-5 py-6">
          {/* TITLE */}
          <div className="flex justify-between gap-4 items-start">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">
                {property.title}
              </h1>

              <p className="text-sm text-gray-800 mt-2 font-medium">
                📍 {property.address || "Nearby"}
              </p>
            </div>

            <span className="h-fit text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap font-semibold">
              Available
            </span>
          </div>

          {/* PRICE */}
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

{property.listing_type === "Rent" &&
  Number(property.maintenance || 0) > 0 && (
    <p className="text-sm font-medium text-gray-600 mt-1">
      *including Maintenance (₹
      {Number(property.maintenance).toLocaleString("en-IN")})
    </p>
  )}
          </div>

          {/* PROPERTY DETAILS */}
          <div className="bg-white rounded-2xl border p-4 mt-4">
            <h2 className="font-semibold text-gray-900">
              Property Details
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 text-sm">
              <div>
                <p className="text-gray-700 font-medium">
                  Bedrooms
                </p>
                <p className="font-semibold text-gray-900">
                  {property.bhk} BHK
                </p>
              </div>

              <div>
                <p className="text-gray-700 font-medium">
                  Property Type
                </p>
                <p className="font-semibold text-gray-900">
                  {property.property_type || "Apartment"}
                </p>
              </div>

              <div>
                <p className="text-gray-700 font-medium">
                  Listing
                </p>
                <p className="font-semibold text-gray-900">
                  {property.listing_type}
                </p>
              </div>

              {property.area_sqft && (
                <div>
                  <p className="text-gray-700 font-medium">
                    Area
                  </p>
                  <p className="font-semibold text-gray-900">
                    {property.area_sqft} sqft
                  </p>
                </div>
              )}

              {property.furnishing && (
                <div>
                  <p className="text-gray-700 font-medium">
                    Furnishing
                  </p>
                  <p className="font-semibold text-gray-900">
                    {property.furnishing}
                  </p>
                </div>
              )}

              {property.floor != null && (
                <div>
                  <p className="text-gray-700 font-medium">
                    Floor
                  </p>
                  <p className="font-semibold text-gray-900">
                    {property.total_floors != null
                      ? `${property.floor} of ${property.total_floors}`
                      : property.floor}
                  </p>
                </div>
              )}

              {property.availability_date && (
                <div>
                  <p className="text-gray-700 font-medium">
                    Available From
                  </p>
                  <p className="font-semibold text-gray-900">
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
                  <p className="text-gray-700 font-medium">
                    Deposit
                  </p>
                  <p className="text-gray-900 font-semibold">
                    ₹{Number(property.deposit).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* DESCRIPTION */}
          {property.description && (
            <div className="bg-white rounded-2xl border p-4 mt-4">
              <h2 className="font-semibold text-gray-900">
                Description
              </h2>

              <p className="text-sm text-gray-900 mt-2 leading-6 whitespace-pre-line">
                {property.description}
              </p>
            </div>
          )}

          {/* LOCATION */}
          <div className="bg-white rounded-2xl border p-4 mt-4">
            <h2 className="font-semibold text-gray-900">
              Location
            </h2>

            <p className="text-sm text-gray-900 mt-2">
              📍 {property.address || "Location available on request"}
            </p>

            {property.latitude != null &&
              property.longitude != null && (
                <>
                  <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                    <iframe
                      title="Property location map"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                        property.longitude - 0.005
                      }%2C${
                        property.latitude - 0.005
                      }%2C${
                        property.longitude + 0.005
                      }%2C${
                        property.latitude + 0.005
                      }&layer=mapnik&marker=${
                        property.latitude
                      }%2C${property.longitude}`}
                      className="h-56 w-full border-0"
                      loading="lazy"
                    />
                  </div>

                  <ProtectedMapButton
                    googleMapsUrl={googleMapsUrl || ""}
                  />
                </>
              )}
          </div>

          {/* BROKER */}
          <div className="bg-white rounded-2xl border p-4 mt-4">
            <h2 className="font-semibold text-gray-900">
              Contact Broker
            </h2>

            <p className="text-sm text-gray-900 mt-2">
              {property.broker_name || "Property Contact"}
            </p>
          </div>

          {/* SPACE FOR FIXED CONTACT BAR */}
          <div className="h-24" />
        </div>
      </section>

        {/* PROTECTED CONTACT ACTIONS */}
        <ContactActions
          propertyId={Number(property.id)}
          phone={property.broker_phone || null}
          whatsappUrl={whatsappUrl}
          brokerWhatsapp={property.broker_whatsapp || null}
          googleMapsUrl={googleMapsUrl}
        />
    </main>
  );
}
