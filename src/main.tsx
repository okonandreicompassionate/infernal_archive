import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./utils/supabase";

const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof Request
        ? input.url
        : input.toString();
  const isApiRequest = requestUrl.startsWith("/api");
  const target = isApiRequest ? `${apiBase}${requestUrl}` : requestUrl;
  const headers = new Headers(
    init?.headers || (input instanceof Request ? input.headers : undefined),
  );
  if (isApiRequest) {
    const session = await supabase?.auth.getSession();
    if (session?.data.session?.access_token)
      headers.set(
        "Authorization",
        `Bearer ${session.data.session.access_token}`,
      );
  }
  return nativeFetch(target, { ...init, headers });
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
