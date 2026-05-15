import { makeRequest, GeocodingResult, LatLng } from "./map";

export type GeocodedAddress = {
  addressCity: string | null;
  addressLocality: string | null;
  addressNeighborhood: string | null;
  formattedAddress: string | null;
  coordinates: LatLng | null;
};

/**
 * Geocode a string address into structured geographic data using Nominatim (OpenStreetMap)
 */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  if (!address || address.trim().length === 0) return null;

  try {
    // Attempt Google Maps Geocoding if credentials exist
    try {
      const { baseUrl, apiKey } = { 
        baseUrl: process.env.BUILT_IN_FORGE_API_URL, 
        apiKey: process.env.BUILT_IN_FORGE_API_KEY 
      };
      
      if (baseUrl && apiKey) {
        return await geocodeWithGoogle(address);
      }
    } catch (e) {
      console.warn("[Geocoding] Google Maps Geocoding skipped or failed, falling back to Nominatim.");
    }

    // Fallback: Nominatim (OpenStreetMap)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ", Colombia")}&format=json&addressdetails=1&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VecyNetwork/1.0 (eduardo@vecy.network)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim request failed: ${response.status}`);
    }

    const results = await response.json() as any[];
    if (results.length === 0) {
      console.warn(`[Geocoding] No Nominatim results for: ${address}`);
      return null;
    }

    const result = results[0];
    const addr = result.address;

    return {
      addressCity: addr.city || addr.town || addr.village || addr.county || null,
      addressLocality: addr.suburb || addr.borough || addr.district || null,
      addressNeighborhood: addr.neighbourhood || addr.residential || addr.quarter || null,
      formattedAddress: result.display_name,
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      },
    };
  } catch (error) {
    console.error("[Geocoding] Error:", error);
    return null;
  }
}

async function geocodeWithGoogle(address: string): Promise<GeocodedAddress | null> {
  const response = await makeRequest<GeocodingResult>("/maps/api/geocode/json", {
    address: `${address}, Colombia`,
    language: "es",
  });

  if (response.status !== "OK" || response.results.length === 0) {
    return null;
  }

  const result = response.results[0];
  const components = result.address_components;

  let city: string | null = null;
  let locality: string | null = null;
  let neighborhood: string | null = null;

  for (const component of components) {
    if (component.types.includes("locality") || component.types.includes("administrative_area_level_2")) {
      city = component.long_name;
    }
    if (component.types.includes("sublocality_level_1")) {
      locality = component.long_name;
    }
    if (component.types.includes("neighborhood") || component.types.includes("sublocality_level_2")) {
      neighborhood = component.long_name;
    }
  }

  return {
    addressCity: city,
    addressLocality: locality,
    addressNeighborhood: neighborhood,
    formattedAddress: result.formatted_address,
    coordinates: result.geometry.location,
  };
}
