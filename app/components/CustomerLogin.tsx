"use client";

import { useEffect, useRef, useState } from "react";

type Customer = { id: string; fullName: string; phone: string };

declare global {
  interface Window {
    initSendOTP?: (config: { widgetId: string; tokenAuth: string; exposeMethods?: boolean; captchaRenderId?: string; success: (data: { token?: string; message?: string; [key: string]: unknown }) => void; failure: (error: unknown) => void }) => void;
    isCaptchaVerified?: () => boolean;
    sendOtp?: (identifier: string, success?: (data: unknown) => void, failure?: (error: unknown) => void) => void;
    retryOtp?: (channel: string | null, success?: (data: unknown) => void, failure?: (error: unknown) => void, token?: string) => void;
    verifyOtp?: (otp: string | number, success?: (data: { token?: string; message?: string; [key: string]: unknown }) => void, failure?: (error: unknown) => void, token?: string) => void;
  }
}

function normalizeIndianPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export default function CustomerLogin({ onVerified, onClose }: { onVerified?: (customer: Customer) => void; onClose?: () => void }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const captchaId = "msg91-captcha";
  const accessToken = useRef("");

  const updateAccessToken = (data: unknown) => {
    if (data && typeof data === "object" && "token" in data) {
      const token = (data as { token?: unknown }).token;
      if (typeof token === "string" && token.trim()) accessToken.current = token.trim();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        if (!window.initSendOTP) {
          const existing = document.querySelector('script[data-msg91-otp="true"]') as HTMLScriptElement | null;

          await new Promise<void>((resolve, reject) => {
            if (window.initSendOTP) {
              resolve();
              return;
            }

            if (existing) {
              const checkReady = () => {
                if (window.initSendOTP) {
                  resolve();
                } else {
                  reject(new Error("MSG91 SDK did not expose its OTP methods"));
                }
              };

              existing.addEventListener("load", checkReady, { once: true });
              existing.addEventListener(
                "error",
                () => reject(new Error("MSG91 SDK failed to load")),
                { once: true }
              );

              return;
            }

            const script = document.createElement("script");
            script.src = "https://verify.msg91.com/otp-provider.js";
            script.async = true;
            script.dataset.msg91Otp = "true";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("MSG91 SDK failed to load"));
            document.head.appendChild(script);
          });
        }
        const response = await fetch("/api/customer/otp-config", { cache: "no-store" });
        const config = await response.json();
        if (!response.ok || !config?.token || !window.initSendOTP) throw new Error("MSG91 OTP service is not configured correctly.");
        window.initSendOTP({
          widgetId: config.widgetId,
          tokenAuth: config.token,
          exposeMethods: true,
          captchaRenderId: captchaId,
          success: (data) => { if (typeof data?.token === "string") accessToken.current = data.token.trim(); },
          failure: (error) => console.error("MSG91 WIDGET ERROR:", error),
        });
        window.setTimeout(() => { if (!cancelled && typeof window.sendOtp === "function" && typeof window.verifyOtp === "function") setReady(true); }, 700);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load OTP service.");
      }
    };
    initialize();
    return () => { cancelled = true; };
  }, [captchaId]);

  const sendOtp = () => {
    setMessage("");
    const cleanPhone = normalizeIndianPhone(phone);
    if (!fullName.trim()) return setMessage("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) return setMessage("Please enter a valid Indian mobile number.");
    if (!ready || !window.sendOtp) return setMessage("OTP service is still loading. Please try again.");
    if (typeof window.isCaptchaVerified === "function" && !window.isCaptchaVerified()) return setMessage("Please complete the captcha first.");
    setLoading(true);
    window.sendOtp(`91${cleanPhone}`, (data) => { updateAccessToken(data); setOtpSent(true); setMessage("OTP sent to your mobile number."); setLoading(false); }, (error) => { console.error("MSG91 SEND OTP ERROR:", error); setMessage("Unable to send OTP. Please try again."); setLoading(false); });
  };

  const verifyOtp = () => {
    const cleanPhone = normalizeIndianPhone(phone);
    const cleanOtp = otp.replace(/\D/g, "");
    if (cleanOtp.length !== 4) return setMessage("Please enter the 4-digit OTP.");
    if (!window.verifyOtp) return setMessage("OTP service is not ready.");
    setLoading(true);
    window.verifyOtp(cleanOtp, async (data) => {
      const token = typeof data?.token === "string" ? data.token.trim() : typeof data?.message === "string" ? data.message.trim() : accessToken.current;
      if (!token) { setMessage("OTP verified, but no verification token was received."); setLoading(false); return; }
      try {
        const response = await fetch("/api/customer/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: fullName.trim(), phone: cleanPhone, accessToken: token }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || "Unable to verify your mobile number.");
        onVerified?.({ id: result.customer.id, fullName: result.customer.fullName, phone: cleanPhone });
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to complete verification."); } finally { setLoading(false); }
    }, () => { setMessage("Incorrect or expired OTP. Please try again."); setLoading(false); });
  };

  const resendOtp = () => {
    if (!window.retryOtp) return setMessage("OTP service is not ready.");
    setResending(true);
    window.retryOtp("11", (data) => { updateAccessToken(data); setResending(false); setMessage("A new OTP has been sent."); }, () => { setResending(false); setMessage("Unable to resend OTP."); });
  };

  return <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center"><div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"><div className="flex items-center justify-between mb-6"><div><h2 className="text-xl font-bold text-gray-950">Login to continue</h2><p className="text-sm text-gray-800 mt-1">Verify your mobile number to continue.</p></div>{onClose && <button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-gray-100 text-gray-900 text-xl" aria-label="Close">×</button>}</div>{!otpSent ? <div className="space-y-4"><label className="block text-sm font-semibold text-gray-950">Your name<input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Enter your name" className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3 text-gray-950 placeholder:text-gray-600" /></label><label className="block text-sm font-semibold text-gray-950">Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Enter Indian mobile number" inputMode="tel" className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3 text-gray-950 placeholder:text-gray-600" /></label><div id={captchaId} className="min-h-[78px]" />{message && <p className="text-sm font-medium text-gray-950 bg-gray-100 border border-gray-300 rounded-xl p-3">{message}</p>}<button type="button" onClick={sendOtp} disabled={loading || !ready} className="w-full bg-blue-700 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50">{loading ? "Sending OTP..." : ready ? "Send OTP" : "Loading OTP..."}</button></div> : <div className="space-y-4"><label className="block text-sm font-semibold text-gray-950">One-time password<input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Enter 4-digit OTP" inputMode="numeric" className="mt-1 w-full border border-gray-400 rounded-xl px-4 py-3 text-center text-xl text-gray-950 placeholder:text-gray-600" /></label>{message && <p className="text-sm font-medium text-gray-950 bg-gray-100 border border-gray-300 rounded-xl p-3">{message}</p>}<button type="button" onClick={verifyOtp} disabled={loading} className="w-full bg-blue-700 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50">{loading ? "Verifying..." : "Verify OTP"}</button><button type="button" onClick={resendOtp} disabled={resending || loading} className="w-full text-blue-900 font-semibold py-2">{resending ? "Resending..." : "Resend OTP"}</button><button type="button" onClick={() => { setOtpSent(false); setOtp(""); setMessage(""); }} className="w-full text-gray-900 text-sm py-1">Change mobile number</button></div>}</div></div>;
}
