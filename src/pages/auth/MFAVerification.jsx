import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import api from "../../services/api";
import "./MFAVerification.css";

export default function MFAVerification() {
  const navigate = useNavigate();

  const [digits, setDigits] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const [mode, setMode] = useState("totp");
  const [trustedDevice, setTrustedDevice] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, [mode]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const next = [...digits];
    next[index] = value;

    setDigits(next);

    if (value && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (
      e.key === "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = digits.join("");

    if (!showBackup && otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const payload = showBackup
        ? { recovery_code: backupCode }
        : { otp };

      const response = await api.post(
        "/auth/mfa/verify",
        payload
      );

      const data = response.data;

      if (!data.success) {
        setError(
          data.message ||
            "OTP verification failed"
        );
        return;
      }

      if (trustedDevice) {
        localStorage.setItem(
          "finz_trusted_mfa",
          String(Date.now())
        );
      }

      if (data.access_token) {
        localStorage.setItem(
          "access_token",
          data.access_token
        );
      }

      localStorage.setItem(
        "finz_authenticated",
        "true"
      );

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "OTP verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResending(true);
      setError("");
      setMessage("");

      const response = await api.post(
        "/auth/mfa/resend"
      );

      const data = response.data;

      if (data.success) {
        setMessage(
          data.message ||
            "OTP resent successfully"
        );
      } else {
        setError(
          data.message ||
            "Failed to resend OTP"
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to resend OTP"
      );
    } finally {
      setResending(false);
    }
  };

  const handleSmsOtp = () => {
    setMode("sms");
    setDigits(["", "", "", "", "", ""]);
    setError("");
    setMessage("");
  };

  return (
    <div className="mfa-page">
      <div className="mfa-card">
        <img
          src="/logo.png"
          alt="FinZ"
          className="mfa-card__logo"
        />

        <h1 className="mfa-card__title">
          Two-Factor Verification
        </h1>

        <p className="mfa-card__subtitle">
          Screen 02 — Mandatory MFA for Super Admin
        </p>

        <div className="mfa-tabs">
          <button
            type="button"
            className={
              mode === "totp"
                ? "mfa-tabs__active"
                : ""
            }
            onClick={() => setMode("totp")}
          >
            Authenticator (TOTP)
          </button>

          <button
            type="button"
            className={
              mode === "sms"
                ? "mfa-tabs__active"
                : ""
            }
            onClick={handleSmsOtp}
          >
            SMS OTP
          </button>
        </div>

        {!showBackup ? (
          <>
            <p className="mfa-hint">
              {mode === "totp"
                ? "Enter 6-digit code sent to your registered email"
                : "OTP sent to registered mobile"}
            </p>

            <div className="mfa-inputs">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) =>
                    (refs.current[i] = el)
                  }
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) =>
                    handleChange(
                      i,
                      e.target.value
                    )
                  }
                  onKeyDown={(e) =>
                    handleKeyDown(i, e)
                  }
                  className="mfa-inputs__box"
                />
              ))}
            </div>
          </>
        ) : (
          <div className="mfa-backup-form">
            <label className="mfa-backup-form__label">
              Recovery Code
            </label>

            <input
              type="text"
              value={backupCode}
              onChange={(e) =>
                setBackupCode(
                  e.target.value
                )
              }
              className="mfa-backup-form__input"
              placeholder="XXXX-XXXX-XXXX"
            />
          </div>
        )}

        <label className="mfa-trusted">
          <input
            type="checkbox"
            checked={trustedDevice}
            onChange={(e) =>
              setTrustedDevice(
                e.target.checked
              )
            }
          />
          Trust this device (skip MFA for
          30 days)
        </label>

        {error && (
          <p className="auth-form__error">
            {error}
          </p>
        )}

        {message && (
          <p className="auth-form__success">
            {message}
          </p>
        )}

        <Button
          onClick={handleVerify}
          className="mfa-submit"
          loading={loading}
        >
          Verify & Continue
        </Button>

        <div className="mfa-links">
          <button
            type="button"
            onClick={() =>
              setShowBackup(!showBackup)
            }
          >
            {showBackup
              ? "Use authenticator instead"
              : "Use backup recovery code"}
          </button>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resending}
          >
            {resending
              ? "Sending..."
              : "Resend OTP"}
          </button>

          <button type="button">
            Regenerate recovery codes
          </button>
        </div>

        <p className="mfa-audit">
          MFA events are logged in audit
          trail
        </p>
      </div>
    </div>
  );
}