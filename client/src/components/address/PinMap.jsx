import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Central Kumasi (Adum), where the map starts before there is a pin
const KUMASI = [6.6885, -1.6244];
const CITY_ZOOM = 13;
const STREET_ZOOM = 17;

// Leaflet looks for its pin pictures at a path Vite doesn't serve,
// so we import the pictures and hand them over ourselves
const pinIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41], // the tip of the pin is the exact spot
  shadowSize: [41, 41],
});

// A map where the customer taps or drags the pin to their door [AC-CUST-04, AC-MAP-01].
// Free OpenStreetMap tiles; no API key (docs/adr/002-free-maps-stack.md).
//
// pin:         { latitude, longitude }, or null before one is dropped
// onPinChange: called with the new { latitude, longitude }
const PinMap = ({ pin, onPinChange }) => {
  const startCentre = pin ? [pin.latitude, pin.longitude] : KUMASI;

  // When the pin is dragged and let go, read where it landed
  const handleDragEnd = (event) => {
    const position = event.target.getLatLng();
    onPinChange({ latitude: position.lat, longitude: position.lng });
  };

  return (
    // isolate: Leaflet's layers use high z-index numbers; this keeps them below our sheets and menus
    <div className="isolate overflow-hidden rounded-lg border border-border">
      <MapContainer
        center={startCentre}
        zoom={pin ? STREET_ZOOM : CITY_ZOOM}
        className="h-72 w-full sm:h-96"
      >
        {/* The licence asks for this credit on every map */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <TapToPlacePin onPinChange={onPinChange} />
        <FollowPin pin={pin} />

        {pin && (
          <Marker
            position={[pin.latitude, pin.longitude]}
            icon={pinIcon}
            draggable={true}
            eventHandlers={{ dragend: handleDragEnd }}
          />
        )}
      </MapContainer>
    </div>
  );
};

// Tapping anywhere on the map moves the pin there.
// useMapEvents only works inside <MapContainer>, so it is its own small component that draws nothing.
const TapToPlacePin = ({ onPinChange }) => {
  useMapEvents({
    click: (event) => {
      onPinChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
};

// When the pin moves (current location, a search result, a tap), bring it into view
// and zoom in to street level so the customer can place it exactly
const FollowPin = ({ pin }) => {
  const map = useMap();

  useEffect(() => {
    if (!pin) {
      return;
    }
    const position = [pin.latitude, pin.longitude];
    const isOffScreen = !map.getBounds().contains(position);

    if (isOffScreen || map.getZoom() < STREET_ZOOM - 1) {
      map.setView(position, STREET_ZOOM);
    }
  }, [map, pin]);

  return null;
};

export default PinMap;
