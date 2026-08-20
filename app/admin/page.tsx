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

type PropertyVideo = {
  id: number;
  property_id: number;
  video_url: string | null;
};

type AdminSection =
  | "dashboard"
  | "pending"
  | "approved"
  | "enquiries";

type CustomerEnquiry = {
  id: number;
  enquiry_id: string;
  customer_user_id: string;
  property_id: number;
  contact_method: string;
  status: string;
  created_at: string;
  updated_at: string;
  visit_date: string | null;
  visit_time: string | null;
  visit_status: string | null;
  proposed_visit_date: string | null;
  proposed_visit_time: string | null;

  customer_name: string;
  customer_phone: string;
  property_title: string;
  broker_name: string;
  broker_phone: string;
};

export default function AdminPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [properties, setProperties] = useState<Property[]>([]);
const [approvedProperties, setApprovedProperties] = useState<Property[]>([]);
const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
const [approvedPhotos, setApprovedPhotos] = useState<PropertyPhoto[]>([]);

const [videos, setVideos] = useState<PropertyVideo[]>([]);
const [approvedVideos, setApprovedVideos] = useState<PropertyVideo[]>([]);

const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>([]);
const [enquiriesLoading, setEnquiriesLoading] = useState(false);
const [enquirySearch, setEnquirySearch] = useState("");

const [activeSection, setActiveSection] =
  useState<AdminSection>("dashboard");

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
  const { data: videoData, error: videoError } = await supabase
  .from("property_videos")
  .select("id, property_id, video_url")
  .in("property_id", ids);

if (videoError) {
  setError(videoError.message);
  return;
}

setVideos((videoData || []) as PropertyVideo[]);

  }
  async function loadApprovedProperties() {
    const { data, error: propertyError } = await supabase
      .from("properties")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (propertyError) {
      setError(propertyError.message);
      return;
    }

    const approved = (data || []) as Property[];

    setApprovedProperties(approved);

    if (approved.length === 0) {
      setApprovedPhotos([]);
      return;
    }

    const ids = approved.map(
      (property: Property) => property.id
    );

    const { data: photoData, error: photoError } =
      await supabase
        .from("property_photos")
        .select("*")
        .in("property_id", ids)
        .order("sort_order", { ascending: true });

    if (photoError) {
      setError(photoError.message);
      return;
    }

    setApprovedPhotos(photoData || []);
  const { data: videoData, error: videoError } = await supabase
  .from("property_videos")
  .select("id, property_id, video_url")
  .in("property_id", ids);

if (videoError) {
  setError(videoError.message);
  return;
}

setApprovedVideos((videoData || []) as PropertyVideo[]);
  }
  async function loadEnquiries() {
  console.log("LOAD ENQUIRIES STARTED");
  setEnquiriesLoading(true);
  try {
    // 1. Load enquiries
    const {
      data: enquiryData,
      error: enquiryError,
    } = await supabase
      .from("enquiries")
      .select(`
        id,
        enquiry_id,
        customer_user_id,
        property_id,
        contact_method,
        status,
        created_at,
        updated_at,
        visit_date,
        visit_time,
        visit_status,
        proposed_visit_date,
        proposed_visit_time
      `)
      .order("created_at", { ascending: false });

    if (enquiryError) {
      console.error(
        "LOAD ENQUIRIES - ENQUIRIES ERROR:",
        enquiryError
      );
      setError(enquiryError.message);
      return;
    }

    const rawEnquiries = enquiryData || [];

    if (rawEnquiries.length === 0) {
      setEnquiries([]);
      return;
    }

    // 2. Get unique customer IDs
    const customerIds = Array.from(
      new Set(
        rawEnquiries.map(
          (enquiry) => enquiry.customer_user_id
        )
      )
    );

    // 3. Load customer profiles
    const {
      data: customerData,
      error: customerError,
    } = await supabase
      .from("customer_profiles")
      .select("id, full_name, phone")
      .in("id", customerIds);

    if (customerError) {
      console.error(
        "LOAD ENQUIRIES - CUSTOMER PROFILE ERROR:",
        customerError
      );
      setError(customerError.message);
      return;
    }

    // 4. Get unique property IDs
    const propertyIds = Array.from(
      new Set(
        rawEnquiries.map(
          (enquiry) => enquiry.property_id
        )
      )
    );

    // 5. Load properties
    const {
      data: propertyData,
      error: propertyError,
    } = await supabase
      .from("properties")
      .select(
        "id, title, broker_name, broker_phone"
      )
      .in("id", propertyIds);

    if (propertyError) {
      console.error(
        "LOAD ENQUIRIES - PROPERTY ERROR:",
        propertyError
      );
      setError(propertyError.message);
      return;
    }

    // 6. Create lookup maps
    const customerMap = new Map(
      (customerData || []).map((customer) => [
        customer.id,
        customer,
      ])
    );

    const propertyMap = new Map(
      (propertyData || []).map((property) => [
        property.id,
        property,
      ])
    );

    // 7. Combine everything
    const formattedEnquiries: CustomerEnquiry[] =
      rawEnquiries.map((enquiry) => {
        const customer = customerMap.get(
          enquiry.customer_user_id
        );

        const property = propertyMap.get(
          enquiry.property_id
        );

        return {
          id: enquiry.id,
          enquiry_id: enquiry.enquiry_id,
          customer_user_id:
            enquiry.customer_user_id,
          property_id: enquiry.property_id,
          contact_method:
            enquiry.contact_method,
          status: enquiry.status,
          created_at: enquiry.created_at,
          updated_at: enquiry.updated_at,
          visit_date: enquiry.visit_date,
          visit_time: enquiry.visit_time,
          visit_status: enquiry.visit_status,
          proposed_visit_date:
            enquiry.proposed_visit_date,
          proposed_visit_time:
            enquiry.proposed_visit_time,

          customer_name:
            customer?.full_name ||
            "Not provided",

          customer_phone:
            customer?.phone ||
            "Not provided",

          property_title:
            property?.title ||
            `Property ${enquiry.property_id}`,

          broker_name:
            property?.broker_name ||
            "Not provided",

          broker_phone:
            property?.broker_phone ||
            "Not provided",
        };
      });

    setEnquiries(formattedEnquiries);
  } catch (error) {
    console.error(
      "LOAD ENQUIRIES UNEXPECTED ERROR:",
      error
    );

    setError(
      "Unable to load customer enquiries."
    );
  } finally {
    setEnquiriesLoading(false);
  }
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

    await Promise.all([
      loadPendingProperties(),
      loadApprovedProperties(),
    ]);

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

  async function removeProperty(propertyId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this listing? This will also remove its photos."
    );

    if (!confirmed) {
      return;
    }

    setActionId(propertyId);

    try {
      /*
       * Remove the actual uploaded files through the Supabase Storage API.
       * The database RPC intentionally no longer touches storage.objects.
       */
      const propertyPhotos = [
        ...photos.filter((photo) => photo.property_id === propertyId),
        ...approvedPhotos.filter(
          (photo) => photo.property_id === propertyId
        ),
      ];

      const uniquePhotoUrls = Array.from(
        new Set(
          propertyPhotos
            .map((photo) => photo.photo_url)
            .filter((url): url is string => Boolean(url))
        )
      );

      const storagePaths = uniquePhotoUrls
        .map((url) => {
          const marker = "/storage/v1/object/public/property-photos/";
          const index = url.indexOf(marker);

          if (index === -1) {
            return null;
          }

          return decodeURIComponent(url.slice(index + marker.length));
        })
        .filter((path): path is string => Boolean(path));

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("property-photos")
          .remove(storagePaths);

        if (storageError) {
          console.error(
            "REMOVE PROPERTY STORAGE ERROR:",
            storageError
          );
          setError(
            `Unable to remove property photos: ${storageError.message}`
          );
          return;
        }
      }

      const { error } = await supabase.rpc("remove_property", {
        p_property_id: propertyId,
      });

      if (error) {
        console.error("REMOVE PROPERTY ERROR:", error);
        setError(`Unable to remove property: ${error.message}`);
        return;
      }

      setProperties((current) =>
        current.filter((property) => property.id !== propertyId)
      );

      setApprovedProperties((current) =>
        current.filter((property) => property.id !== propertyId)
      );

      setPhotos((current) =>
        current.filter((photo) => photo.property_id !== propertyId)
      );

      setApprovedPhotos((current) =>
        current.filter((photo) => photo.property_id !== propertyId)
      );

      setMessage("Listing permanently removed.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="w-full max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-5 flex items-center justify-between gap-4">
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

      <div className="w-full max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-6">
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

  {activeSection === "dashboard" && (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Admin Dashboard
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Manage HomeEase properties and customer enquiries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          onClick={() => setActiveSection("pending")}
          className="bg-white border rounded-2xl p-6 text-left hover:shadow-md transition"
        >
          <div className="text-3xl mb-4">🏠</div>

          <h3 className="text-lg font-bold text-gray-900">
            Approve New Properties
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            Review newly submitted Owner and Broker properties.
          </p>

          <div className="mt-5 text-sm font-semibold text-blue-600">
            {properties.length} pending
          </div>
        </button>

        <button
          onClick={() => setActiveSection("approved")}
          className="bg-white border rounded-2xl p-6 text-left hover:shadow-md transition"
        >
          <div className="text-3xl mb-4">✅</div>

          <h3 className="text-lg font-bold text-gray-900">
            Approved Properties
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            View and manage all currently live properties.
          </p>

          <div className="mt-5 text-sm font-semibold text-green-600">
            {approvedProperties.length} live
          </div>
        </button>

        <button
          onClick={() => setActiveSection("enquiries")}
          className="bg-white border rounded-2xl p-6 text-left hover:shadow-md transition"
        >
          <div className="text-3xl mb-4">📋</div>

          <h3 className="text-lg font-bold text-gray-900">
            Customer Enquiries
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            View customer contacts, enquiries and visit activity.
          </p>

          <div className="mt-5 text-sm font-semibold text-gray-500">
            Coming next
          </div>
        </button>
      </div>
    </div>
  )}

  {activeSection === "pending" && (
    <>
      <button
        onClick={() => setActiveSection("dashboard")}
        className="mb-5 bg-white border text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold"
      >
        ← Admin Dashboard
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Approve New Properties
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

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-5 text-sm">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
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
    </>
  )}

  {activeSection === "approved" && (
    <>
      <button
        onClick={() => setActiveSection("dashboard")}
        className="mb-5 bg-white border text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold"
      >
        ← Admin Dashboard
      </button>

      <div className="mt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Approved Properties
            </h2>

            <p className="text-sm text-gray-500">
              {approvedProperties.length} properties currently visible on the homepage
            </p>
          </div>

          <button
            onClick={loadApprovedProperties}
            className="bg-white border text-gray-700 px-4 py-2 rounded-xl text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        {approvedProperties.length === 0 && (
          <div className="bg-white rounded-2xl border p-8 text-center">
            <p className="text-gray-500">
              No approved properties.
            </p>
          </div>
        )}

        <div className="space-y-5">
          {approvedProperties.map((property) => {
  const propertyPhotos = approvedPhotos.filter(
    (photo) => photo.property_id === property.id
  );

  const propertyVideos = approvedVideos.filter(
    (video) => video.property_id === property.id
  );

  return (
    <div
  key={property.id}
  className="bg-white rounded-2xl border overflow-hidden"
>
  {(propertyPhotos.length > 0 || propertyVideos.length > 0) && (
    <div className="bg-gray-100 p-2 space-y-2">
      {propertyPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-1">
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

      {propertyVideos.map((video) =>
        video.video_url ? (
          <video
            key={video.id}
            src={video.video_url}
            controls
            playsInline
            className="w-full max-h-80 object-contain bg-black rounded-xl"
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

                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                      Live
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-5 text-sm">
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
                  </div>

                  <button
                    onClick={() => removeProperty(property.id)}
                    disabled={actionId === property.id}
                    className="w-full mt-6 border border-red-300 text-red-700 rounded-xl px-4 py-3 font-semibold hover:bg-red-50 disabled:opacity-50"
                  >
                    {actionId === property.id
                      ? "Permanently Removing..."
                      : "Remove Listing"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  )}

  {activeSection === "enquiries" && (
  <>
    <div className="flex items-center justify-between gap-3 mb-5">
      <button
        onClick={() => setActiveSection("dashboard")}
        className="bg-white border text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold"
      >
        ← Admin Dashboard
      </button>

      <button
        onClick={loadEnquiries}
        disabled={enquiriesLoading}
        className="bg-white border text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
      >
        {enquiriesLoading ? "Refreshing..." : "Refresh"}
      </button>
    </div>

    <div className="mb-5">
      <h2 className="text-2xl font-bold text-gray-900">
        Customer Enquiries
      </h2>

      <p className="text-sm text-gray-500 mt-1">
        Track customer contacts, visits and enquiry status.
      </p>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <div className="bg-white border rounded-2xl p-4">
        <p className="text-xs text-gray-500">
          Total Enquiries
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {enquiries.length}
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <p className="text-xs text-gray-500">
          Visit Requests
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {
            enquiries.filter(
              (enquiry) =>
                enquiry.contact_method === "visit"
            ).length
          }
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <p className="text-xs text-gray-500">
          Confirmed Visits
        </p>
        <p className="text-2xl font-bold text-green-600 mt-1">
          {
            enquiries.filter(
              (enquiry) =>
                enquiry.visit_status === "confirmed"
            ).length
          }
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <p className="text-xs text-gray-500">
          Pending Visits
        </p>
        <p className="text-2xl font-bold text-orange-600 mt-1">
          {
            enquiries.filter(
              (enquiry) =>
                enquiry.visit_status === "requested"
            ).length
          }
        </p>
      </div>
    </div>

    <div className="bg-white border rounded-2xl p-4 mb-5">
      <input
        type="text"
        value={enquirySearch}
        onChange={(event) =>
          setEnquirySearch(event.target.value)
        }
        placeholder="Search enquiry ID, customer, phone, property or broker..."
        className="w-full border rounded-xl px-4 py-3 text-sm"
      />
    </div>

    <div className="bg-white border rounded-2xl overflow-hidden">
      {enquiriesLoading ? (
        <div className="p-8 text-center text-gray-500">
          Loading enquiries...
        </div>
      ) : enquiries.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">📋</div>

          <p className="font-semibold text-gray-900">
            No customer enquiries yet.
          </p>

          <p className="text-sm text-gray-500 mt-1">
            Enquiries will appear here when customers
            contact owners or brokers.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Enquiry
                </th>

                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Customer
                </th>

                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Property
                </th>

                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Owner / Broker
                </th>

                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Contact
                </th>

                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Visit
                </th>

                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Status
                </th>

                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Created
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {enquiries
                .filter((enquiry) => {
                  const search =
                    enquirySearch
                      .trim()
                      .toLowerCase();

                  if (!search) {
                    return true;
                  }

                  return [
                    enquiry.enquiry_id,
                    enquiry.customer_name,
                    enquiry.customer_phone,
                    enquiry.property_title,
                    enquiry.broker_name,
                    enquiry.contact_method,
                    enquiry.status,
                    enquiry.visit_status || "",
                  ]
                    .join(" ")
                    .toLowerCase()
                    .includes(search);
                })
                .map((enquiry) => (
                  <tr
                    key={enquiry.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="font-semibold text-gray-900">
                        {enquiry.enquiry_id}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        #{enquiry.id}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">
                        {enquiry.customer_name}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {enquiry.customer_phone}
                      </p>
                    </td>

                    <td className="px-4 py-4 min-w-[220px]">
                      <p className="font-medium text-gray-900">
                        {enquiry.property_title}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        Property #{enquiry.property_id}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">
                        {enquiry.broker_name}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {enquiry.broker_phone}
                      </p>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold capitalize">
                        {enquiry.contact_method}
                      </span>
                    </td>

                    <td className="px-4 py-4 min-w-[180px]">
                      {enquiry.visit_date ? (
                        <>
                          <p className="font-medium text-gray-900">
                            {new Date(
                              `${enquiry.visit_date}T00:00:00`
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>

                          {enquiry.visit_time && (
                            <p className="text-xs text-gray-500 mt-1">
                              {enquiry.visit_time.slice(
                                0,
                                5
                              )}
                            </p>
                          )}

                          <p className="text-xs font-semibold text-gray-600 mt-1 capitalize">
                            {enquiry.visit_status ||
                              "Requested"}
                          </p>

                          {enquiry.proposed_visit_date && (
                            <p className="text-xs text-orange-600 mt-1">
                              Changed:{" "}
                              {new Date(
                                `${enquiry.proposed_visit_date}T00:00:00`
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                }
                              )}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">
                          No visit
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-semibold capitalize">
                        {enquiry.status.replace(
                          /_/g,
                          " "
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-gray-700">
                        {new Date(
                          enquiry.created_at
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(
                          enquiry.created_at
                        ).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </>
)}
</div>
    </main>
  );
}
