import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// The route a rider took during one order, for admins [AC-ADM-05]: a line through every
// saved point, plus the restaurant (R) and the drop-off (C). Free OpenStreetMap tiles.
//
// <RouteMap restaurant={{ latitude, longitude }} dropoff={...} path={[{ latitude, longitude }]} />

const markerIcon = (letter, colour) =>
  L.divIcon({
    className: "",
    html:
      '<div style="width:30px;height:30px;border-radius:9999px;border:3px solid white;' +
      "box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;" +
      "font-weight:700;color:white;background:" +
      colour +
      '">' +
      letter +
      "</div>",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

const RESTAURANT_ICON = markerIcon("R", "#12402b");
const DROPOFF_ICON = markerIcon("C", "#b4441c");

const toLatLng = (point) => [Number(point.latitude), Number(point.longitude)];

const RouteMap = ({ restaurant, dropoff, path }) => {
  const line = path.map(toLatLng);
  const everyPoint = [toLatLng(restaurant), toLatLng(dropoff), ...line];

  return (
    <div className="isolate overflow-hidden rounded-lg border border-border">
      <MapContainer center={everyPoint[0]} zoom={14} className="h-72 w-full sm:h-96">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <Marker position={toLatLng(restaurant)} icon={RESTAURANT_ICON}>
          <Tooltip>Restaurant</Tooltip>
        </Marker>
        <Marker position={toLatLng(dropoff)} icon={DROPOFF_ICON}>
          <Tooltip>Customer</Tooltip>
        </Marker>
        {line.length > 1 && (
          <Polyline positions={line} pathOptions={{ color: "#1f6bc4", weight: 4 }} />
        )}
        <FitAll points={everyPoint} />
      </MapContainer>
    </div>
  );
};

// Zoom so everything is on screen, once
const FitAll = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(points, { padding: [30, 30], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the map opens
  }, [map]);

  return null;
};

export default RouteMap;
