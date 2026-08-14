"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Property = {
  id: number;
  title: string;
  description: string | null;
  property_type: string;
  listing_type: string;
  bhk: number;
  price: number;
  deposit: number | null;
  area_sqft: number | null;
  furnishing: string | null;
  brokerage_amount: number | null;
  brokerage_negotiable: boolean;
  maintenance: number | null;
  ad_type: "Owner" | "Broker";
  address: string | null;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
};

type PropertyPhoto = {
  id: number;
  property_id: number;
  photo_url: string | null;
  sort_order: number;
};

type PropertyVideo = {
  id: number;
  property_id: number;
  video_url: string;
};

type PropertyWithPhoto = Property & {
  photoUrl: string | null;
  photoCount: number;
  videoCount: number;
};

const PHOTO_BUCKET = "property-photos";

function getDistanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadiusKm = 6371;

  const dLat = ((latitude2 - latitude1) * Math.PI) / 180;
  const dLon = ((longitude2 - longitude1) * Math.PI) / 180;

  const lat1 = (latitude1 * Math.PI) / 180;
  const lat2 = (latitude2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 *
      Math.cos(lat1) *
      Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function getPostedText(createdAt: string) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();

  const days = Math.floor(
    (now - created) / (1000 * 60 * 60 * 24)
  );

  if (days <= 0) return "Posted today";
  if (days == 1) return "Posted 1 day ago";
  if (days < 7) return `Posted ${days} days ago`;

  const weeks = Math.floor(days / 7);

  if (weeks == 1) return "Posted 1 week ago";
  return `Posted ${weeks} weeks ago`;
}

export default function Home() {
  const [properties, setProperties] = useState<PropertyWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [bhkFilter, setBhkFilter] = useState<number | null>(null);
  const [listingFilter, setListingFilter] = useState<
  "Rent" | "Sale" | null
>(null);

  const [postedByFilter, setPostedByFilter] = useState<
    "Owner" | "Broker" | null
  >(null);

  const [sortBy, setSortBy] = useState<
    "newest" | "nearest" | "price_low" | "price_high"
  >("nearest");

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (locationError) => {
        console.warn("LOCATION ERROR:", locationError.message);
        setLocationError(true);
      }
    );
  }, []);

  useEffect(() => {
    async function loadProperties() {
      try {
        setLoading(true);
        setError("");

        const { data: propertyData, error: propertyError } =
          await supabase
            .from("properties")
            .select("*")
            .eq("status", "approved")
            .gte(
              "created_at",
              new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000
              ).toISOString()
            )
            .order("created_at", { ascending: false });

        if (propertyError) {
          console.error("PROPERTY LOAD ERROR:", propertyError);
          setError("Unable to load properties.");
          return;
        }

        if (!propertyData || propertyData.length === 0) {
          setProperties([]);
          return;
        }

        const propertyIds = propertyData.map(
          (property) => property.id
        );

        const { data: photoData, error: photoError } =
          await supabase
            .from("property_photos")
            .select("*")
            .in("property_id", propertyIds)
            .order("sort_order", { ascending: true });

        if (photoError) {
          console.error("PHOTO LOAD ERROR:", photoError);

          setProperties(
            propertyData.map((property) => ({
              ...property,
              photoUrl: null,
              photoCount: 0,
              videoCount: 0,
            }))
          );

          return;
        }

        const photos = (photoData || []) as PropertyPhoto[];

        const { data: videoData, error: videoError } =
          await supabase
            .from("property_videos")
            .select("id, property_id, video_url")
            .in("property_id", propertyIds);

        if (videoError) {
          console.error("VIDEO LOAD ERROR:", videoError);
        }

        const videos = (videoData || []) as PropertyVideo[];

        const propertiesWithPhotos = propertyData.map(
          (property) => {
            const propertyPhotos = photos.filter(
              (photo) => photo.property_id === property.id
            );

            const propertyVideos = videos.filter(
              (video) => video.property_id === property.id
            );

            const firstPhoto = propertyPhotos[0];

            return {
              ...property,
              photoUrl: firstPhoto?.photo_url || null,
              photoCount: propertyPhotos.length,
              videoCount: propertyVideos.length,
            };
          }
        );

        setProperties(propertiesWithPhotos);
      } catch (caughtError) {
        console.error("HOME PAGE LOAD ERROR:", caughtError);
        setError("Unable to load properties.");
      } finally {
        setLoading(false);
      }
    }

    loadProperties();
  }, []);

  const filteredProperties = properties.filter((property) => {
    const searchText = search.trim().toLowerCase();

    if (searchText) {
      const matchesSearch =
        property.title.toLowerCase().includes(searchText) ||
        (property.address || "").toLowerCase().includes(searchText);

      if (!matchesSearch) {
        return false;
      }
    }

    if (bhkFilter !== null && Number(property.bhk) !== bhkFilter) {
      return false;
    }

    if (
      listingFilter !== null &&
      property.listing_type !== listingFilter
    ) {
      return false;
    }

    if (
      postedByFilter !== null &&
      property.ad_type !== postedByFilter
    ) {
      return false;
    }

    return true;
  });

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (sortBy === "nearest" && userLocation) {
      const distanceA = getDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        a.latitude,
        a.longitude
      );

      const distanceB = getDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        b.latitude,
        b.longitude
      );

      return distanceA - distanceB;
    }

    if (sortBy === "price_low") {
      return Number(a.price) - Number(b.price);
    }

    if (sortBy === "price_high") {
      return Number(b.price) - Number(a.price);
    }

    return 0;
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Flats Near You
            </h1>

            <p className="text-xs text-gray-500">
              Find available properties nearby
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Link
              href="/admin"
              aria-label="Admin Login"
              title="Admin Login"
              className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl text-2xl hover:bg-gray-100 active:bg-gray-200 transition"
            >
              🕵🏻‍♂️
            </Link>

            <Link
              href="/list-property"
              className="text-sm font-medium text-blue-600"
            >
              List Property
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-md mx-auto px-5 py-6">
        <div className="bg-blue-50 rounded-2xl p-4 mb-5">
          <p className="text-sm text-gray-500">
            📍 Your location
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-1">
            {userLocation
              ? "Location detected"
              : locationError
              ? "Location unavailable"
              : "Detecting location..."}
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            {userLocation
              ? "Properties are shown near you"
              : locationError
              ? "Enable location access to see distances"
              : "Finding properties near your location"}
          </p>
        </div>

        <div className="bg-white rounded-xl border px-4 py-3 mb-4">
          <input
            type="text"
            placeholder="Search flats, areas..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full outline-none text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3">
          <button className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm">
            All
          </button>

          <button
            onClick={() => setBhkFilter(1)}
            className={
              bhkFilter === 1
                ? "bg-gray-900 text-white px-4 py-2 rounded-full text-sm"
                : "bg-white border px-4 py-2 rounded-full text-sm"
            }
          >
            1 BHK
          </button>

          <button
            onClick={() => setBhkFilter(2)}
            className={
              bhkFilter === 2
                ? "bg-gray-900 text-white px-4 py-2 rounded-full text-sm"
                : "bg-white border px-4 py-2 rounded-full text-sm"
            }
          >
            2 BHK
          </button>

          <button
            onClick={() => setBhkFilter(3)}
            className={
              bhkFilter === 3
                ? "bg-gray-900 text-white px-4 py-2 rounded-full text-sm"
                : "bg-white border px-4 py-2 rounded-full text-sm"
            }
          >
            3 BHK
          </button>

          <button
            onClick={() =>
              setListingFilter(
                listingFilter === "Rent" ? null : "Rent"
              )
            }
            className={
              listingFilter === "Rent"
                ? "bg-gray-900 text-white px-4 py-2 rounded-full text-sm"
                : "bg-white border px-4 py-2 rounded-full text-sm"
            }
          >
            Rent
          </button>

          <button
            onClick={() =>
              setListingFilter(
                listingFilter === "Sale" ? null : "Sale"
              )
            }
            className={
              listingFilter === "Sale"
                ? "bg-gray-900 text-white px-4 py-2 rounded-full text-sm"
                : "bg-white border px-4 py-2 rounded-full text-sm"
            }
          >
            Sale
          </button>
        </div>

        <div className="flex items-center justify-between mt-5 mb-3 gap-3">
          <h2 className="font-semibold text-gray-900">
            Available Flats
          </h2>

          <div className="flex items-center gap-2">
            <select
              value={postedByFilter ?? ""}
              onChange={(event) => {
                const value = event.target.value;

                setPostedByFilter(
                  value === "Owner" || value === "Broker"
                    ? value
                    : null
                );
              }}
              className="text-xs bg-white border rounded-lg px-2 py-2 text-gray-700"
            >
              <option value="">Posted by: All</option>
              <option value="Owner">Posted by: Owner</option>
              <option value="Broker">Posted by: Broker</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value as
                    | "newest"
                    | "nearest"
                    | "price_low"
                    | "price_high"
                )
              }
              className="text-xs bg-white border rounded-lg px-2 py-2 text-gray-700"
            >
              <option value="nearest">Nearest first</option>
              <option value="newest">Newest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-3">
          {filteredProperties.length} properties
        </div>

        {loading && (
          <div className="bg-white rounded-2xl p-6 text-center">
            <p className="text-gray-500">
              Loading properties...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-600">
              {error}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          properties.length === 0 && (
            <div className="bg-white rounded-2xl p-6 text-center">
              <p className="text-gray-600">
                No properties available yet.
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Approved properties will appear here.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          properties.length > 0 &&
          filteredProperties.length === 0 && (
            <div className="bg-white rounded-2xl p-6 text-center border">
              <p className="text-gray-700 font-medium">
                No matching properties found
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Try changing your search or filters.
              </p>
            </div>
          )}

        <div className="space-y-4">
          {sortedProperties.map((property) => (
            <div
              key={property.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border"
            >
              <Link href={`/property/${property.id}`}>
                <div className="h-52 bg-gray-200 relative overflow-hidden">
                  {property.photoUrl ? (
                    <img
                      src={property.photoUrl}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400">
                        No Photo
                      </span>
                    </div>
                  )}

                  {(property.photoCount > 0 ||
                    property.videoCount > 0) && (
                    <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2.5 py-1 rounded-full text-xs flex items-center gap-2">
                      {property.photoCount > 0 && (
                        <span>
                          📷 {property.photoCount}
                        </span>
                      )}

                      {property.videoCount > 0 && (
                        <span>
                          🎥 {property.videoCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {property.title}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {property.address || "Nearby"}
                    </p>

                    {userLocation &&
                      property.latitude != null &&
                      property.longitude != null && (
                        <p className="text-xs text-blue-600 mt-1">
                          📍{" "}
                          {getDistanceKm(
                            userLocation.latitude,
                            userLocation.longitude,
                            property.latitude,
                            property.longitude
                          ).toFixed(1)}{" "}
                          km away
                        </p>
                      )}

                    <p className="text-xs text-gray-400 mt-1">
                      {getPostedText(property.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={
                        property.listing_type === "Sale"
                          ? "text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full whitespace-nowrap"
                          : "text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap"
                      }
                    >
                      {property.listing_type === "Sale"
                        ? "For Sale"
                        : "For Rent"}
                    </span>

                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                      Available
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-3">
                  <span>🛏 {property.bhk} BHK</span>

                  {property.area_sqft && (
                    <span>
                      📐 {property.area_sqft} sqft
                    </span>
                  )}

                  {property.furnishing && (
                    <span>{property.furnishing}</span>
                  )}
                </div>

                <div className="flex justify-between items-start mt-4 gap-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      ₹
                      {(
                        Number(property.price) +
                        (property.listing_type === "Rent"
                          ? Number(property.maintenance || 0)
                          : 0)
                      ).toLocaleString("en-IN")}

                      {property.listing_type === "Rent" && (
                        <span className="text-xs font-normal text-gray-500">
                          /month
                        </span>
                      )}
                    </p>

                    {property.listing_type === "Rent" &&
                      Number(property.maintenance || 0) > 0 && (
                        <p className="text-xs font-medium text-gray-600 -mt-1">
                          *including Maintenance
                        </p>
                      )}

                    {property.ad_type === "Broker" &&
                      property.brokerage_amount != null &&
                      Number(property.brokerage_amount) > 0 && (
                        <p className="text-xs font-bold text-gray-700 mt-1">
                          Brokerage : ₹
                          {Number(
                            property.brokerage_amount
                          ).toLocaleString("en-IN")}{" "}
                          (
                          {property.brokerage_negotiable
                            ? "Negotiable"
                            : "Non-negotiable"}
                          )
                        </p>
                      )}
                  </div>

                  <div className="flex gap-2">
                    {property.latitude != null &&
                      property.longitude != null && (
                        <a
                          href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium"
                        >
                          📍 Map
                        </a>
                      )}

                    <Link
                      href={`/property/${property.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 text-white rounded-2xl p-5 mt-6 mb-8">
          <h2 className="font-semibold text-lg">
            Have a flat available?
          </h2>

          <p className="text-sm text-gray-300 mt-1">
            List your property and reach people searching nearby.
          </p>

          <Link
            href="/list-property"
            className="inline-block bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-medium mt-4"
          >
            List Your Property
          </Link>
        </div>
      </section>
    </main>
  );
}
