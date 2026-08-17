"use client";

import { useEffect, useState } from "react";

type CustomerLoginProps = {
  onVerified?: (customer: {
    fullName: string;
    phone: string;
  }) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    initSendOTP?: (config: {
      widgetId: string;
      tokenAuth: string;
      identifier?: string;
      exposeMethods?: boolean;
      success: (data: {
        token?: string;
        message?: string;
        [key: string]: unknown;
      }) => void;
      failure: (error: unknown) => void;
    }) => void;
  }
}

export default function CustomerLogin({
  onVerified,
  onClose,
}: CustomerLoginProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (document.querySelector('script[data-msg91-otp="true"]')) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.async = true;
    script.dataset.msg91Otp = "true";

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  const startOtp = async () => {
    setMessage("");

    const cleanName = fullName.trim();
    const cleanPhone = phone.replace(/\D/g, "");

    if (!cleanName) {
      setMessage("Please enter your name.");
      return;
    }

    if (cleanPhone.length !== 10) {
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    try {
      // Get the MSG91 widget token from our server at runtime.
      const configResponse = await fetch("/api/customer/otp-config", {
        cache: "no-store",
      });

      const configData = await configResponse.json();

      if (!configResponse.ok || !configData.token) {
        console.error("OTP CONFIG ERROR:", configData);
        setMessage("OTP service is not configured.");
        return;
      }

      // Make sure the MSG91 script has loaded.
      if (typeof window.initSendOTP !== "function") {
        setMessage("OTP service is loading. Please try again.");
        return;
      }

      window.initSendOTP({
        widgetId: configData.widgetId,
        tokenAuth: configData.token,
        identifier: `91${cleanPhone}`,
        exposeMethods: false,

        success: async (data) => {
          console.log("MSG91 OTP SUCCESS:", data);

          const accessToken =
            typeof data.token === "string" ? data.token : "";

          if (!accessToken) {
            setMessage("OTP verification token was not received.");
            setLoading(false);
            return;
          }

          try {
            const verifyResponse = await fetch(
              "/api/customer/verify-otp",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  fullName: cleanName,
                  phone: cleanPhone,
                  accessToken,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              setMessage(
                verifyData.error ||
                  "Unable to verify your mobile number."
              );
              return;
            }

            onVerified?.({
              fullName: cleanName,
              phone: cleanPhone,
            });
          } catch (error) {
            console.error("VERIFY REQUEST ERROR:", error);
            setMessage("Unable to complete verification.");
          } finally {
            setLoading(false);
          }
        },

        failure: (error) => {
          console.error("MSG91 OTP FAILURE:", error);
          setMessage("OTP verification failed. Please try again.");
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("START OTP ERROR:", error);
      setMessage("Unable to start OTP verification.");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Login to continue
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Verify your mobile number to continue.
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-gray-100 text-gray-600 text-xl"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        <div className="space-y-4">

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Your name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your name"
              autoComplete="name"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Mobile number
            </label>

            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Enter your mobile number"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          {message && (
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={startOtp}
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50"
          >
            {loading ? "Opening OTP..." : "Send OTP"}
          </button>

        </div>

        <p className="text-[11px] text-gray-400 text-center mt-5 leading-4">
          Your mobile number is used to identify your HomeEase enquiry.
        </p>

      </div>
    </div>
  );
}