import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * SCROLL TO TOP UTILITY
 * Ensures that every time the route changes, the window scrolls back to (0,0).
 */
export default function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}
