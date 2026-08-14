"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type PropertyLocationMapProps = {
  initialLatitude: number | null;
  initialLongitude: number | null;
  onSelect: (latitude: number, longitude: number) => void;
  onClose: () => void;
};

type MapPosition = {
  latitude: number;
  longitude: number;
};

type SearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

const defaultPosition: MapPosition = {
  latitude: 12.9716,
  longitude: 77.5946,
};

const markerIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      transform: translate(-2px, -2px);
    ">
      📍
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

function MapController({
  position,
}: {
  position: MapPosition;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([position.latitude, position.longitude], 16);
  }, [map, position.latitude, position.longitude]);

  return null;
}

function MapClickHandler({
  onSelect,
}: {
  onSelect: (position: MapPosition) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

export default function PropertyLocationMap({
  initialLatitude,
  initialLongitude,
  onSelect,
  onClose,
}: PropertyLocationMapProps) {
  const [position, setPosition] = useState<MapPosition>(() => ({
    latitude: initialLatitude ?? defaultPosition.latitude,
    longitude: initialLongitude ?? defaultPosition.longitude,
  }));

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locating, setLocating] = useState(false);

  async function handleSearch() {
    const query = searchText.trim();

    if (!query) {
      setSearchError("Enter an apartment, building, street, or area.");
      return;
    }

    setSearching(true);
    setSearchError("");
    setSearchResults([]);

    try {
      const response = await fetch(
        "/api/location-search?" +
          new URLSearchParams({
            q: query,
          }).toString()
      );

      if (!response.ok) {
        throw new Error("Search failed.");
      }

      const results = (await response.json()) as SearchResult[];

      if (results.length === 0) {
        setSearchError(
          "No matching location found. Try the apartment name, road, area, or landmark."
        );
      } else {
        setSearchResults(results);
      }
    } catch {
      setSearchError(
        "Unable to search right now. Please try again or select the location on the map."
      );
    } finally {
      setSearching(false);
    }
  }

  function selectSearchResult(result: SearchResult) {
    const nextPosition = {
      latitude: Number(result.lat),
      longitude: Number(result.lon),
    };

    setPosition(nextPosition);
    setSearchResults([]);
    setSearchText(result.display_name);
    setSearchError("");
  }

  function handleLocateMe() {
    if (!navigator.geolocation) {
      setSearchError("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    setSearchError("");

    navigator.geolocation.getCurrentPosition(
      (currentPosition) => {
        const nextPosition = {
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
        };

        setPosition(nextPosition);
        setSearchResults([]);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setSearchError(
          "Unable to get your location. Please allow location access and try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white">
      <div className="flex h-full flex-col">
        <div className="border-b bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Select Property Location
              </h2>
              <p className="text-xs text-gray-500">
                Search for the property or tap the map.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-xl text-gray-600 hover:bg-gray-100"
            >
              ×
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setSearchResults([]);
                  setSearchError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Search apartment, building, area..."
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-500"
              />

              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchText.trim()}
                className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            {searchError && (
              <p className="mt-2 text-xs text-red-600">
                {searchError}
              </p>
            )}

            {searchResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => selectSearchResult(result)}
                    className="block w-full border-b border-gray-100 px-4 py-3 text-left text-sm text-gray-900 last:border-b-0 hover:bg-gray-50"
                  >
                    📍 {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <MapContainer
            center={[position.latitude, position.longitude]}
            zoom={16}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController position={position} />

            <MapClickHandler
              onSelect={(nextPosition) => {
                setPosition(nextPosition);
                setSearchResults([]);
              }}
            />

            <Marker
              position={[position.latitude, position.longitude]}
              icon={markerIcon}
            />
          </MapContainer>

          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            className="absolute bottom-5 left-4 z-[1000] rounded-xl bg-white px-4 py-3 font-semibold text-gray-900 shadow-lg disabled:opacity-50"
          >
            {locating ? "Locating..." : "📍 Locate Me"}
          </button>
        </div>

        <div className="border-t bg-white p-4">
          <p className="mb-3 text-center text-xs text-gray-500">
            Selected: {position.latitude.toFixed(6)},{" "}
            {position.longitude.toFixed(6)}
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-900"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() =>
                onSelect(position.latitude, position.longitude)
              }
              className="flex-1 rounded-xl bg-black px-4 py-3 font-semibold text-white"
            >
              Use This Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
