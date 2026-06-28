import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import api from "../../services/api";
import "./ForgotPassword.css";

const STEPS = ["email", "otp", "password"];

function getPasswordStrength(pw) {
  let score = 0;

  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) {
    return {
      label: "Weak",
      level: 1,
      color: "var(--color-danger)",
    };
  }

  if (score <= 4) {
    return {
      label: "Medium",
      level: 2,
      color: "var(--color-accent)",
    };
  }

  return {
    label: "Strong",
    level: 3,
    color: "var(--color-success)",
  };
}

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email");

  const [email, setEmail] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [timer, setTimer] = useState(900);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (step === "otp" && timer > 0) {
      const t = setInterval(() => {
        setTimer((s) => s - 1);
      }, 1000);

      return () => clearInterval(t);
    }

    return undefined;
  }, [step, timer]);

  const strength = getPasswordStrength(password);

  const mins = Math.floor(timer / 60);
  const secs = String(timer % 60).padStart(2, "0");

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await api.post(
        "/auth/forgot-password",
        {
          email,
        }
      );

      if (response.data.success) {
        setStep("otp");
        setTimer(900);
      } else {
        setError(
          response.data.message ||
            "Failed to send reset code"
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to send reset code"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();

    if (mobileOtp.length < 4) {
      setError(
        "Please enter the reset code sent to your email"
      );
      return;
    }

    setError("");
    setStep("password");
  };

  const handleReset = async (e) => {
    e.preventDefault();

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (strength.level < 2) {
      setError("Password too weak");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post(
        "/auth/reset-password",
        {
          email,
          token: mobileOtp,
          password,
          password_confirmation: confirm,
        }
      );

      if (response.data.success) {
        alert(
          "Password reset successful. Please login again."
        );

        navigate("/login");
      } else {
        setError(
          response.data.message ||
            "Password reset failed"
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Password reset failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <img
          src="/logo.png"
          alt="FinZ"
          className="forgot-card__logo"
        />

        <h1 className="forgot-card__title">
          Reset Password
        </h1>

        <p className="forgot-card__subtitle">
          Screen 03 — Email + OTP Verification
        </p>

        <div className="forgot-steps">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`forgot-steps__item ${
                step === s
                  ? "forgot-steps__item--active"
                  : ""
              } ${
                STEPS.indexOf(step) > i
                  ? "forgot-steps__item--done"
                  : ""
              }`}
            >
              {i + 1}. {s}
            </span>
          ))}
        </div>

        {step === "email" && (
          <form
            onSubmit={handleEmailSubmit}
            className="forgot-form"
          >
            <Input
              label="Registered Email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

            <p className="forgot-note">
              A password reset code will be sent
              to your registered email.
            </p>

            {error && (
              <p className="forgot-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              loading={loading}
              className="forgot-form__btn"
            >
              Send Reset Code
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form
            onSubmit={handleOtpSubmit}
            className="forgot-form"
          >
            <p className="forgot-timer">
              Code expires in {mins}:{secs}
            </p>

            <Input
              label="Reset Code"
              value={mobileOtp}
              onChange={(e) =>
                setMobileOtp(e.target.value)
              }
              required
            />

            {error && (
              <p className="forgot-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="forgot-form__btn"
            >
              Continue
            </Button>
          </form>
        )}

        {step === "password" && (
          <form
            onSubmit={handleReset}
            className="forgot-form"
          >
            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <div className="forgot-strength">
              <div className="forgot-strength__bar">
                <div
                  className="forgot-strength__fill"
                  style={{
                    width: `${
                      (strength.level / 3) * 100
                    }%`,
                    background: strength.color,
                  }}
                />
              </div>

              <span
                style={{
                  color: strength.color,
                }}
              >
                {strength.label}
              </span>
            </div>

            <p className="forgot-note">
              Cannot reuse last 5 passwords
              (validated by server).
            </p>

            <Input
              label="Confirm Password"
              type="password"
              value={confirm}
              onChange={(e) =>
                setConfirm(e.target.value)
              }
              required
            />

            {error && (
              <p className="forgot-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              loading={loading}
              className="forgot-form__btn"
            >
              Reset Password
            </Button>
          </form>
        )}

        <Link
          to="/login"
          className="forgot-back"
        >
          ← Back to login
        </Link>
      </div>
    </div>
  );
}