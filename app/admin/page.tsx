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
  floor: number | null;
  total_floors: number | null;
  availability_date: string | null;
  brokerage_amount: number | null;
  brokerage_negotiable: boolean;
  address: string | null;
  broker_name: string | null;
  broker_phone: string | null;
  broker_whatsapp: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
};

type PropertyPhoto = {
  id: number;
  property_id: number;
  photo_url: string | null;
  sort_order: number;
};

export default function AdminPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [properties, setProperties] = useState<Property[]>([]);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);

  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPendingProperties() {
    setError("");

    const { data, error: propertyError } = await supabase.rpc(
      "get_pending_properties"
    );

    if (propertyError) {
      setError(propertyError.message);
      return;
    }

    const pendingProperties = (data || []) as Property[];

    setProperties(pendingProperties);

    if (pendingProperties.length === 0) {
      setPhotos([]);
      return;
    }

    const ids = pendingProperties.map((property) => property.id);

    const { data: photoData, error: photoError } = await supabase
      .from("property_photos")
      .select("*")
      .in("property_id", ids)
      .order("sort_order", { ascending: true });

    if (photoError) {
      setError(photoError.message);
      return;
    }

    setPhotos(photoData || []);
  }

  async function checkAdmin() {
    setLoading(true);
    setError("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setSessionReady(true);
      setLoading(false);
      return;
    }

    setUserEmail(userData.user.email || "");

    const { data: adminResult, error: adminError } =
      await supabase.rpc("is_admin");

    console.log("ADMIN USER:", userData.user.email);
    console.log("ADMIN USER ID:", userData.user.id);
    console.log("IS ADMIN RESULT:", adminResult);
    console.log("IS ADMIN ERROR:", adminError);

    if (adminError) {
      setError(adminError.message);
      setLoading(false);
      setSessionReady(true);
      return;
    }

    if (!adminResult) {
      setError("This account is not authorized as an administrator.");
      setLoading(false);
      setSessionReady(true);
      return;
    }

    setIsAdmin(true);
    await loadPendingProperties();

    setSessionReady(true);
    setLoading(false);
  }

  useEffect(() => {
    checkAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoginLoading(true);
    setError("");
    setMessage("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoginLoading(false);
      return;
    }

    setPassword("");
    setLoginLoading(false);

    await checkAdmin();
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    setIsAdmin(false);
    setUserEmail("");
    setProperties([]);
    setPhotos([]);
    setMessage("");
    setError("");
  }

  async function approveProperty(id: number) {
    setActionId(id);
    setError("");
    setMessage("");

    const { data, error: approveError } = await supabase.rpc(
      "approve_property",
      {
        p_property_id: id,
      }
    );

    if (approveError) {
      setError(approveError.message);
      setActionId(null);
      return;
    }

    if (!data) {
      setError("Property could not be approved.");
      setActionId(null);
      return;
    }

    setMessage("Property approved successfully.");
    setProperties((current) =>
      current.filter((property) => property.id !== id)
    );

    setActionId(null);
  }

  async function rejectProperty(id: number) {
    setActionId(id);
    setError("");
    setMessage("");

    const { data, error: rejectError } = await supabase.rpc(
      "reject_property",
      {
        p_property_id: id,
      }
    );

    if (rejectError) {
      setError(rejectError.message);
      setActionId(null);
      return;
    }

    if (!data) {
      setError("Property could not be rejected.");
      setActionId(null);
      return;
    }

    setMessage("Property rejected.");
    setProperties((current) =>
      current.filter((property) => property.id !== id)
    );

    setActionId(null);
  }

  if (!sessionReady || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
        <p className="text-gray-500">Loading admin...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-5 py-10">
          <div className="bg-white rounded-2xl border p-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Login
            </h1>

            <p className="text-sm text-gray-500 mt-2 mb-6">
              Sign in to manage submitted properties.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Admin email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="Password"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-black text-white rounded-xl px-4 py-3 font-semibold disabled:opacity-50"
              >
                {loginLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Property Admin
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              {userEmail}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-green-700">{message}</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Pending Properties
            </h2>

            <p className="text-sm text-gray-500">
              {properties.length} waiting for review
            </p>
          </div>

          <button
            onClick={loadPendingProperties}
            className="bg-white border text-gray-700 px-4 py-2 rounded-xl text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        {properties.length === 0 && (
          <div className="bg-white rounded-2xl border p-8 text-center">
            <p className="text-gray-500">
              No pending properties. 🎉
            </p>
          </div>
        )}

        <div className="space-y-5">
          {properties.map((property) => {
            const propertyPhotos = photos.filter(
              (photo) => photo.property_id === property.id
            );

            return (
              <div
                key={property.id}
                className="bg-white rounded-2xl border overflow-hidden"
              >
                {propertyPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-1 bg-gray-100">
                    {propertyPhotos.slice(0, 6).map((photo) =>
                      photo.photo_url ? (
                        <img
                          key={photo.id}
                          src={photo.photo_url}
                          alt={property.title}
                          className="w-full h-32 object-cover"
                        />
                      ) : null
                    )}
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {property.title}
                      </h3>

                      <p className="text-sm text-gray-500 mt-1">
                        {property.bhk} BHK · {property.property_type} ·{" "}
                        {property.listing_type}
                      </p>
                    </div>

                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
                      Pending
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-5 text-sm">
                    <div>
                      <p className="text-gray-500">Price</p>
                      <p className="font-semibold text-gray-900">
                        ₹{Number(property.price).toLocaleString("en-IN")}
                        {property.listing_type === "Rent" && "/month"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Brokerage</p>
                      <p className="font-semibold text-gray-900">
                        {property.brokerage_amount != null
                          ? `₹${Number(
                              property.brokerage_amount
                            ).toLocaleString("en-IN")} (${
                              property.brokerage_negotiable
                                ? "Negotiable"
                                : "Non-negotiable"
                            })`
                          : "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Area</p>
                      <p className="font-semibold text-gray-900">
                        {property.area_sqft
                          ? `${property.area_sqft} sqft`
                          : "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Furnishing</p>
                      <p className="font-semibold text-gray-900">
                        {property.furnishing || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Floor</p>
                      <p className="font-semibold text-gray-900">
                        {property.floor != null
                          ? property.total_floors != null
                            ? `${property.floor} of ${property.total_floors}`
                            : property.floor
                          : "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Available From</p>
                      <p className="font-semibold text-gray-900">
                        {property.availability_date || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t mt-5 pt-5 space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500">Address</p>
                      <p className="font-medium text-gray-900">
                        {property.address || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Broker</p>
                      <p className="font-medium text-gray-900">
                        {property.broker_name || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">
                        {property.broker_phone || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">WhatsApp</p>
                      <p className="font-medium text-gray-900">
                        {property.broker_whatsapp || "Not provided"}
                      </p>
                    </div>

                    {property.description && (
                      <div>
                        <p className="text-gray-500">Description</p>
                        <p className="font-medium text-gray-900 whitespace-pre-wrap">
                          {property.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <button
                      onClick={() => rejectProperty(property.id)}
                      disabled={actionId === property.id}
                      className="border border-red-200 text-red-600 rounded-xl px-4 py-3 font-semibold disabled:opacity-50"
                    >
                      {actionId === property.id
                        ? "Processing..."
                        : "Reject"}
                    </button>

                    <button
                      onClick={() => approveProperty(property.id)}
                      disabled={actionId === property.id}
                      className="bg-green-600 text-white rounded-xl px-4 py-3 font-semibold disabled:opacity-50"
                    >
                      {actionId === property.id
                        ? "Processing..."
                        : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
