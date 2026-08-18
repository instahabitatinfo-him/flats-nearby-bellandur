"use client";

import { useState } from "react";
import CustomerLogin from "../../components/CustomerLogin";

type ProtectedMapButtonProps = {
  googleMapsUrl: string;
};

export default function ProtectedMapButton({
  googleMapsUrl,
}: ProtectedMapButtonProps) {
  const [showLogin, setShowLogin] = useState(false);

  const handleVerified = () => {
    setShowLogin(false);
    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowLogin(true)}
        className="block w-full text-center bg-gray-900 text-white rounded-xl py-3 mt-4 text-sm font-semibold hover:bg-black"
      >
        📍 Open in Google Maps
      </button>

      {showLogin && (
        <CustomerLogin
          onClose={() => setShowLogin(false)}
          onVerified={handleVerified}
        />
      )}
    </>
  );
}
