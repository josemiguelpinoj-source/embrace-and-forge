import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const icono = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type Taller = {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
  direccion: string | null;
  telefono: string | null;
  horario: string;
  servicios: string[];
  distanciaKm: number;
};

export default function MapaTalleres({
  centro,
  talleres,
}: {
  centro: { lat: number; lon: number };
  talleres: Taller[];
}) {
  return (
    <MapContainer
      center={[centro.lat, centro.lon]}
      zoom={13}
      scrollWheelZoom
      style={{ height: "420px", width: "100%", borderRadius: "0.75rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle center={[centro.lat, centro.lon]} radius={120} />
      {talleres.map((t) => (
        <Marker key={t.id} position={[t.lat, t.lon]} icon={icono}>
          <Popup>
            <strong>{t.nombre}</strong>
            <br />
            {t.direccion ?? "Sin dirección registrada"}
            <br />
            {t.distanciaKm.toFixed(1)} km
            <br />
            {t.horario}
            <br />
            {t.servicios.join(", ")}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
