import { Place } from "../api/googlePlaces";

export type Filters = {
  types: string[];
  ratings: number[];
  maxDistance: number;
};

export const toggleType = (type: string, filters: Filters, setFilters: (value: Filters) => void) => {
    setFilters({
        ...filters,
        types: filters.types.includes(type)
        ? filters.types.filter((t) => t !== type)
        : [...filters.types, type],
    });
};

export const toggleRating = (rating: number, filters: Filters, setFilters: (value: Filters) => void) => {
    setFilters({
        ...filters,
        ratings: filters.ratings.includes(rating) ? filters.ratings.filter((previousRating: number) => previousRating !== rating) : [...filters.ratings, rating],
    });
};

  export const toggleDistance = (distance: number, filters: Filters, setFilters: (value: Filters) => void) => {
    setFilters({
      ...filters,
      maxDistance: filters.maxDistance === distance ? 0 : distance, // 0 = no limit
    });
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