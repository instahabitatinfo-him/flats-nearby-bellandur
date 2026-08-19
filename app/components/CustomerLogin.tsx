"use client";

import { useEffect, useRef, useState } from "react";

type CustomerLoginProps = {
  onVerified?: (customer: {
  id: string;
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
      captchaRenderId?: string;
      success: (data: {
        token?: string;
        message?: string;
        [key: string]: unknown;
      }) => void;
      failure: (error: unknown) => void;
    }) => void;
isCaptchaVerified?: () => boolean;

    sendOtp?: (
      identifier: string,
      success?: (data: unknown) => void,
      failure?: (error: unknown) => void
    ) => void;

    retryOtp?: (
      channel: string | null,
      success?: (data: unknown) => void,
      failure?: (error: unknown) => void,
      token?: string
    ) => void;

    verifyOtp?: (
      otp: string | number,
      success?: (data: {
        token?: string;
        [key: string]: unknown;
      }) => void,
      failure?: (error: unknown) => void,
      token?: string
    ) => void;
  }
}

export default function CustomerLogin({
  onVerified,
  onClose,
}: CustomerLoginProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");

  const [msg91Ready, setMsg91Ready] = useState(false);
const [widgetInitialized, setWidgetInitialized] = useState(false);
const msg91AccessTokenRef = useRef("");
  /*
   * Load MSG91 Web OTP Widget SDK.
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
useEffect(() => {
  if (!msg91Ready || widgetInitialized) {
    return;
  }

  const initialize = async () => {
    try {
      const configResponse = await fetch(
        "/api/customer/otp-config",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const configData = await configResponse.json();

      console.log("MSG91 CONFIG:", {
        status: configResponse.status,
        configured: configData?.configured,
        widgetId: configData?.widgetId,
        hasToken: Boolean(configData?.token),
      });

      if (
        !configResponse.ok ||
        !configData?.configured ||
        !configData?.widgetId ||
        !configData?.token
      ) {
        throw new Error(
          "MSG91 OTP Widget is not configured correctly."
        );
      }

      if (typeof window.initSendOTP !== "function") {
        throw new Error(
          "MSG91 OTP SDK is not ready."
        );
      }

              window.initSendOTP({
          widgetId: configData.widgetId,
          tokenAuth: configData.token,
          exposeMethods: true,
          captchaRenderId: "msg91-captcha",

          success: (data) => {
            console.log(
              "MSG91 WIDGET SUCCESS:",
              data,
              JSON.stringify(data)
            );

            const token =
              typeof data?.token === "string"
                ? data.token.trim()
                : "";

            if (token) {
              msg91AccessTokenRef.current = token;
            }
          },

          failure: (error) => {
            console.error(
              "MSG91 WIDGET FAILURE:",
              error,
              JSON.stringify(error)
            );
          },
        });

        setTimeout(() => {
          console.log("MSG91 METHODS:", {
            sendOtp: typeof window.sendOtp,
            retryOtp: typeof window.retryOtp,
            verifyOtp: typeof window.verifyOtp,
            captcha: typeof window.isCaptchaVerified,
          });

          if (
            typeof window.sendOtp === "function" &&
            typeof window.verifyOtp === "function"
          ) {
            setWidgetInitialized(true);
            console.log("MSG91 WIDGET INITIALIZED");
          } else {
            console.error(
              "MSG91 METHODS NOT EXPOSED"
            );
          }
        }, 500);

    } catch (error) {
      console.error(
        "MSG91 INITIALIZATION ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to initialize OTP service."
      );
    }
  };

  initialize();
}, [msg91Ready, widgetInitialized]);

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

  if (!msg91Ready) {
    setMessage(
      "OTP service is still loading. Please try again."
    );
    return;
  }

  if (!widgetInitialized) {
    setMessage(
      "OTP service is still initializing. Please try again."
    );
    return;
  }

  const identifier = `91${cleanPhone}`;

  setLoading(true);

  try {
    if (
      typeof window.isCaptchaVerified === "function" &&
      !window.isCaptchaVerified()
    ) {
      setMessage(
        "Please complete the captcha, then click Send OTP."
      );
      setLoading(false);
      return;
    }

    if (typeof window.sendOtp !== "function") {
      setMessage(
        "OTP service is not ready. Please try again."
      );
      setLoading(false);
      return;
    }

    console.log(
      "MSG91 SEND OTP:",
      identifier
    );

    window.sendOtp(
      identifier,

      (data) => {
        console.log(
          "MSG91 OTP SENT:",
          data
        );

        setOtpSent(true);
        setMessage(
          "OTP sent to your mobile number."
        );
        setLoading(false);
      },

      (error) => {
        console.error(
          "MSG91 SEND OTP FAILURE:",
          error,
          JSON.stringify(error)
        );

        setMessage(
          "Unable to send OTP. Please try again."
        );
        setLoading(false);
      }
    );
  } catch (error) {
    console.error(
      "MSG91 SEND OTP ERROR:",
      error
    );

    setMessage(
      "Unable to send OTP. Please try again."
    );

    setLoading(false);
  }
};

  const resendOtp = () => {
    setMessage("");
    setResending(true);

    if (typeof window.retryOtp !== "function") {
      setMessage(
        "OTP service is not ready. Please try again."
      );
      setResending(false);
      return;
    }

    /*
     * null = use the widget's configured resend channel.
     */
    window.retryOtp(
      null,

      (data) => {
        console.log(
          "MSG91 OTP RESENT:",
          data
        );

        setMessage(
          "A new OTP has been sent."
        );
        setResending(false);
      },

      (error) => {
        console.error(
          "MSG91 RESEND FAILURE:",
          error,
          JSON.stringify(error)
        );

        setMessage(
          "Unable to resend OTP. Please try again."
        );
        setResending(false);
      }
    );
  };

  const verifyOtpCode = () => {
    setMessage("");

    const cleanOtp = otp
      .replace(/\D/g, "")
      .slice(0, 4);

    if (cleanOtp.length !== 4) {
      setMessage(
        "Please enter the 4-digit OTP."
      );
      return;
    }

    if (typeof window.verifyOtp !== "function") {
      setMessage(
        "OTP verification service is not ready."
      );
      return;
    }

    setLoading(true);

    console.log(
      "MSG91 VERIFY OTP"
    );

    window.verifyOtp(
      cleanOtp,

     async (data) => {
  console.log("MSG91 OTP VERIFIED RAW:", data);
  console.log(
    "MSG91 OTP VERIFIED JSON:",
    JSON.stringify(data)
  );
  console.log(
    "MSG91 ACCESS TOKEN REF:",
    msg91AccessTokenRef.current
      ? "[PRESENT]"
      : "[EMPTY]"
  );

  const accessToken =
  typeof data?.token === "string"
    ? data.token.trim()
    : typeof data?.message === "string"
    ? data.message.trim()
    : msg91AccessTokenRef.current;

  if (!accessToken) {
          console.error(
            "MSG91 VERIFY SUCCESS WITHOUT ACCESS TOKEN:",
            data
          );

          setMessage(
            "OTP verified, but verification token was not received."
          );
          setLoading(false);
          return;
        }

        try {
          const response = await fetch(
            "/api/customer/verify-otp",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                fullName: fullName.trim(),
                phone: phone
                  .replace(/\D/g, "")
                  .slice(0, 10),
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

onVerified?.({
  id: result.customer.id,
  fullName: fullName.trim(),
  phone: phone
    .replace(/\D/g, "")
    .slice(0, 10),
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

      (error) => {
        console.error(
          "MSG91 VERIFY FAILURE:",
          error,
          JSON.stringify(error)
        );

        setMessage(
          "Incorrect or expired OTP. Please try again."
        );

        setLoading(false);
      }
    );
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

          {!otpSent ? (
            <>
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
<div id="msg91-captcha" />
              {message && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">
                  {message}
                </p>
              )}

              <button
                type="button"
                onClick={startOtp}
                disabled={loading || !msg91Ready}
                className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50"
              >
                {loading
                  ? "Sending OTP..."
                  : msg91Ready
                  ? "Send OTP"
                  : "Loading OTP..."}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Enter OTP
                </label>

                <input
                  type="tel"
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4)
                    )
                  }
                  placeholder="Enter 4-digit OTP"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  autoFocus
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-center text-xl tracking-[0.4em] outline-none focus:border-blue-500"
                />
              </div>

              {message && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">
                  {message}
                </p>
              )}

              <button
                type="button"
                onClick={verifyOtpCode}
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50"
              >
                {loading
                  ? "Verifying..."
                  : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={resendOtp}
                disabled={resending || loading}
                className="w-full text-blue-600 font-semibold py-2 disabled:opacity-50"
              >
                {resending
                  ? "Resending..."
                  : "Resend OTP"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setMessage("");
                  setWidgetInitialized(false);
                }}
                disabled={loading}
                className="w-full text-gray-500 text-sm py-1"
              >
                Change mobile number
              </button>
            </>
          )}

        </div>

        <p className="text-[11px] text-gray-400 text-center mt-5 leading-4">
          Your mobile number is used to identify your HomeEase enquiry.
        </p>

      </div>
    </div>
  );
}
