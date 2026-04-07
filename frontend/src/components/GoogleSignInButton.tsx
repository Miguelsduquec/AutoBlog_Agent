import { useEffect, useRef, useState } from "react";
import { GoogleAuthInput } from "../types";

type GoogleSignInButtonProps = {
  onAuthenticate: (payload: GoogleAuthInput) => Promise<void>;
  onError?: (message: string) => void;
  email?: string;
  name?: string;
  disabled?: boolean;
};

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccounts = {
  id: {
    initialize: (options: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
    }) => void;
    renderButton: (
      element: HTMLElement,
      options: {
        theme: "outline" | "filled_blue" | "filled_black";
        size: "large" | "medium" | "small";
        text: string;
        shape: "pill" | "rectangular" | "circle" | "square";
        width?: number;
        logo_alignment?: "left" | "center";
      }
    ) => void;
  };
};

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts;
    };
  }
}

const GOOGLE_AUTH_MODE = import.meta.env.VITE_GOOGLE_AUTH_MODE ?? "disabled";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_SCRIPT_ID = "google-identity-services";

function buildMockPayload(email?: string, name?: string): GoogleAuthInput {
  const normalizedEmail = EMAIL_PATTERN.test(String(email ?? "").trim())
    ? String(email).trim().toLowerCase()
    : `google-user-${Date.now()}@example.com`;

  return {
    credential: `mock-google:${normalizedEmail}`,
    email: normalizedEmail,
    name: String(name ?? "").trim() || "Google User"
  };
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Google sign-in.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google sign-in."));
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({
  onAuthenticate,
  onError,
  email,
  name,
  disabled = false
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(GOOGLE_AUTH_MODE === "live");

  useEffect(() => {
    if (GOOGLE_AUTH_MODE !== "live" || !GOOGLE_CLIENT_ID || !buttonRef.current) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) {
          return;
        }

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (!response.credential) {
              onError?.("Google sign-in did not return a credential.");
              return;
            }

            void onAuthenticate({ credential: response.credential }).catch((error) => {
              onError?.(error instanceof Error ? error.message : "Unable to continue with Google.");
            });
          }
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 360,
          logo_alignment: "left"
        });
      })
      .catch((error) => {
        if (!cancelled) {
          onError?.(error instanceof Error ? error.message : "Unable to load Google sign-in.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onAuthenticate, onError]);

  if (GOOGLE_AUTH_MODE === "mock") {
    return (
      <button
        className="button google-button"
        data-testid="google-auth-button"
        disabled={disabled}
        onClick={() => {
          void onAuthenticate(buildMockPayload(email, name)).catch((error) => {
            onError?.(error instanceof Error ? error.message : "Unable to continue with Google.");
          });
        }}
        type="button"
      >
        Continue with Google
      </button>
    );
  }

  if (GOOGLE_AUTH_MODE !== "live" || !GOOGLE_CLIENT_ID) {
    return (
      <button className="button secondary google-button" disabled type="button">
        Google sign-in unavailable
      </button>
    );
  }

  return (
    <div className={`google-auth-shell ${disabled ? "disabled" : ""}`}>
      <div className="google-auth-slot" data-testid="google-auth-button" ref={buttonRef} />
      {loading ? <span className="muted-copy">Loading Google sign-in…</span> : null}
    </div>
  );
}
