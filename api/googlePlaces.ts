import { API_KEY } from "../constants";
import { Linking } from "react-native";

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  distance?: number;
  photoUrl?: string;
  types?: string[];
}

const LEGACY_BASE_URL = "https://maps.googleapis.com/maps/api/place";

/**
 * Get coordinates for a search query (exact match)
 */
export async function getCoordinatesForQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `${LEGACY_BASE_URL}/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=geometry&key=${API_KEY}`
    );
    const data = await response.json();
    if (data.candidates && data.candidates.length > 0) {
      return {
        lat: data.candidates[0].geometry.location.lat,
        lng: data.candidates[0].geometry.location.lng,
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
    const response = await fetch(
      `${LEGACY_BASE_URL}/nearbysearch/json?location=${lat},${lng}&radius=3000&type=point_of_interest&key=${API_KEY}`
    );
    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((p: any) => ({
      id: p.place_id,
      name: p.name ?? "Unnamed place",
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      rating: p.rating ?? undefined,
      photoUrl: p.photos?.length
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photos[0].photo_reference}&key=${API_KEY}`
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
    const exactCoordsRes = await fetch(
      `${LEGACY_BASE_URL}/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=geometry,place_id&key=${API_KEY}`
    );
    const exactData = await exactCoordsRes.json();

    if (!exactData.candidates || exactData.candidates.length === 0) {
      console.warn("⚠️ No exact match found, showing fallback nearby.");
      return await searchNearby(5.4164, 100.3327); // Penang fallback
    }

    const exactCandidate = exactData.candidates[0];
    const exactCoords = {
      lat: exactCandidate.geometry.location.lat,
      lng: exactCandidate.geometry.location.lng,
    };
    const exactPlaceId = exactCandidate.place_id;

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
        id: exactPlaceId, // use real place_id here
        name: query,
        lat: exactCoords.lat,
        lng: exactCoords.lng,
        rating: undefined,
        distance: 0,
        types: [],
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

/**
 * Open place in Google Maps (reviews, details, etc.)
 */
export function openPlaceInMaps(placeId: string) {
  const url = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  Linking.openURL(url);
}
