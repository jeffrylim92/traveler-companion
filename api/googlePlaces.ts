import { API_KEY } from "../constants";

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  distance?: number;
  photoUrl?: string;
  types?: string[]; // ✅ Add types for filtering
}

const BASE_URL = "https://places.googleapis.com/v1";

/**
 * Get coordinates for a search query (exact match)
 */
export async function getCoordinatesForQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(`${BASE_URL}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.location",
      },
      body: JSON.stringify({ textQuery: query }),
    });

    const data = await response.json();
    if (data.places && data.places.length > 0) {
      return {
        lat: data.places[0].location.latitude,
        lng: data.places[0].location.longitude,
      };
    }
    return null;
  } catch (error) {
    console.error("getCoordinatesForQuery error:", error);
    return null;
  }
}

/**
 * Get nearby places based on lat/lng
 */
export async function searchNearby(lat: number, lng: number): Promise<Place[]> {
  try {
    const response = await fetch(`${BASE_URL}/places:searchNearby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.location,places.photos,places.types",
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 3000, // 3km
          },
        },
      }),
    });

    const data = await response.json();

    if (!data.places || !Array.isArray(data.places)) {
      return [];
    }

    return data.places
      .filter((p: any) => p?.location)
      .map((p: any) => ({
        id: p.id ?? crypto.randomUUID(),
        name: p.displayName?.text ?? "Unnamed place",
        lat: p.location.latitude,
        lng: p.location.longitude,
        rating: p.rating ?? undefined,
        photoUrl: p.photos?.length
          ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxWidthPx=400&key=${API_KEY}`
          : undefined,
        types: p.types ?? [],
      }));
  } catch (error) {
    console.error("searchNearby error:", error);
    return [];
  }
}

/**
 * Combined: exact place + nearby attractions
 */
export async function searchPlacesWithNearby(query: string): Promise<Place[]> {
  try {
    const exactCoords = await getCoordinatesForQuery(query);

    if (!exactCoords) {
      console.warn("⚠️ No exact match found, showing fallback nearby.");
      return await searchNearby(5.4164, 100.3327); // Penang fallback
    }

    const nearbyPlaces = await searchNearby(exactCoords.lat, exactCoords.lng);

    const withDistance = nearbyPlaces.map((p) => {
      if (!p.lat || !p.lng) return p;
      const dist = haversineDistance(
        { lat: exactCoords.lat, lng: exactCoords.lng },
        { lat: p.lat, lng: p.lng }
      );
      return { ...p, distance: dist };
    });

    withDistance.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

    return [
      {
        id: "exact",
        name: query,
        lat: exactCoords.lat,
        lng: exactCoords.lng,
        rating: undefined,
        distance: 0,
      },
      ...withDistance,
    ];
  } catch (error) {
    console.error("searchPlacesWithNearby error:", error);
    return [];
  }
}

/**
 * Haversine formula for distance in km
 */
function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function getPlaceReviews(placeId: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=review&key=${API_KEY}`
    );
    const data = await res.json();

    if (data.result?.reviews && Array.isArray(data.result.reviews)) {
      // take latest 5 reviews
      return data.result.reviews.slice(0, 5).map((r: any) => r.text || "");
    }
    return ["No reviews found."];
  } catch (err) {
    console.error("getPlaceReviews error:", err);
    return ["Error fetching reviews."];
  }
}