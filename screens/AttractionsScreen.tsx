import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Button,
  Linking,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { searchPlacesWithNearby, Place, getPlaceReviews } from "../api/googlePlaces";

type Filters = {
  types: string[];
  ratings: number[];
  maxDistance: number; // 0 = no limit
};

const PLACE_TYPES = ["restaurant", "museum", "park", "shopping_mall", "cafe"];
const STAR_RATINGS = [1, 2, 3, 4, 5];
const DISTANCES = [1, 3, 5, 10];

export default function AttractionsScreen() {
  const [query, setQuery] = useState("");
  const [currentQuery, setCurrentQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [pinPlace, setPinPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filters, setFilters] = useState<Filters>({
    types: [],
    ratings: [],
    maxDistance: 0,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedPlaceReview, setSelectedPlaceReview] = useState<{ name: string; reviews: string[] } | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
    })();
  }, []);

  const toggleType = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  };

  const toggleRating = (r: number) => {
    setFilters((prev) => ({
      ...prev,
      ratings: prev.ratings.includes(r) ? prev.ratings.filter((x) => x !== r) : [...prev.ratings, r],
    }));
  };

  const toggleDistance = (d: number) => {
    setFilters((prev) => ({
      ...prev,
      maxDistance: prev.maxDistance === d ? 0 : d, // 0 = no limit
    }));
  };

  const applyFiltersToPlaces = (places: Place[]): Place[] => {
    const filtered = places.filter((p) => {
      const typeMatch =
        filters.types.length === 0 ||
        (p.types && p.types.some((t) => filters.types.includes(t)));

      const ratingMatch =
        filters.ratings.length === 0 ||
        (p.rating !== undefined && filters.ratings.some((r) => p.rating! >= r));

      const distanceMatch =
        filters.maxDistance === 0 || p.distance === undefined || p.distance <= filters.maxDistance;

      return typeMatch && ratingMatch && distanceMatch;
    });

    return filtered.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setCurrentQuery(query);
    try {
      let results = await searchPlacesWithNearby(query);
      results = applyFiltersToPlaces(results);
      setPlaces(results);
      setPinPlace(results[0] ?? null);
    } catch (err) {
      console.error("Search failed", err);
      setPlaces([]);
      setPinPlace(null);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    setShowFilter(false);
    if (!currentQuery) return;
    setLoading(true);
    try {
      let results = await searchPlacesWithNearby(currentQuery);
      results = applyFiltersToPlaces(results);
      setPlaces(results);
      setPinPlace(results[0] ?? null);
    } catch (err) {
      console.error("Apply filters failed", err);
      setPlaces([]);
      setPinPlace(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (destination: Place) => {
    if (!userLocation) {
      alert("User location not available.");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    Linking.openURL(url);
  };

  const openReview = async (place: Place) => {
    try {
      const reviews = await getPlaceReviews(place.id);
      setSelectedPlaceReview({ name: place.name, reviews });
      setShowReviewModal(true);
    } catch (err) {
      console.error("Failed to fetch reviews", err);
      setSelectedPlaceReview({ name: place.name, reviews: ["Failed to load reviews."] });
      setShowReviewModal(true);
    }
  };

  const renderItem = ({ item }: { item: Place }) => (
    <TouchableOpacity
      style={[styles.card, pinPlace?.id === item.id && styles.cardSelected]}
      onPress={() => setPinPlace(item)}
    >
      {item.photoUrl && <Image source={{ uri: item.photoUrl }} style={styles.photo} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.name}</Text>
        {item.rating !== undefined && <Text style={styles.rating}>⭐ {item.rating.toFixed(1)}</Text>}
        {item.distance !== undefined && item.distance > 0 && (
          <Text style={styles.distance}>{item.distance.toFixed(1)} km from exact match</Text>
        )}
        <View style={{ flexDirection: "row", marginTop: 6 }}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleNavigate(item)}>
            <Text style={styles.actionButtonText}>Navigate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: "#ff5722" }]} onPress={() => openReview(item)}>
            <Text style={styles.actionButtonText}>Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search for an attraction (e.g., Komtar Penang)"
        placeholderTextColor="#888"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
      />

      <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilter(true)}>
        <Text style={{ color: "#fff", fontWeight: "600" }}>Filters</Text>
      </TouchableOpacity>

      {/* Filters Modal */}
      <Modal visible={showFilter} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: "600", marginBottom: 8 }}>Filter by Type:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {PLACE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeButton, filters.types.includes(t) && styles.typeButtonSelected]}
                  onPress={() => toggleType(t)}
                >
                  <Text style={{ color: filters.types.includes(t) ? "#fff" : "#000" }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontWeight: "600", marginTop: 12 }}>Minimum Rating:</Text>
            <View style={{ flexDirection: "row", marginVertical: 6 }}>
              {STAR_RATINGS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.ratingButton, filters.ratings.includes(r) && styles.ratingButtonSelected]}
                  onPress={() => toggleRating(r)}
                >
                  <Text>{r}⭐</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontWeight: "600", marginTop: 12 }}>Max Distance (km):</Text>
            <View style={{ flexDirection: "row", marginVertical: 6 }}>
              {DISTANCES.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.distanceButton, filters.maxDistance === d && styles.distanceButtonSelected]}
                  onPress={() => toggleDistance(d)}
                >
                  <Text>{d} km</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="Apply Filters" onPress={applyFilters} />
            <Button title="Close" onPress={() => setShowFilter(false)} />
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: "600", fontSize: 18, marginBottom: 8 }}>
              Reviews for {selectedPlaceReview?.name}
            </Text>
            <FlatList
              data={selectedPlaceReview?.reviews ?? []}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item }) => <Text style={{ marginBottom: 6 }}>• {item}</Text>}
            />
            <Button title="Close" onPress={() => setShowReviewModal(false)} />
          </View>
        </View>
      </Modal>

      {loading ? (
        <Text style={styles.loading}>Searching…</Text>
      ) : (
        <>
          {pinPlace && (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: pinPlace.lat,
                longitude: pinPlace.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              <Marker
                key={pinPlace.id}
                coordinate={{ latitude: pinPlace.lat, longitude: pinPlace.lng }}
                title={pinPlace.name}
                pinColor="red"
              />
            </MapView>
          )}

          <FlatList
            data={places}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              !loading && <Text style={styles.empty}>No places found. Try another search.</Text>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  input: {
    marginTop: 50,
    marginHorizontal: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  filterButton: {
    margin: 12,
    padding: 10,
    backgroundColor: "#6e57c5",
    borderRadius: 8,
    alignItems: "center",
  },
  loading: { textAlign: "center", marginTop: 20, fontSize: 16 },
  map: { height: 200, margin: 12, borderRadius: 8 },
  list: { paddingBottom: 50 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 10,
    borderRadius: 8,
    elevation: 1,
  },
  cardSelected: { borderWidth: 2, borderColor: "#6e57c5" },
  photo: { width: 60, height: 60, borderRadius: 6, marginRight: 10 },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  rating: { fontSize: 14, color: "#444" },
  distance: { fontSize: 12, color: "#666" },
  actionButton: {
    marginTop: 6,
    marginRight: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#6e57c5",
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  actionButtonText: { color: "#fff", fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 20, fontSize: 16, color: "#777" },
  modalContainer: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  modalContent: { backgroundColor: "#fff", margin: 20, borderRadius: 8, padding: 16 },
  typeButton: {
    padding: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    margin: 4,
  },
  typeButtonSelected: { backgroundColor: "#6e57c5", borderColor: "#6e57c5" },
  ratingButton: {
    padding: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    margin: 4,
  },
  ratingButtonSelected: { backgroundColor: "#6e57c5", borderColor: "#6e57c5" },
  distanceButton: {
    padding: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    margin: 4,
  },
  distanceButtonSelected: { backgroundColor: "#6e57c5", borderColor: "#6e57c5" },
});
