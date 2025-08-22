import { Linking } from "react-native";
import { Place } from "../api/googlePlaces";

export function handleNavigate(userLocation: { lat: number; lng: number } | null, destination: Place) {
  if (!userLocation) {
    alert("User location not available.");
    return;
  }
  const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  Linking.openURL(url);
}