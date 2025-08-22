import { Place } from "../types";
import { applyFiltersToPlaces, Filters } from "./filterUtils";

type Props = {
  setShowFilter: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  currentQuery: string;
  searchPlacesWithNearby: (query: string) => Promise<Place[]>;
  setPlaces: (places: Place[]) => void;
  setPinPlace: (place: Place | null) => void;
  filters: Filters;
};

export const applyFilters = async ({
    setShowFilter,
    setLoading,
    currentQuery,
    searchPlacesWithNearby,
    setPlaces,
    setPinPlace,
    filters
}: Props) => {
    setShowFilter(false);
    if (!currentQuery) return;
    setLoading(true);
    try {
      let results = await searchPlacesWithNearby(currentQuery);
      results = applyFiltersToPlaces(results, filters);
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
