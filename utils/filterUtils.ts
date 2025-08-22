import { Place } from "../api/googlePlaces";

export type Filters = {
  types: string[];
  ratings: number[];
  maxDistance: number;
};

export const toggleType = (type: string) => {
    setFilters((prev) => ({
        ...prev,
        types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
};

export const toggleRating = (rating: number) => {
    setFilters((prev) => ({
        ...prev,
        ratings: prev.ratings.includes(rating) ? prev.ratings.filter((previousRating) => previousRating !== rating) : [...prev.ratings, rating],
    }));
};

  export const toggleDistance = (distance: number) => {
    setFilters((prev) => ({
      ...prev,
      maxDistance: prev.maxDistance === distance ? 0 : distance, // 0 = no limit
    }));
  };

export function applyFiltersToPlaces(places: Place[], filters: Filters): Place[] {
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
}