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
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { searchPlacesWithNearby, Place, openPlaceInMaps } from "../api/googlePlaces";
import styles from "./AttractionsScreenStyles";
import { handleNavigate } from "../utils/navigationUtils";
import { toggleDistance, toggleRating, toggleType } from "../utils/filterUtils";
import { applyFilters } from "../utils/applyFiltersUtils";
import * as Linking from "expo-linking";

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

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
    })();
  }, []);

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
          <TouchableOpacity style={styles.actionButton} onPress={() => handleNavigate(userLocation, item)}>
            <Text style={styles.actionButtonText}>Navigate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
                if (item.id) {
                const url = `https://www.google.com/maps/place/?q=place_id:${item.id}`;
                Linking.openURL(url);
                }
            }}
            >
            <Text style={styles.actionButtonText}>Reviews</Text>
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
              {PLACE_TYPES.map((types) => (
                <TouchableOpacity
                  key={types}
                  style={[styles.typeButton, filters.types.includes(types) && styles.typeButtonSelected]}
                  onPress={() => toggleType(types, filters, setFilters)}
                >
                  <Text style={{ color: filters.types.includes(types) ? "#fff" : "#000" }}>{types}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontWeight: "600", marginTop: 12 }}>Minimum Rating:</Text>
            <View style={{ flexDirection: "row", marginVertical: 6 }}>
              {STAR_RATINGS.map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[styles.ratingButton, filters.ratings.includes(rating) && styles.ratingButtonSelected]}
                  onPress={() => toggleRating(rating, filters, setFilters)}
                >
                  <Text>{rating}⭐</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontWeight: "600", marginTop: 12 }}>Max Distance (km):</Text>
            <View style={{ flexDirection: "row", marginVertical: 6 }}>
              {DISTANCES.map((distance) => (
                <TouchableOpacity
                  key={distance}
                  style={[styles.distanceButton, filters.maxDistance === distance && styles.distanceButtonSelected]}
                  onPress={() => toggleDistance(distance, filters, setFilters)}
                >
                  <Text>{distance} km</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Apply Filters"
              onPress={() =>
                applyFilters({
                  setShowFilter,
                  setLoading,
                  currentQuery,
                  searchPlacesWithNearby,
                  setPlaces,
                  setPinPlace,
                  filters,
                })
              }
            />
            <Button title="Close" onPress={() => setShowFilter(false)} />
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
              scrollEnabled={true}
              zoomEnabled={true}
              showsUserLocation={true}
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
