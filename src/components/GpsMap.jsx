import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Maximize2, Compass, Layers, Radio } from 'lucide-react';

const STATUS_COLORS = {
  MOVING:  { bg: '#10b981', border: '#059669', text: '#ffffff', label: 'Moving' },
  IDLE:    { bg: '#f59e0b', border: '#d97706', text: '#ffffff', label: 'Idle' },
  STOPPED: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff', label: 'Stopped' },
  OFFLINE: { bg: '#64748b', border: '#475569', text: '#ffffff', label: 'Offline' },
};

const DEFAULT_MAP_STYLE = {
  version: 8,
  sources: {
    'carto-voyager': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-voyager-layer',
      type: 'raster',
      source: 'carto-voyager',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export default function GpsMap({
  vehicles = [],
  selectedVehicleId = null,
  onSelectVehicle = () => {},
  historyRoute = [],
  height = '560px',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DEFAULT_MAP_STYLE,
      center: [106.8456, -6.2088], // Jakarta default
      zoom: 9,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Sync Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = markersRef.current;
    const activeIds = new Set();

    vehicles.forEach((v) => {
      if (typeof v.latitude !== 'number' || typeof v.longitude !== 'number') return;
      activeIds.add(v.vehicleId);

      const statusConf = STATUS_COLORS[v.status] || STATUS_COLORS.OFFLINE;
      const isSelected = v.vehicleId === selectedVehicleId;

      let markerEntry = currentMarkers.get(v.vehicleId);

      if (!markerEntry) {
        // Create custom DOM element for the truck marker
        const el = document.createElement('div');
        el.className = 'vardh-gps-marker';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'center';
        el.style.transition = 'transform 0.4s ease';

        el.innerHTML = `
          <div class="marker-plate-pill" style="
            background: rgba(15, 23, 42, 0.85);
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            white-space: nowrap;
            margin-bottom: 2px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">${v.plate}</div>
          <div class="marker-icon-bubble" style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${statusConf.bg};
            border: 2px solid #ffffff;
            box-shadow: 0 3px 8px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            position: relative;
          ">
            <svg style="transform: rotate(${v.heading || 0}deg); transition: transform 0.4s ease;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectVehicle(v);
        });

        const popup = new maplibregl.Popup({ offset: 25, closeButton: true }).setHTML(`
          <div style="font-family: inherit; padding: 6px 4px; min-width: 190px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${v.plate}</span>
              ${v.isSimulated ? '<span style="font-size: 9px; font-weight: 700; background: #e0e7ff; color: #4338ca; padding: 1px 5px; border-radius: 999px;">SIMULATOR</span>' : ''}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${v.vehicleType}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; margin-bottom: 8px;">
              <div>
                <span style="color: #94a3b8; display: block; font-size: 10px;">Status</span>
                <span style="font-weight: 600; color: ${statusConf.bg};">● ${statusConf.label}</span>
              </div>
              <div>
                <span style="color: #94a3b8; display: block; font-size: 10px;">Kecepatan</span>
                <span style="font-weight: 600; color: #0f172a;">${v.speed} km/h</span>
              </div>
            </div>
            <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px;">
              Update: ${new Date(v.timestamp).toLocaleTimeString('id-ID')}
            </div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.longitude, v.latitude])
          .setPopup(popup)
          .addTo(map);

        currentMarkers.set(v.vehicleId, { marker, el, popup });
      } else {
        // Smoothly update position & heading
        markerEntry.marker.setLngLat([v.longitude, v.latitude]);

        const iconEl = markerEntry.el.querySelector('.marker-icon-bubble');
        if (iconEl) {
          iconEl.style.background = statusConf.bg;
          const svgEl = iconEl.querySelector('svg');
          if (svgEl) svgEl.style.transform = `rotate(${v.heading || 0}deg)`;
        }

        const platePill = markerEntry.el.querySelector('.marker-plate-pill');
        if (platePill && isSelected) {
          platePill.style.background = '#2563eb';
          platePill.style.border = '1px solid #ffffff';
        } else if (platePill) {
          platePill.style.background = 'rgba(15, 23, 42, 0.85)';
        }

        markerEntry.popup.setHTML(`
          <div style="font-family: inherit; padding: 6px 4px; min-width: 190px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${v.plate}</span>
              ${v.isSimulated ? '<span style="font-size: 9px; font-weight: 700; background: #e0e7ff; color: #4338ca; padding: 1px 5px; border-radius: 999px;">SIMULATOR</span>' : ''}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${v.vehicleType}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; margin-bottom: 8px;">
              <div>
                <span style="color: #94a3b8; display: block; font-size: 10px;">Status</span>
                <span style="font-weight: 600; color: ${statusConf.bg};">● ${statusConf.label}</span>
              </div>
              <div>
                <span style="color: #94a3b8; display: block; font-size: 10px;">Kecepatan</span>
                <span style="font-weight: 600; color: #0f172a;">${v.speed} km/h</span>
              </div>
            </div>
            <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px;">
              Update: ${new Date(v.timestamp).toLocaleTimeString('id-ID')}
            </div>
          </div>
        `);
      }
    });

    // Remove obsolete markers
    currentMarkers.forEach((entry, id) => {
      if (!activeIds.has(id)) {
        entry.marker.remove();
        currentMarkers.delete(id);
      }
    });
  }, [vehicles, selectedVehicleId, onSelectVehicle]);

  // Handle selected vehicle fly-to
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedVehicleId) return;

    const target = vehicles.find((v) => v.vehicleId === selectedVehicleId);
    if (target && typeof target.latitude === 'number' && typeof target.longitude === 'number') {
      map.flyTo({
        center: [target.longitude, target.latitude],
        zoom: 14,
        speed: 1.2,
      });

      const entry = markersRef.current.get(selectedVehicleId);
      if (entry) {
        entry.marker.togglePopup();
      }
    }
  }, [selectedVehicleId]);

  // Recenter button helper
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map || vehicles.length === 0) return;

    if (vehicles.length === 1) {
      map.flyTo({
        center: [vehicles[0].longitude, vehicles[0].latitude],
        zoom: 13,
      });
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    vehicles.forEach((v) => {
      if (typeof v.latitude === 'number' && typeof v.longitude === 'number') {
        bounds.extend([v.longitude, v.latitude]);
      }
    });

    map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Recenter Button */}
      <button
        type="button"
        onClick={handleRecenter}
        title="Pusatkan Seluruh Armada"
        style={{
          position: 'absolute',
          bottom: 24,
          right: 14,
          background: 'var(--color-bg-card, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          border: '1px solid var(--color-border, #e2e8f0)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          zIndex: 10,
        }}
      >
        <Compass size={15} color="var(--color-primary, #2563eb)" />
        Pusatkan Peta
      </button>

      {/* Floating Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 14,
          background: 'rgba(15, 23, 42, 0.88)',
          color: '#ffffff',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 11,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          backdropFilter: 'blur(4px)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS.MOVING.bg }} />
          Moving
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS.IDLE.bg }} />
          Idle
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS.STOPPED.bg }} />
          Stopped
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS.OFFLINE.bg }} />
          Offline
        </div>
      </div>
    </div>
  );
}
