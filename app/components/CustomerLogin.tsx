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

  const [msg91Ready, setMsg91Ready] = useState(
    typeof window !== "undefined" &&
      typeof window.initSendOTP === "function"
  );

  /*
   * Load MSG91 SDK once.
   *
   * We DO NOT initialize the widget here because the
   * phone number and token are only available when the
   * user clicks Send OTP.
   */
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof window.initSendOTP === "function"
    ) {
      setMsg91Ready(true);
      return;
    }

    const existing = document.querySelector(
      'script[data-msg91-otp="true"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      const onLoad = () => {
        console.log("MSG91 SDK READY");
        setMsg91Ready(
          typeof window.initSendOTP === "function"
        );
      };

      existing.addEventListener("load", onLoad);

      return () => {
        existing.removeEventListener("load", onLoad);
      };
    }

    const script = document.createElement("script");

    script.type = "text/javascript";
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.async = true;
    script.dataset.msg91Otp = "true";

    script.onload = () => {
      console.log("MSG91 SDK LOADED");

      setMsg91Ready(
        typeof window.initSendOTP === "function"
      );
    };

    script.onerror = () => {
      console.error("MSG91 SDK LOAD ERROR");
      setMsg91Ready(false);
      setMessage(
        "Unable to load OTP service. Please refresh and try again."
      );
    };

    document.head.appendChild(script);
  }, []);

  const startOtp = async () => {
    setMessage("");

    const cleanName = fullName.trim();

    const cleanPhone = phone
      .replace(/\D/g, "")
      .slice(0, 10);

    if (!cleanName) {
      setMessage("Please enter your name.");
      return;
    }

    if (cleanPhone.length !== 10) {
      setMessage(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    /*
     * MSG91 requires country code without +.
     *
     * Example:
     * 9876543210
     *
     * becomes:
     * 919876543210
     */
    const identifier = `91${cleanPhone}`;

    setLoading(true);

    try {
      /*
       * Make sure the SDK is available.
       */
      if (
        typeof window.initSendOTP !== "function"
      ) {
        setMessage(
          "OTP service is still loading. Please try again."
        );

        setLoading(false);
        return;
      }

      /*
       * Get widget configuration from our server.
       */
      const configResponse = await fetch(
        "/api/customer/otp-config",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const configText =
        await configResponse.text();

      console.log(
        "MSG91 CONFIG STATUS:",
        configResponse.status
      );

      let configData: {
        configured?: boolean;
        widgetId?: string;
        token?: string;
      };

      try {
        configData = JSON.parse(configText);
      } catch (error) {
        console.error(
          "MSG91 CONFIG JSON ERROR:",
          error
        );

        setMessage(
          "OTP service returned an invalid response."
        );

        setLoading(false);
        return;
      }

      console.log("MSG91 CONFIG CHECK:", {
        configured: configData.configured,
        widgetId: configData.widgetId,
        hasToken: Boolean(configData.token),
      });

      if (
        !configResponse.ok ||
        !configData.configured ||
        !configData.widgetId ||
        !configData.token
      ) {
        console.error(
          "MSG91 CONFIG ERROR:",
          {
            status: configResponse.status,
            configured: configData.configured,
            widgetId: configData.widgetId,
            hasToken: Boolean(configData.token),
          }
        );

        setMessage(
          "OTP service is not configured correctly."
        );

        setLoading(false);
        return;
      }

      console.log(
        "MSG91 INITIALIZING WIDGET:",
        {
          widgetId: configData.widgetId,
          identifier,
        }
      );

      /*
       * This follows MSG91's documented Web SDK
       * configuration.
       *
       * The widget opens its own OTP UI after
       * initSendOTP is called.
       */
      window.initSendOTP({
        widgetId: configData.widgetId,
        tokenAuth: configData.token,
        identifier,
        exposeMethods: false,

        success: async (data) => {
          console.log(
            "MSG91 OTP SUCCESS:",
            data
          );

          const accessToken =
            typeof data?.token === "string"
              ? data.token.trim()
              : "";

          if (!accessToken) {
            console.error(
              "MSG91 SUCCESS WITHOUT TOKEN:",
              data
            );

            setMessage(
              "OTP verification completed, but the verification token was not received."
            );

            setLoading(false);
            return;
          }

          try {
            /*
             * Send MSG91 access token to our server.
             */
            const response = await fetch(
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

            const result =
              await response.json();

            console.log(
              "HOME EASE VERIFY RESULT:",
              {
                status: response.status,
                verified: result?.verified,
              }
            );

            if (!response.ok) {
              setMessage(
                result?.error ||
                  "Unable to verify your mobile number."
              );

              setLoading(false);
              return;
            }

            if (!result?.verified) {
              setMessage(
                "Mobile number verification was not completed."
              );

              setLoading(false);
              return;
            }

            /*
             * COMPLETE.
             *
             * The protected action can now continue.
             */
            onVerified?.({
              fullName: cleanName,
              phone: cleanPhone,
            });

            setLoading(false);
          } catch (error) {
            console.error(
              "HOME EASE VERIFY ERROR:",
              error
            );

            setMessage(
              "Unable to complete verification."
            );

            setLoading(false);
          }
        },

        failure: (error) => {
          /*
           * MSG91 sometimes returns {}.
           *
           * Log the complete value so we can inspect
           * the browser-side failure if it happens again.
           */
          console.error(
            "MSG91 OTP FAILURE:",
            error,
            JSON.stringify(error),
            Object.getOwnPropertyNames(
              Object(error)
            )
          );

          setMessage(
            "MSG91 could not start OTP verification. Please check the number and try again."
          );

          setLoading(false);
        },
      });
    } catch (error) {
      console.error(
        "MSG91 START ERROR:",
        error
      );

      setMessage(
        "Unable to start OTP verification."
      );

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
              onChange={(event) =>
                setFullName(event.target.value)
              }
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
              onChange={(event) =>
                setPhone(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10)
                )
              }
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
            {loading
              ? "Opening OTP..."
              : msg91Ready
              ? "Send OTP"
              : "Loading OTP..."}
          </button>

        </div>

        <p className="text-[11px] text-gray-400 text-center mt-5 leading-4">
          Your mobile number is used to identify your HomeEase enquiry.
        </p>

      </div>
    </div>
  );
}
