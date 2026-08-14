"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

const MAX_PHOTOS = 12;

export default function ListPropertyPage() {
const [submitted, setSubmitted] = useState(false);
const [error, setError] = useState("");
const [saving, setSaving] = useState(false);

const [latitude, setLatitude] = useState<number | null>(null);
const [longitude, setLongitude] = useState<number | null>(null);
const [locationLoading, setLocationLoading] = useState(false);

const [listingType, setListingType] = useState<"Rent" | "Sale">("Rent");

const [photos, setPhotos] = useState<File[]>([]);
const [uploadProgress, setUploadProgress] = useState(0);
const [brokerageNegotiable, setBrokerageNegotiable] = useState(true);

function getPropertyLocation() {
setError("");

if (!navigator.geolocation) {
  setError("Location is not supported by this browser.");
  return;
}

setLocationLoading(true);

navigator.geolocation.getCurrentPosition(
  (position) => {
    setLatitude(position.coords.latitude);
    setLongitude(position.coords.longitude);
    setLocationLoading(false);
  },
  (locationError) => {
    setLocationLoading(false);

    if (locationError.code === 1) {
      setError(
        "Location permission was denied. Please allow location access and try again."
      );
    } else {
      setError(
        "Unable to get your location. Please try again near the property."
      );
    }
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  }
);

}

function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
const selectedFiles = Array.from(event.target.files || []);

setError("");

if (selectedFiles.length > MAX_PHOTOS) {
  setError(`Please select a maximum of ${MAX_PHOTOS} photos.`);
  setPhotos(selectedFiles.slice(0, MAX_PHOTOS));
  return;
}

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const invalidFile = selectedFiles.find(
  (file) => !allowedTypes.includes(file.type)
);

if (invalidFile) {
  setError(
    `${invalidFile.name} is not a supported image. Please use JPG, PNG, or WebP.`
  );
  setPhotos([]);
  return;
}

const oversizedFile = selectedFiles.find(
  (file) => file.size > 10 * 1024 * 1024
);

if (oversizedFile) {
  setError(
    `${oversizedFile.name} is larger than 10 MB. Please choose a smaller image.`
  );
  setPhotos([]);
  return;
}

setPhotos(selectedFiles);

}

async function uploadPhoto(
file: File,
propertyId: number,
index: number
) {
const fileExtension =
file.name.split(".").pop()?.toLowerCase() || "jpg";

const uniqueName =
  `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

const filePath = `${propertyId}/${uniqueName}`;

const { error: uploadError } = await supabase.storage
  .from("property-photos")
  .upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

if (uploadError) {
  throw new Error(
    `Failed to upload photo ${index + 1}: ${uploadError.message}`
  );
}

const { data } = supabase.storage
  .from("property-photos")
  .getPublicUrl(filePath);

const publicUrl = data.publicUrl;

if (!publicUrl) {
  throw new Error(
    `Unable to create public URL for photo ${index + 1}.`
  );
}

const { error: photoRowError } = await supabase
  .from("property_photos")
  .insert({
    property_id: propertyId,
    photo_url: publicUrl,
    sort_order: index,
  });

if (photoRowError) {
  throw new Error(
    `Photo ${index + 1} was uploaded but could not be saved: ${photoRowError.message}`
  );
}

}

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();

setError("");
setSaving(true);
setUploadProgress(0);

try {
  if (latitude === null || longitude === null) {
    setError(
      "Please use the Property Location button before submitting."
    );
    setSaving(false);
    return;
  }

  if (photos.length > MAX_PHOTOS) {
    setError(`You can upload a maximum of ${MAX_PHOTOS} photos.`);
    setSaving(false);
    return;
  }

  const formData = new FormData(event.currentTarget);

  const title = String(formData.get("title") || "").trim();
  const description = String(
    formData.get("description") || ""
  ).trim();

  const propertyType = String(
    formData.get("property_type") || ""
  );

  const bhk = Number(formData.get("bhk") || 0);
  const rent = Number(formData.get("rent") || 0);

  const areaSqft = Number(formData.get("area_sqft") || 0);

  const furnishing = String(
    formData.get("furnishing") || ""
  ).trim();

  const deposit = Number(
    formData.get("deposit") || 0
  );

  const floor = Number(
    formData.get("floor") || 0
  );

  const totalFloors = Number(
    formData.get("total_floors") || 0
  );

  const availabilityDate = String(
    formData.get("availability_date") || ""
  ).trim();

  const address = String(
    formData.get("address") || ""
  ).trim();

  const brokerName = String(
    formData.get("broker_name") || ""
  ).trim();

  const phone = String(
    formData.get("phone") || ""
  ).trim();

  const whatsapp = String(
    formData.get("whatsapp") || ""
  ).trim();

  const brokerageAmount = Number(
    formData.get("brokerage_amount") || 0
  );

  if (!title) {
    setError("Please enter a property title.");
    setSaving(false);
    return;
  }

  if (!propertyType) {
    setError("Please select a property type.");
    setSaving(false);
    return;
  }

  if (!bhk) {
    setError("Please select the BHK.");
    setSaving(false);
    return;
  }

  if (!rent || rent < 0) {
    setError(
      listingType === "Rent"
        ? "Please enter a valid monthly rent."
        : "Please enter a valid sale price."
    );
    setSaving(false);
    return;
  }

  if (!address) {
    setError("Please enter the property address.");
    setSaving(false);
    return;
  }

  const { data: propertyId, error: insertError } =
    await supabase.rpc("create_pending_property", {
      p_title: title,
      p_description: description,
      p_property_type: propertyType,
      p_listing_type: listingType,
      p_bhk: bhk,
      p_price: rent,
      p_area_sqft: areaSqft || null,
      p_furnishing: furnishing || null,
      p_deposit: listingType === "Rent" ? deposit || null : null,
      p_floor: floor || null,
      p_total_floors: totalFloors || null,
      p_availability_date: availabilityDate || null,
      p_address: address,
      p_latitude: latitude,
      p_longitude: longitude,
      p_broker_name: brokerName,
      p_broker_phone: phone,
      p_broker_whatsapp: whatsapp,
      p_brokerage_amount: brokerageAmount,
      p_brokerage_negotiable: brokerageNegotiable,
    });

  if (insertError) {
    console.error(
      "SUPABASE PROPERTY INSERT ERROR MESSAGE:",
      insertError.message
    );

    console.error(
      "SUPABASE PROPERTY INSERT ERROR CODE:",
      insertError.code
    );

    console.error(
      "SUPABASE PROPERTY INSERT ERROR DETAILS:",
      insertError.details
    );

    console.error(
      "SUPABASE PROPERTY INSERT ERROR HINT:",
      insertError.hint
    );

    setError(
      `Unable to submit property: ${insertError.message}`
    );

    setSaving(false);
    return;
  }

  if (!propertyId) {
    setError(
      "Property was created, but no property ID was returned."
    );
    setSaving(false);
    return;
  }

  const property = {
    id: Number(propertyId),
  };

  if (photos.length > 0) {
    for (let index = 0; index < photos.length; index++) {
      await uploadPhoto(
        photos[index],
        property.id,
        index
      );

      setUploadProgress(
        Math.round(
          ((index + 1) / photos.length) * 100
        )
      );
    }
  }

  setSubmitted(true);
setSubmitted(true);} catch (caughtError) {
  console.error("PROPERTY SUBMISSION ERROR:", caughtError);

  const message =
    caughtError instanceof Error
      ? caughtError.message
      : "An unexpected error occurred.";

  setError(message);
} finally {
  setSaving(false);
}

}

if (submitted) {
return ( <main className="min-h-screen bg-gray-50 p-6"> <div className="max-w-xl mx-auto bg-white rounded-2xl p-6 shadow-sm"> <h1 className="text-2xl font-bold text-gray-900">
Property submitted </h1>

      <p className="text-gray-600 mt-3">
        Thank you. Your property has been submitted for review.
      </p>

      {photos.length > 0 && (
        <p className="text-gray-600 mt-2">
          {photos.length} photo
          {photos.length === 1 ? "" : "s"} uploaded successfully.
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setSubmitted(false);
          setPhotos([]);
          setUploadProgress(0);
          setError("");
        }}
        className="mt-6 w-full bg-black text-white rounded-xl px-4 py-3 font-semibold"
      >
        List Another Property
      </button>
    </div>
  </main>
);

}

return ( <main className="min-h-screen bg-gray-50 p-6"> <div className="max-w-xl mx-auto"> <div className="mb-6"> <h1 className="text-3xl font-bold text-gray-900">
List Property </h1>

      <p className="text-gray-600 mt-2">
        Add a property listing for your clients and reach people searching nearby.
      </p>
    </div>

    {error && (
      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )}

    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl p-6 shadow-sm space-y-5"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Property title
        </label>

        <input
          name="title"
          required
          placeholder="Beautiful 2 BHK Near Bellandur"
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>

        <textarea
          name="description"
          rows={4}
          placeholder="Describe the property..."
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Listing type
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setListingType("Rent")}
            className={
              listingType === "Rent"
                ? "bg-black text-white rounded-xl px-4 py-3 font-semibold"
                : "bg-white border rounded-xl px-4 py-3 font-semibold text-gray-700"
            }
          >
            For Rent
          </button>

          <button
            type="button"
            onClick={() => setListingType("Sale")}
            className={
              listingType === "Sale"
                ? "bg-black text-white rounded-xl px-4 py-3 font-semibold"
                : "bg-white border rounded-xl px-4 py-3 font-semibold text-gray-700"
            }
          >
            For Sale
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Property type
          </label>

          <select
            name="property_type"
            required
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">Select</option>
            <option value="Apartment">Apartment</option>
            <option value="House">House</option>
            <option value="Villa">Villa</option>
            <option value="PG">PG</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            BHK
          </label>

          <select
            name="bhk"
            required
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">Select</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4 BHK</option>
            <option value="5">5 BHK</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {listingType === "Rent" ? "Monthly rent" : "Sale price"}
        </label>

        <input
          name="rent"
          type="number"
          min="0"
          required
          placeholder={
            listingType === "Rent"
              ? "25000"
              : "7500000"
          }
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Floor
          </label>

          <input
            name="floor"
            type="number"
            min="0"
            placeholder="5"
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total floors
          </label>

          <input
            name="total_floors"
            type="number"
            min="1"
            placeholder="12"
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Area (sqft)
          </label>

          <input
            name="area_sqft"
            type="number"
            min="0"
            placeholder="1200"
            className="w-full border rounded-xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Furnishing
          </label>

          <select
            name="furnishing"
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">Select</option>
            <option value="Unfurnished">Unfurnished</option>
            <option value="Semi-Furnished">Semi-Furnished</option>
            <option value="Furnished">Furnished</option>
          </select>
        </div>
      </div>

      {listingType === "Rent" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Security deposit
          </label>

          <input
            name="deposit"
            type="number"
            min="0"
            placeholder="100000"
            className="w-full border rounded-xl px-4 py-3"
          />

          <p className="text-xs text-gray-500 mt-2">
            Enter the refundable security deposit amount.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Brokerage
        </label>

        <input
          name="brokerage_amount"
          type="number"
          min="0"
          required
          placeholder="25000"
          className="w-full border rounded-xl px-4 py-3"
        />

        <p className="text-xs text-gray-500 mt-2">
          For rental properties, this is usually one month's rent.
        </p>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            type="button"
            onClick={() => setBrokerageNegotiable(true)}
            className={
              brokerageNegotiable
                ? "bg-black text-white rounded-xl px-4 py-3 font-semibold"
                : "bg-white border rounded-xl px-4 py-3 font-semibold text-gray-700"
            }
          >
            Negotiable
          </button>

          <button
            type="button"
            onClick={() => setBrokerageNegotiable(false)}
            className={
              !brokerageNegotiable
                ? "bg-black text-white rounded-xl px-4 py-3 font-semibold"
                : "bg-white border rounded-xl px-4 py-3 font-semibold text-gray-700"
            }
          >
            Non-negotiable
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Available From
        </label>

        <input
          name="availability_date"
          type="date"
          className="w-full border rounded-xl px-4 py-3"
        />

        <p className="text-xs text-gray-500 mt-2">
          Select when the property will be available for move-in.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address
        </label>

        <textarea
          name="address"
          required
          rows={3}
          placeholder="Enter the property address"
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={getPropertyLocation}
          disabled={locationLoading || saving}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 font-semibold disabled:opacity-50"
        >
          {locationLoading
            ? "Getting Location..."
            : latitude !== null && longitude !== null
            ? "Location Captured ✓"
            : "Property Location"}
        </button>

        {latitude !== null && longitude !== null && (
          <p className="text-xs text-gray-500 mt-2">
            Location: {latitude.toFixed(6)},{" "}
            {longitude.toFixed(6)}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Broker name
        </label>

        <input
          name="broker_name"
          required
          placeholder="Your broker name"
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone
        </label>

        <input
          name="phone"
          type="tel"
          required
          placeholder="Phone number"
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          WhatsApp
        </label>

        <input
          name="whatsapp"
          type="tel"
          placeholder="WhatsApp number"
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Property photos
        </label>

        <input
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handlePhotoChange}
          disabled={saving}
          className="w-full border rounded-xl px-4 py-3"
        />

        <p className="text-xs text-gray-500 mt-2">
          Maximum {MAX_PHOTOS} photos. JPG, PNG, or WebP. Maximum 10 MB per photo.
        </p>

        {photos.length > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {photos.length} photo
            {photos.length === 1 ? "" : "s"} selected.
          </p>
        )}
      </div>

      {saving && photos.length > 0 && (
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Uploading photos...</span>
            <span>{uploadProgress}%</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-black h-2 rounded-full transition-all"
              style={{
                width: `${uploadProgress}%`,
              }}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-black text-white rounded-xl px-4 py-3 font-semibold disabled:opacity-50"
      >
        {saving
          ? photos.length > 0
            ? `Uploading... ${uploadProgress}%`
            : "Submitting..."
          : "Submit Property"}
      </button>
    </form>
  </div>
</main>

);

}
