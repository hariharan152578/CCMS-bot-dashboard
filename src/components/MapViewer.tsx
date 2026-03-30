'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect } from 'react';

// Fix for leaflet default icons in nextjs
export default function MapViewer({ lat, lng, address, showPopup = true }: { lat: number, lng: number, address: string, showPopup?: boolean }) {
  useEffect(() => {
    // Standard Leaflet Icon Fix for Next.js
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        key={`${lat}-${lng}`}
        center={[lat, lng]} 
        zoom={15} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]}>
          {showPopup && (
            <Popup>
              {address || 'Complaint Location'}
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}
