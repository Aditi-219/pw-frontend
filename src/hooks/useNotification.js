import { useCallback, useState } from "react";

/**
 * Shared hook around the existing <Notification /> component so every
 * page gets identical success/error/warning/info toast behavior without
 * re-implementing the same useState + timer logic 50+ times.
 *
 * Usage:
 *   const { notification, notify, closeNotification } = useNotification();
 *   notify.success("User created");
 *   notify.error(getErrorMessage(err));
 *   <Notification {...notification} onClose={closeNotification} />
 */
export default function useNotification() {
  const [notification, setNotification] = useState({
    isVisible: false,
    variant: "info",
    title: "",
    message: "",
  });

  const show = useCallback((variant, message, title) => {
    setNotification({ isVisible: true, variant, message, title });
  }, []);

  const closeNotification = useCallback(() => {
    setNotification((n) => ({ ...n, isVisible: false }));
  }, []);

  const notify = {
    success: (message, title) => show("success", message, title),
    error: (message, title) => show("error", message, title),
    warning: (message, title) => show("warning", message, title),
    info: (message, title) => show("info", message, title),
  };

  return { notification, notify, closeNotification };
}
