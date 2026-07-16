import axios from "axios";

export interface GeocodedAddress {
  isValid: boolean;
  city: string;
  zone: string;
  locality: string;
  latitude: string;
  longitude: string;
  formattedAddress: string;
  isApiError?: boolean;
}

/**
 * Geocodifica una dirección o ubicación usando Google Maps Geocoding API.
 * Restringe la búsqueda estrictamente a Colombia para evitar coincidencias internacionales.
 */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.warn("[Geocoding] GOOGLE_MAPS_API_KEY nor GOOGLE_API_KEY is configured.");
    return {
      isValid: false,
      city: "",
      zone: "",
      locality: "",
      latitude: "",
      longitude: "",
      formattedAddress: "",
      isApiError: true
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const response = await axios.get(url, {
      params: {
        address: address,
        components: "country:CO",
        key: apiKey
      }
    });

    const data = response.data;
    if (data.status !== "OK") {
      console.log(`[Geocoding] No se encontraron resultados en Google Maps para: "${address}" (Status: ${data.status})`);
      
      const isApiError = data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT" || data.status === "UNKNOWN_ERROR" || data.status === "INVALID_REQUEST";
      
      return {
        isValid: false,
        city: "",
        zone: "",
        locality: "",
        latitude: "",
        longitude: "",
        formattedAddress: "",
        isApiError
      };
    }

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const components = result.address_components || [];
    const geometry = result.geometry || {};
    const lat = geometry.location?.lat;
    const lng = geometry.location?.lng;

    let city = "Bogotá";
    let zone = "";
    let locality = "";

    // 1. Extraer ciudad (locality o colloquial_area)
    const localityComponent = components.find((c: any) => 
      c.types.includes("locality")
    );
    const adminArea2Component = components.find((c: any) => 
      c.types.includes("administrative_area_level_2")
    );
    const colloquialComponent = components.find((c: any) => 
      c.types.includes("colloquial_area")
    );

    if (localityComponent) {
      city = localityComponent.long_name;
    } else if (colloquialComponent) {
      city = colloquialComponent.long_name;
    } else if (adminArea2Component) {
      city = adminArea2Component.long_name;
    }

    // 2. Extraer zona / barrio / localidad
    const neighborhoodComponent = components.find((c: any) => 
      c.types.includes("neighborhood")
    );
    const sublocalityComponent = components.find((c: any) => 
      c.types.includes("sublocality_level_1") || c.types.includes("sublocality")
    );

    if (neighborhoodComponent) {
      zone = neighborhoodComponent.long_name;
    } else if (sublocalityComponent) {
      zone = sublocalityComponent.long_name;
    } else {
      // Fallback: usar el primer componente de la dirección como barrio
      zone = components[0]?.long_name || "";
    }

    if (sublocalityComponent) {
      locality = sublocalityComponent.long_name;
    } else {
      locality = city;
    }

    console.log(`[Geocoding] Google Maps resolvió: "${address}" ➔ Ciudad: "${city}", Zona: "${zone}", Loc: "${locality}", Lat: ${lat}, Lng: ${lng}`);

    return {
      isValid: true,
      city,
      zone,
      locality,
      latitude: lat !== undefined ? String(lat) : "",
      longitude: lng !== undefined ? String(lng) : "",
      formattedAddress: result.formatted_address || ""
    };
  } catch (err: any) {
    console.error("[Geocoding] Error en geocodeAddress:", err.message);
    return {
      isValid: false,
      city: "",
      zone: "",
      locality: "",
      latitude: "",
      longitude: "",
      formattedAddress: "",
      isApiError: true
    };
  }
}
