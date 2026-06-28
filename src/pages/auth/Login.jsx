import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import api from "../../services/api";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [captcha, setCaptcha] = useState("");
  const [locked, setLocked] = useState(false);

  const showCaptcha = failedAttempts >= 3;
  const captchaCode = "7K2M";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (locked) return;

    if (showCaptcha && captcha.toUpperCase() !== captchaCode) {
      setError("Invalid CAPTCHA");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const data = response.data;

      if (!data.success) {
        setError(data.message || "Login failed");
        return;
      }

      if (data.access_token) {
        localStorage.setItem(
          "access_token",
          data.access_token
        );
      }

      if (data.refresh_token) {
        localStorage.setItem(
          "refresh_token",
          data.refresh_token
        );
      }

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        if (data.user.email) {
          localStorage.setItem(
            "user_email",
            data.user.email
          );
        }
      }

      if (remember) {
        localStorage.setItem(
          "finz_remember_device",
          "true"
        );
      } else {
        localStorage.removeItem(
          "finz_remember_device"
        );
      }

      if (data.mfa_required) {
        navigate("/mfa");
        return;
      }

      localStorage.setItem(
        "finz_authenticated",
        "true"
      );

      navigate("/dashboard");
    } catch (err) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= 5) {
        setLocked(true);
        setError(
          "Account locked due to multiple failed login attempts."
        );
      } else {
        setError(
          err.response?.data?.message ||
            `Invalid credentials (${nextAttempts}/5 attempts)`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img
          src="/logo.png"
          alt="FinZ"
          className="auth-card__logo"
        />

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
            placeholder="admin@finz.com"
            disabled={locked}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
            disabled={locked}
          />

          {showCaptcha && !locked && (
            <div className="auth-captcha">
              <span className="auth-captcha__code">
                {captchaCode}
              </span>

              <Input
                label="Enter CAPTCHA"
                value={captcha}
                onChange={(e) =>
                  setCaptcha(e.target.value)
                }
                placeholder="Type code above"
              />
            </div>
          )}

          <label className="auth-form__remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) =>
                setRemember(e.target.checked)
              }
              disabled={locked}
            />
            Remember this device
          </label>

          {error && (
            <p className="auth-form__error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={locked}
            className="auth-form__submit"
          >
            {locked ? "Locked" : "Sign In"}
          </Button>
        </form>

        <Link
          to="/forgot-password"
          className="auth-card__link"
        >
          Forgot password?
        </Link>

        <div className="auth-sso">
          <p className="auth-sso__label">
            SSO (coming soon)
          </p>

          <div className="auth-sso__buttons">
            <button
              type="button"
              disabled
              className="auth-sso__btn"
            >
              Google
            </button>

            <button
              type="button"
              disabled
              className="auth-sso__btn"
            >
              Microsoft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}