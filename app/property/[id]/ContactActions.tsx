"use client";

import { useState } from "react";
import CustomerLogin from "../../components/CustomerLogin";

type ContactActionsProps = {
  propertyId: number;
  phone: string | null;
  whatsappUrl: string | null;
  googleMapsUrl: string | null;
};

export default function ContactActions({
  propertyId,
  phone,
  whatsappUrl,
  googleMapsUrl,
}: ContactActionsProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "call" | "whatsapp" | null
  >(null);

  const handleAction = (action: "call" | "whatsapp") => {
    setSelectedAction(action);
    setShowLogin(true);
  };

  const handleVerified = () => {
    setShowLogin(false);

    if (selectedAction === "call" && phone) {
      window.location.href = `tel:${phone}`;
    }

    if (selectedAction === "whatsapp" && whatsappUrl) {
      window.location.href = whatsappUrl;
    }

    setSelectedAction(null);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_14px_rgba(0,0,0,0.10)]">
        <div className="max-w-md mx-auto px-5 py-3">
          <div className="flex gap-3">
            {phone && (
              <button
                type="button"
                onClick={() => handleAction("call")}
                className="flex-1 bg-blue-600 text-white text-center py-3.5 rounded-xl font-semibold active:scale-[0.98] transition"
              >
                📞 Call
              </button>
            )}

            {whatsappUrl && (
              <button
                type="button"
                onClick={() => handleAction("whatsapp")}
                className="flex-1 bg-green-600 text-white text-center py-3.5 rounded-xl font-semibold active:scale-[0.98] transition"
              >
                💬 WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>

      {showLogin && (
        <CustomerLogin
          onClose={() => {
            setShowLogin(false);
            setSelectedAction(null);
          }}
          onVerified={handleVerified}
        />
      )}
    </>
  );
}
