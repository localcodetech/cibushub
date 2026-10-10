import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// A look-only map with up to three markers: the restaurant, the drop-off and the rider
// [AC-DEL-01, AC-RT-04]. Every delivery and tracking map uses THIS component, so changing
// map provider later (e.g. Google Maps) means changing one file.
// Free OpenStreetMap tiles; no API key (docs/adr/002-free-maps-stack.md).
//
// <DeliveryMap restaurant={{ latitude, longitude }} dropoff={...} rider={...} />
// Any of them may be left out (null). The map zooms to show all that are given.

// Round coloured markers drawn with HTML (no picture files), with a letter inside
const markerIcon = (letter, colour) =>
  L.divIcon({
    className: "",
    html:
      '<div style="width:32px;height:32px;border-radius:9999px;border:3px solid white;' +
      "box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;" +
      "font-weight:700;color:white;background:" +
      colour +
      '">' +
      letter +
      "</div>",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const RESTAURANT_ICON = markerIcon("R", "#12402b");
const DROPOFF_ICON = markerIcon("C", "#b4441c");
const RIDER_ICON = markerIcon("•", "#1f6bc4");

const KUMASI = [6.6885, -1.6244];

const toLatLng = (point) => [Number(point.latitude), Number(point.longitude)];

const DeliveryMap = ({ restaurant, dropoff, rider }) => {
  const points = [restaurant, dropoff, rider].filter(Boolean).map(toLatLng);
  // Changes when a fixed marker appears, disappears or swaps (e.g. restaurant -> customer
  // after pickup), or the rider first shows up; NOT when the rider just moves
  const fitKey = [restaurant, dropoff]
    .map((point) => (point ? toLatLng(point).join(",") : "-"))
    .concat(rider ? "rider" : "-")
    .join("|");

  return (
    // isolate: Leaflet's layers use high z-index numbers; this keeps them below our sheets
    <div className="isolate overflow-hidden rounded-lg border border-border">
      <MapContainer center={points[0] || KUMASI} zoom={15} className="h-64 w-full sm:h-80">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {restaurant && (
          <Marker position={toLatLng(restaurant)} icon={RESTAURANT_ICON}>
            <Tooltip>Restaurant</Tooltip>
          </Marker>
        )}
        {dropoff && (
          <Marker position={toLatLng(dropoff)} icon={DROPOFF_ICON}>
            <Tooltip>Customer</Tooltip>
          </Marker>
        )}
        {rider && (
          <Marker position={toLatLng(rider)} icon={RIDER_ICON}>
            <Tooltip>You</Tooltip>
          </Marker>
        )}
        <FitAll points={points} fitKey={fitKey} />
      </MapContainer>
    </div>
  );
};

// Zooms so every marker is on screen, whenever fitKey changes:
// the rider moving every 5 seconds must not keep jumping the map around.
const FitAll = ({ points, fitKey }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 16);
    }
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 17 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fit when fitKey changes
  }, [map, fitKey]);

  return null;
};

export default DeliveryMap;
