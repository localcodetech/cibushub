import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Every online rider on one map, for admins [AC-ADM-04]. Free OpenStreetMap tiles, like
// DeliveryMap (docs/adr/002-free-maps-stack.md). Blue: free. Orange: on a delivery.
//
// <RidersMap riders={[{ id, fullName, location: { latitude, longitude }, delivery }]} />

const riderIcon = (colour) =>
  L.divIcon({
    className: "",
    html:
      '<div style="width:28px;height:28px;border-radius:9999px;border:3px solid white;' +
      "box-shadow:0 1px 4px rgba(0,0,0,.4);background:" +
      colour +
      '"></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const FREE_ICON = riderIcon("#1f6bc4");
const BUSY_ICON = riderIcon("#b4441c");

const KUMASI = [6.6885, -1.6244];

const RidersMap = ({ riders }) => {
  // Only riders who have sent a position can be drawn
  const placed = riders.filter((rider) => rider.location);
  const points = placed.map((rider) => [rider.location.latitude, rider.location.longitude]);

  return (
    // isolate: keeps Leaflet's layers below our sheets
    <div className="isolate overflow-hidden rounded-lg border border-border">
      <MapContainer center={KUMASI} zoom={13} className="h-80 w-full lg:h-[28rem]">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {placed.map((rider) => (
          <Marker
            key={rider.id}
            position={[rider.location.latitude, rider.location.longitude]}
            icon={rider.delivery ? BUSY_ICON : FREE_ICON}
          >
            <Tooltip>
              {rider.fullName}
              {rider.delivery ? " · " + rider.delivery.orderNumber : " · free"}
            </Tooltip>
          </Marker>
        ))}
        <FitOnce points={points} />
      </MapContainer>
    </div>
  );
};

// Zooms to show everyone the first time riders appear, then leaves the map where the admin
// put it (the positions refresh every 15 seconds; the view must not keep jumping)
const FitOnce = ({ points }) => {
  const map = useMap();
  const hasPoints = points.length > 0;

  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 15);
    }
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when riders first appear
  }, [map, hasPoints]);

  return null;
};

export default RidersMap;
