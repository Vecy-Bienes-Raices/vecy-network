export { COOKIE_NAME, ONE_YEAR_MS, VECY_VERSION, VECY_VERSION_LABEL, VECY_CORE_VERSION_LABEL } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  return "/login";
};
