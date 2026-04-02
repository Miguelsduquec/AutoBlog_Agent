import { useLocation, useNavigate } from "react-router-dom";
import { isApiError } from "../api/client";

export function useAccessGateRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  return (error: unknown): boolean => {
    if (!isApiError(error)) {
      return false;
    }

    const next = encodeURIComponent(`${location.pathname}${location.search}`);

    if (error.code === "authentication_required") {
      navigate(`/login?next=${next}`);
      return true;
    }

    if (error.code === "subscription_required") {
      navigate(`/pricing?next=${next}`);
      return true;
    }

    return false;
  };
}
