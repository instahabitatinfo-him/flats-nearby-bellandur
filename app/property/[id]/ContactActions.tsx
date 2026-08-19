"use client";

import { useState } from "react";
import CustomerLogin from "../../components/CustomerLogin";

type ContactActionsProps = {
  propertyId: number;
  phone: string | null;
  whatsappUrl: string | null;
  brokerWhatsapp: string | null;
  googleMapsUrl: string | null;
};

export default function ContactActions({
  propertyId,
  phone,
  whatsappUrl,
  brokerWhatsapp,
  googleMapsUrl,
}: ContactActionsProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");

  const [selectedAction, setSelectedAction] = useState<
    "call" | "whatsapp" | "visit" | null
  >(null);

  const handleAction = async (
    action: "call" | "whatsapp"
  ) => {
    setSelectedAction(action);

    try {
      await handleContact(action);

      if (action === "call" && phone) {
        window.location.href = `tel:${phone}`;
        return;
      }

      if (action === "whatsapp" && whatsappUrl) {
        window.location.href = whatsappUrl;
        return;
      }
    } catch (error) {
      console.error(
        "CONTACT ENQUIRY ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to contact this property."
      );
    } finally {
      setSelectedAction(null);
    }
  };

  const handleVisitClick = () => {
    setShowVisitForm(true);
  };

  const handleContact = async (
    action: "call" | "whatsapp"
  ) => {
    const response = await fetch(
      "/api/enquiries",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          contactMethod: action,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "Unable to create enquiry"
      );
    }

    return result;
  };

  const handleVisitRequest = async () => {
    if (!visitDate || !visitTime) {
      throw new Error(
        "Please select a visit date and time."
      );
    }

    const response = await fetch(
      "/api/enquiries",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          contactMethod: "visit",
          visitDate,
          visitTime,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "Unable to request a visit"
      );
    }

    return result;
  };

  const handleVerified = async (customer: {
    id: string;
    fullName: string;
    phone: string;
  }) => {
    if (!selectedAction) {
      setShowLogin(false);
      return;
    }

    try {
      if (selectedAction === "visit") {
        setShowLogin(false);
        setShowVisitForm(true);
        return;
      }

      await handleContact(selectedAction);

      setShowLogin(false);

      if (selectedAction === "call" && phone) {
        window.location.href = `tel:${phone}`;
        return;
      }

      if (
        selectedAction === "whatsapp" &&
        whatsappUrl
      ) {
        window.location.href = whatsappUrl;
        return;
      }
    } catch (error) {
      console.error(
        "CONTACT ENQUIRY ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to contact this property."
      );
    } finally {
      setSelectedAction(null);
    }
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

            <button
              type="button"
              onClick={handleVisitClick}
              className="flex-1 bg-orange-500 text-white text-center py-3.5 rounded-xl font-semibold active:scale-[0.98] transition"
            >
              📅 Request Visit
            </button>
          </div>
        </div>
      </div>

      {showVisitForm && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center px-5">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-gray-900">
              Request a Visit
            </h2>

            <p className="text-sm text-gray-600 mt-2">
              Select your preferred visit date and time.
            </p>

            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visit date
              </label>

              <input
                type="date"
                value={visitDate}
                min={new Date()
                  .toISOString()
                  .split("T")[0]}
                onChange={(event) => {
                  setVisitDate(event.target.value);
                }}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visit time
              </label>

              <input
                type="time"
                value={visitTime}
                onChange={(event) => {
                  setVisitTime(event.target.value);
                }}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowVisitForm(false);
                  setVisitDate("");
                  setVisitTime("");
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!visitDate || !visitTime) {
                    alert(
                      "Please select both a visit date and a visit time."
                    );
                    return;
                  }

                  try {
                    const result =
                      await handleVisitRequest();

                    setShowVisitForm(false);

                    const ownerResponseUrl =
                      result?.ownerResponseUrl || null;

                    if (
                      ownerResponseUrl &&
                      brokerWhatsapp
                    ) {
                      const brokerWhatsAppNumber =
                        brokerWhatsapp.replace(
                          /\D/g,
                          ""
                        );

                      if (brokerWhatsAppNumber) {
                        const message =
                          `HomeEase: New visit request for this property.\n\n` +
                          `Requested visit: ${visitDate} at ${visitTime}\n\n` +
                          `Please respond to the visit request here:\n` +
                          ownerResponseUrl;

                        const whatsappHandoff =
                          `https://wa.me/${brokerWhatsAppNumber}?text=${encodeURIComponent(
                            message
                          )}`;

                        window.location.href =
                          whatsappHandoff;
                      } else {
                        alert(
                          "Visit request submitted successfully."
                        );
                      }
                    } else {
                      alert(
                        "Visit request submitted successfully."
                      );
                    }

                    setVisitDate("");
                    setVisitTime("");
                  } catch (error) {
                    console.error(
                      "VISIT REQUEST ERROR:",
                      error
                    );

                    alert(
                      error instanceof Error
                        ? error.message
                        : "Unable to request a visit."
                    );
                  }
                }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold"
              >
                Request Visit
              </button>
            </div>
          </div>
        </div>
      )}

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