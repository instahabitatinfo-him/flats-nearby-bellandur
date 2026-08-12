"use client";

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
  address: string | null;
  latitude: number;
  longitude: number;
  status: string;
};

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProperties() {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError("Unable to load properties.");
      } else {
        setProperties(data || []);
      }

      setLoading(false);
    }

    loadProperties();
  }, []);

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

          <button className="text-sm font-medium text-blue-600">
            List Property
          </button>
        </div>
      </header>

      <section className="max-w-md mx-auto px-5 py-6">

        <div className="bg-blue-50 rounded-2xl p-4 mb-5">
          <p className="text-sm text-gray-500">
            📍 Your location
          </p>

          <h2 className="text-lg font-semibold text-gray-900 mt-1">
            Bellandur
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Showing properties nearby
          </p>
        </div>

        <div className="bg-white rounded-xl border px-4 py-3 mb-4">
          <input
            type="text"
            placeholder="Search flats, areas..."
            className="w-full outline-none text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3">
          <button className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm">
            All
          </button>

          <button className="bg-white border px-4 py-2 rounded-full text-sm">
            1 BHK
          </button>

          <button className="bg-white border px-4 py-2 rounded-full text-sm">
            2 BHK
          </button>

          <button className="bg-white border px-4 py-2 rounded-full text-sm">
            3 BHK
          </button>

          <button className="bg-white border px-4 py-2 rounded-full text-sm">
            Rent
          </button>
        </div>

        <div className="flex items-center justify-between mt-5 mb-3">
          <h2 className="font-semibold text-gray-900">
            Available Flats
          </h2>

          <span className="text-xs text-gray-500">
            {properties.length} properties
          </span>
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

        {!loading && !error && properties.length === 0 && (
          <div className="bg-white rounded-2xl p-6 text-center">
            <p className="text-gray-600">
              No properties available yet.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {properties.map((property) => (
            <div
              key={property.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border"
            >
              <div className="h-44 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">
                  Property Photo
                </span>
              </div>

              <div className="p-4">

                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {property.title}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {property.address || "Nearby"}
                    </p>
                  </div>

                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                    Available
                  </span>
                </div>

                <div className="flex gap-4 text-sm text-gray-600 mt-3">
                  <span>🛏 {property.bhk} BHK</span>

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
                  <p className="text-lg font-bold text-gray-900">
                    ₹{property.price.toLocaleString("en-IN")}

                    {property.listing_type === "Rent" && (
                      <span className="text-xs font-normal text-gray-500">
                        /month
                      </span>
                    )}
                  </p>

                  <a
                    href={`/property/${property.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    View Details
                  </a>
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

          <button className="bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-medium mt-4">
            List Your Property
          </button>
        </div>

      </section>
    </main>
  );
}