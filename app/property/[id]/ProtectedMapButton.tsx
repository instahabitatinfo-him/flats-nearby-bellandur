"use client";

type ProtectedMapButtonProps = {
  googleMapsUrl: string;
};

export default function ProtectedMapButton({
  googleMapsUrl,
}: ProtectedMapButtonProps) {
  return (
    <button
      type="button"
      onClick={() =>
        window.open(
          googleMapsUrl,
          "_blank",
          "noopener,noreferrer"
        )
      }
      className="block w-full text-center bg-gray-900 text-white rounded-xl py-3 mt-4 text-sm font-semibold hover:bg-black"
    >
      📍 Open in Google Maps
    </button>
  );
}
