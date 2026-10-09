import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, ChevronRight, Navigation, RefreshCw,
  Search, Shield, Truck, Radio, Activity, Filter, CheckCircle2, X, MapPin,
  ExternalLink, Copy, Check, Clock, AlertTriangle, Edit3, Globe, Eye
} from 'lucide-react';
import GpsMap from '../../components/GpsMap';
import { gpsApi } from '../../services/gpsApi';
import { useToastStore, useOrderStore } from '../../store';

const DEFAULT_LOCATIONS = {
  provinces: ['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Banten'],
  cities: {
    'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Selatan', 'Jakarta Timur'],
    'Jawa Barat': ['Kota Bandung', 'Bekasi', 'Bogor', 'Depok', 'Karawang', 'Cirebon'],
    'Jawa Tengah': ['Semarang', 'Surakarta (Solo)', 'Tegal', 'Pekalongan', 'Magelang'],
    'Jawa Timur': ['Surabaya', 'Malang', 'Sidoarjo', 'Gresik', 'Pasuruan'],
    'Banten': ['Tangerang', 'Tangerang Selatan', 'Cilegon', 'Serang'],
  },
  stores: {
    'Jakarta Utara': ['Depot Logistik Tanjung Priok', 'Gudang Marunda Center', 'DC Pluit'],
    'Jakarta Barat': ['DC Cengkareng', 'Hub Daan Mogot'],
    'Bekasi': ['Hub Industri MM2100', 'DC Cikarang Dry Port', 'Depot Tambun'],
    'Karawang': ['KIIC Hub Karawang', 'Surya Cipta Warehouse'],
    'Kota Bandung': ['DC Gedebage', 'Hub Soekarno Hatta'],
    'Semarang': ['Depot Pelabuhan Tanjung Emas', 'Kawasan Industri Wijayakusuma'],
    'Surabaya': ['DC Rungkut Industri', 'Hub Tanjung Perak', 'Margomulyo Logistics Park'],
  },
};

export default function MasterLocations() {
  const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'vendor-links' | 'master'
  const { addToast } = useToastStore();
  const { orders = [] } = useOrderStore();

  // Master Lokasi State with Persistence & safe recovery
  const [locations, setLocations] = useState(() => {
    try {
      const saved = localStorage.getItem('vardh_locations_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.provinces) && parsed.provinces.length > 0) {
          return {
            provinces: parsed.provinces,
            cities: parsed.cities || DEFAULT_LOCATIONS.cities,
            stores: parsed.stores || DEFAULT_LOCATIONS.stores,
          };
        }
      }
    } catch (e) {}
    return DEFAULT_LOCATIONS;
  });

  const [expanded, setExpanded] = useState('DKI Jakarta');
  const [expandedCity, setExpandedCity] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    province: 'DKI Jakarta',
    newProvince: '',
    city: '',
    store: '',
  });

  // Master Location defensive getters
  const safeProvinces = Array.isArray(locations?.provinces) ? locations.provinces : DEFAULT_LOCATIONS.provinces;
  const safeCities = locations?.cities || DEFAULT_LOCATIONS.cities;
  const safeStores = locations?.stores || DEFAULT_LOCATIONS.stores;

  // GPS Tracking State
  const [vehicles, setVehicles] = useState([]);
  const [loadingGps, setLoadingGps] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [simulatorActive, setSimulatorActive] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Vendor Tracking Links State
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkStatusFilter, setLinkStatusFilter] = useState('ALL');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [previewModal, setPreviewModal] = useState({ open: false, url: '', title: '' });

  const initialLinkForm = {
    vendorName: '',
    doReference: '',
    vehiclePlate: '',
    driverName: '',
    trackingUrl: '',
    expiresAt: '',
    status: 'ACTIVE',
    notes: '',
  };
  const [linkForm, setLinkForm] = useState(initialLinkForm);

  const handleResetLocations = () => {
    try {
      localStorage.removeItem('vardh_locations_data');
    } catch (e) {}
    setLocations(DEFAULT_LOCATIONS);
    setExpanded('DKI Jakarta');
    addToast('Data master wilayah & toko direset ke standar default!', 'success');
  };

  const fetchGpsVehicles = async () => {
    setLoadingGps(true);
    const data = await gpsApi.getVehicles();
    setVehicles(Array.isArray(data) ? data : []);
    setLastRefreshed(new Date());
    setLoadingGps(false);
  };

  const fetchTrackingLinks = async () => {
    setLoadingLinks(true);
    const data = await gpsApi.getTrackingLinks({
      search: linkSearch || undefined,
      status: linkStatusFilter === 'ALL' ? undefined : linkStatusFilter,
    });
    setTrackingLinks(Array.isArray(data) ? data : []);
    setLoadingLinks(false);
  };

  useEffect(() => {
    if (activeTab === 'tracking') {
      fetchGpsVehicles();
      const timer = setInterval(() => {
        fetchGpsVehicles();
      }, 20000);
      return () => clearInterval(timer);
    } else if (activeTab === 'vendor-links') {
      fetchTrackingLinks();
    }
  }, [activeTab, linkStatusFilter]);

  const handleToggleSimulator = async () => {
    const res = await gpsApi.toggleSimulator();
    if (res) {
      setSimulatorActive(res.simulatorActive);
      fetchGpsVehicles();
      addToast(res.message, 'info');
    }
  };

  const handleSaveLocation = (e) => {
    e.preventDefault();
    const prov = (modalForm.newProvince.trim() || modalForm.province).trim();
    const city = modalForm.city.trim();
    const store = modalForm.store.trim();

    if (!prov || !city) {
      addToast('Provinsi dan Kota wajib diisi!', 'error');
      return;
    }

    setLocations((prev) => {
      const nextProvinces = prev.provinces.includes(prov) ? prev.provinces : [...prev.provinces, prov];
      const currentCities = prev.cities[prov] || [];
      const nextCities = currentCities.includes(city) ? currentCities : [...currentCities, city];

      const currentStores = prev.stores[city] || [];
      const nextStores = store && !currentStores.includes(store) ? [...currentStores, store] : currentStores;

      const updated = {
        ...prev,
        provinces: nextProvinces,
        cities: {
          ...prev.cities,
          [prov]: nextCities,
        },
        stores: {
          ...prev.stores,
          ...(store ? { [city]: nextStores } : {}),
        },
      };

      try {
        localStorage.setItem('vardh_locations_data', JSON.stringify(updated));
      } catch (err) {}

      return updated;
    });

    addToast(`Lokasi ${city} (${prov}) berhasil ditambahkan!`, 'success');
    setShowAddModal(false);
    setModalForm({ province: prov, newProvince: '', city: '', store: '' });
    setExpanded(prov);
  };

  const handleDeleteStore = (city, storeToDelete) => {
    setLocations((prev) => {
      const currentStores = prev.stores[city] || [];
      const updatedStores = currentStores.filter((s) => s !== storeToDelete);
      const updated = {
        ...prev,
        stores: {
          ...prev.stores,
          [city]: updatedStores,
        },
      };
      try {
        localStorage.setItem('vardh_locations_data', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
    addToast(`Toko "${storeToDelete}" dihapus.`, 'info');
  };

  // Vendor Tracking Handlers
  const handleOpenAddLinkModal = (prefill = {}) => {
    setEditingLink(null);
    setLinkForm({
      ...initialLinkForm,
      ...prefill,
    });
    setShowLinkModal(true);
  };

  const handleOpenEditLinkModal = (link) => {
    setEditingLink(link);
    setLinkForm({
      vendorName: link.vendorName || '',
      doReference: link.doReference || '',
      vehiclePlate: link.vehiclePlate || '',
      driverName: link.driverName || '',
      trackingUrl: link.trackingUrl || '',
      expiresAt: link.expiresAt ? link.expiresAt.substring(0, 16) : '',
      status: link.status || 'ACTIVE',
      notes: link.notes || '',
    });
    setShowLinkModal(true);
  };

  const handleSaveTrackingLink = async (e) => {
    e.preventDefault();
    if (!linkForm.vendorName?.trim()) {
      addToast('Nama Vendor wajib diisi!', 'error');
      return;
    }
    if (!linkForm.trackingUrl?.trim()) {
      addToast('URL Tracking wajib diisi!', 'error');
      return;
    }

    let normalizedUrl = linkForm.trackingUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const payload = {
      vendorName: linkForm.vendorName.trim(),
      doReference: linkForm.doReference?.trim() || null,
      vehiclePlate: linkForm.vehiclePlate?.trim() || null,
      driverName: linkForm.driverName?.trim() || null,
      trackingUrl: normalizedUrl,
      expiresAt: linkForm.expiresAt ? new Date(linkForm.expiresAt).toISOString() : null,
      status: linkForm.status || 'ACTIVE',
      notes: linkForm.notes?.trim() || null,
    };

    if (editingLink) {
      const updated = await gpsApi.updateTrackingLink(editingLink.id, payload);
      if (updated) {
        addToast(`Link tracking vendor ${payload.vendorName} berhasil diperbarui!`, 'success');
        setShowLinkModal(false);
        fetchTrackingLinks();
      } else {
        addToast('Gagal memperbarui link tracking vendor.', 'error');
      }
    } else {
      const created = await gpsApi.createTrackingLink(payload);
      if (created) {
        addToast(`Link tracking vendor ${payload.vendorName} berhasil didaftarkan!`, 'success');
        setShowLinkModal(false);
        fetchTrackingLinks();
      } else {
        addToast('Gagal menambahkan link tracking vendor.', 'error');
      }
    }
  };

  const handleDeleteTrackingLink = async (link) => {
    if (!window.confirm(`Hapus link tracking untuk ${link.vendorName} (${link.vehiclePlate || link.doReference || 'Tracking'})?`)) {
      return;
    }
    const success = await gpsApi.deleteTrackingLink(link.id);
    if (success) {
      addToast(`Link tracking berhasil dihapus!`, 'info');
      fetchTrackingLinks();
    } else {
      addToast(`Gagal menghapus link tracking.`, 'error');
    }
  };

  const handleCopyLink = (link) => {
    if (!link?.trackingUrl) return;
    try {
      navigator.clipboard.writeText(link.trackingUrl);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2500);
      addToast('Tautan tracking berhasil disalin ke clipboard!', 'success');
    } catch (err) {
      addToast('Gagal menyalin link.', 'error');
    }
  };

  const handleOpenTracking = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Defensive Filtered vehicles
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

  const filteredVehicles = safeVehicles.filter((v) => {
    if (!v) return false;
    const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const plateStr = String(v.plate || '');
    const typeStr = String(v.vehicleType || '');
    const matchSearch = !searchFilter.trim() ||
      plateStr.toLowerCase().includes(searchFilter.toLowerCase()) ||
      typeStr.toLowerCase().includes(searchFilter.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Summary counts for GPS
  const countMoving = safeVehicles.filter((v) => v?.status === 'MOVING').length;
  const countIdle = safeVehicles.filter((v) => v?.status === 'IDLE').length;
  const countStopped = safeVehicles.filter((v) => v?.status === 'STOPPED').length;
  const countOffline = safeVehicles.filter((v) => v?.status === 'OFFLINE').length;

  // Filtered Tracking Links
  const filteredTrackingLinks = trackingLinks.filter((l) => {
    if (!l) return false;
    const matchStatus = linkStatusFilter === 'ALL'
      ? true
      : linkStatusFilter === 'EXPIRED'
        ? (l.isExpired || l.status === 'EXPIRED')
        : l.status === linkStatusFilter;

    if (!linkSearch.trim()) return matchStatus;
    const q = linkSearch.toLowerCase();
    const vendorMatch = (l.vendorName || '').toLowerCase().includes(q);
    const doMatch = (l.doReference || '').toLowerCase().includes(q);
    const plateMatch = (l.vehiclePlate || '').toLowerCase().includes(q);
    const driverMatch = (l.driverName || '').toLowerCase().includes(q);
    return matchStatus && (vendorMatch || doMatch || plateMatch || driverMatch);
  });

  // Summary counts for Tracking Links
  const countTotalLinks = trackingLinks.length;
  const countActiveLinks = trackingLinks.filter((l) => l.status === 'ACTIVE' && !l.isExpired).length;
  const countExpiredLinks = trackingLinks.filter((l) => l.isExpired || l.status === 'EXPIRED').length;
  const countCompletedLinks = trackingLinks.filter((l) => l.status === 'COMPLETED').length;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">GPS Tracking & Lokasi</h1>
          <p className="page-subtitle">Monitoring armada telematics live, tautan tracking vendor eksternal, & master wilayah</p>
        </div>

        {/* Tab Switcher & Action Button */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, background: 'var(--color-bg-card, #ffffff)', padding: 4, borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('tracking')}
              className={`btn btn-sm ${activeTab === 'tracking' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <Navigation size={14} /> Live GPS Tracking
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vendor-links')}
              className={`btn btn-sm ${activeTab === 'vendor-links' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <ExternalLink size={14} /> Link Tracking Vendor
              {countActiveLinks > 0 && (
                <span style={{ fontSize: 10, background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                  {countActiveLinks}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('master')}
              className={`btn btn-sm ${activeTab === 'master' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <Filter size={14} /> Master Wilayah & Toko
            </button>
          </div>

          {activeTab === 'vendor-links' ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenAddLinkModal()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> Tambah Link Tracking
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> Tambah Lokasi
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: LIVE GPS TRACKING
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tracking' && (
        <div>
          {/* Summary Counters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Armada</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{vehicles.length}</div>
            </div>
            <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#10b981', textTransform: 'uppercase' }}>Moving</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{countMoving}</div>
            </div>
            <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase' }}>Idle</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>{countIdle}</div>
            </div>
            <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase' }}>Stopped</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>{countStopped}</div>
            </div>
            <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #64748b' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Offline</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#64748b', marginTop: 4 }}>{countOffline}</div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="filter-bar" style={{ marginBottom: 16 }}>
            <div className="search-input-wrap" style={{ maxWidth: 280 }}>
              <Search className="search-icon" size={14} />
              <input
                className="form-input"
                placeholder="Cari nopol atau tipe..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {['ALL', 'MOVING', 'IDLE', 'STOPPED', 'OFFLINE'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStatusFilter(st)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {st === 'ALL' ? 'Semua Status' : st}
                </button>
              ))}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                className={`btn btn-sm ${simulatorActive ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={handleToggleSimulator}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: simulatorActive ? '#4338ca' : 'var(--text-muted)',
                  borderColor: simulatorActive ? '#c7d2fe' : 'var(--color-border)',
                }}
                title="Aktifkan simulasi pergerakan armada demo"
              >
                <Radio size={14} />
                Simulator Demo: {simulatorActive ? 'AKTIF' : 'NONAKTIF'}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchGpsVehicles}
                disabled={loadingGps}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={13} className={loadingGps ? 'spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Map Section */}
          <div className="card" style={{ padding: 12, marginBottom: 20 }}>
            <GpsMap
              vehicles={filteredVehicles}
              selectedVehicleId={selectedVehicle?.vehicleId}
              onSelectVehicle={(v) => setSelectedVehicle(v)}
              height="580px"
            />
          </div>

          {/* Active Fleet List Below Map */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Daftar Armada Telematics ({filteredVehicles.length})</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Sinkronisasi terakhir: {lastRefreshed.toLocaleTimeString('id-ID')}
              </div>
            </div>

            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Kendaraan</th>
                    <th>Tipe Unit</th>
                    <th>Vendor</th>
                    <th>Status GPS</th>
                    <th>Kecepatan</th>
                    <th>Heading</th>
                    <th>Koordinat Terakhir</th>
                    <th>Update</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                        Tidak ada kendaraan ditemukan dengan filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v) => {
                      const isSelected = selectedVehicle?.vehicleId === v.vehicleId;
                      return (
                        <tr
                          key={v.vehicleId}
                          onClick={() => setSelectedVehicle(v)}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? 'var(--color-primary-dim, rgba(37,99,235,0.06))' : undefined,
                          }}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Truck size={16} color="var(--color-primary)" />
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{v.plate}</span>
                              {v.isSimulated && (
                                <span style={{ fontSize: 9, fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '1px 5px', borderRadius: 999 }}>
                                  SIM
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: 12 }}>{v.vehicleType}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.vendor || '—'}</td>
                          <td>
                            <span className={`badge ${
                              v.status === 'MOVING' ? 'badge-done' :
                              v.status === 'IDLE' ? 'badge-waiting' :
                              v.status === 'STOPPED' ? 'badge-info' : 'badge-draft'
                            }`}>
                              ● {v.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{v.speed} km/h</td>
                          <td style={{ fontSize: 12 }}>{v.heading}°</td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(v.timestamp).toLocaleTimeString('id-ID')}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVehicle(v);
                              }}
                              style={{ fontSize: 11 }}
                            >
                              Fokus di Peta
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: EXTERNAL VENDOR TRACKING LINK MANAGEMENT
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'vendor-links' && (
        <div>
          {/* Summary Counters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Link Tracking</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{countTotalLinks}</div>
            </div>
            <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#10b981', textTransform: 'uppercase' }}>Link Aktif</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{countActiveLinks}</div>
            </div>
            <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase' }}>Telah Berakhir / Expired</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>{countExpiredLinks}</div>
            </div>
            <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase' }}>Selesai / Pengiriman Tiba</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>{countCompletedLinks}</div>
            </div>
          </div>

          {/* Info Banner */}
          <div style={{
            background: 'var(--color-primary-dim, rgba(37,99,235,0.06))',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
            color: 'var(--text-primary)',
          }}>
            <Globe size={20} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <strong>External GPS Tracking Link Management:</strong> Kelola tautan pelacakan armada dari vendor ekspedisi pihak ketiga tanpa memerlukan kredensial perangkat GPS atau integrasi API. Tim operasional dapat langsung membuka tautan resmi vendor atau menyalin link untuk klien.
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenAddLinkModal()}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Plus size={14} /> Daftarkan Link
            </button>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar" style={{ marginBottom: 16 }}>
            <div className="search-input-wrap" style={{ maxWidth: 320 }}>
              <Search className="search-icon" size={14} />
              <input
                className="form-input"
                placeholder="Cari vendor, No. DO, nopol, driver..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[
                { key: 'ALL', label: 'Semua Status' },
                { key: 'ACTIVE', label: 'Aktif' },
                { key: 'EXPIRED', label: 'Expired' },
                { key: 'COMPLETED', label: 'Selesai' },
                { key: 'INACTIVE', label: 'Nonaktif' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`btn btn-sm ${linkStatusFilter === key ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setLinkStatusFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchTrackingLinks}
                disabled={loadingLinks}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={13} className={loadingLinks ? 'spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Tracking Links Table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                Daftar Tautan Tracking Vendor ({filteredTrackingLinks.length})
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Tautan aman dibuka dengan proteksi rel="noopener noreferrer"
              </div>
            </div>

            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Vendor & Tautan Tracking</th>
                    <th>Ref. DO / Surat Jalan</th>
                    <th>Armada & Driver</th>
                    <th>Status & Masa Berlaku</th>
                    <th>Catatan</th>
                    <th>Dibuat</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrackingLinks.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        <div style={{ marginBottom: 8, fontSize: 14 }}>Belum ada tautan tracking vendor yang terdaftar.</div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenAddLinkModal()}
                        >
                          <Plus size={14} /> Daftarkan Link Pertama
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredTrackingLinks.map((link) => {
                      const isExpired = link.isExpired || link.status === 'EXPIRED';
                      const isCopied = copiedId === link.id;

                      return (
                        <tr key={link.id}>
                          <td>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                🏢 {link.vendorName}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <a
                                  href={link.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: 11,
                                    color: 'var(--color-primary)',
                                    textDecoration: 'none',
                                    maxWidth: 240,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-block',
                                  }}
                                  title={link.trackingUrl}
                                >
                                  {link.trackingUrl}
                                </a>
                                <ExternalLink size={12} color="var(--color-primary)" />
                              </div>
                            </div>
                          </td>
                          <td>
                            {link.doReference ? (
                              <span className="badge badge-info" style={{ fontWeight: 600 }}>
                                📄 {link.doReference}
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— Umum —</span>
                            )}
                          </td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Truck size={13} color="var(--text-secondary)" />
                                {link.vehiclePlate || '—'}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                👤 {link.driverName || 'Belum ditentukan'}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>
                              <span className={`badge ${
                                isExpired ? 'badge-waiting' :
                                link.status === 'ACTIVE' ? 'badge-done' :
                                link.status === 'COMPLETED' ? 'badge-info' : 'badge-draft'
                              }`} style={{ fontWeight: 600 }}>
                                {isExpired ? '⚠️ KEDALUWARSA' :
                                 link.status === 'ACTIVE' ? '● AKTIF' :
                                 link.status === 'COMPLETED' ? '✓ SELESAI' : 'NONAKTIF'}
                              </span>

                              <div style={{ fontSize: 11, color: isExpired ? '#b45309' : 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={11} />
                                {link.expiresAt ? (
                                  <span>s/d {new Date(link.expiresAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                ) : (
                                  <span>Tanpa batas waktu</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 180 }}>
                            {link.notes ? (
                              <span title={link.notes} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {link.notes}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(link.createdAt).toLocaleDateString('id-ID')}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {/* Open Tracking Link */}
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOpenTracking(link.trackingUrl)}
                                title="Buka tautan tracking resmi vendor di tab baru"
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11 }}
                              >
                                <ExternalLink size={12} /> Buka Tracking
                              </button>

                              {/* Copy Link */}
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleCopyLink(link)}
                                title="Salin link tracking ke clipboard"
                                style={{ padding: '4px 8px', fontSize: 11 }}
                              >
                                {isCopied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                              </button>

                              {/* Preview Link */}
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setPreviewModal({
                                  open: true,
                                  url: link.trackingUrl,
                                  title: `${link.vendorName} (${link.vehiclePlate || link.doReference || 'Tracking'})`,
                                })}
                                title="Pratinjau web tracking di jendela popup"
                                style={{ padding: '4px 6px', fontSize: 11 }}
                              >
                                <Eye size={13} />
                              </button>

                              {/* Edit Link */}
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleOpenEditLinkModal(link)}
                                title="Edit data link tracking"
                                style={{ padding: '4px 6px', fontSize: 11 }}
                              >
                                <Edit3 size={13} />
                              </button>

                              {/* Delete Link */}
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleDeleteTrackingLink(link)}
                                title="Hapus link tracking"
                                style={{ padding: '4px 6px', fontSize: 11, color: 'var(--color-danger, #ef4444)' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: MASTER WILAYAH & TOKO
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'master' && (
        <div>
          {/* Subheader / Action Bar for Master Wilayah */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                Database Master Wilayah & Toko
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Tersedia {safeProvinces.length} provinsi aktif untuk tujuan pengiriman dan penugasan armada DO
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResetLocations}
                title="Kembalikan struktur wilayah & toko ke default VARDH"
              >
                Reset ke Standar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={14} /> Tambah Lokasi Baru
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {safeProvinces.map((province) => {
              const isOpen = expanded === province;
              const cities = safeCities[province] || [];
              return (
                <div key={province} className="card" style={{ padding: 0 }}>
                  <div
                    onClick={() => setExpanded(isOpen ? null : province)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 18px', cursor: 'pointer',
                      background: isOpen ? 'var(--color-primary-dim)' : undefined,
                      borderRadius: isOpen ? '14px 14px 0 0' : 14,
                      borderBottom: isOpen ? '1px solid var(--color-border)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>🗺️ {province}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{cities.length} kota/kabupaten</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                  </div>

                  {isOpen && (
                    <div style={{ padding: '12px 18px' }}>
                      {cities.map((city) => {
                        const stores = safeStores[city] || [];
                        const cityKey = `${province}-${city}`;
                        const cityOpen = expandedCity === cityKey;
                        return (
                          <div key={city} style={{ marginBottom: 8 }}>
                            <div
                              onClick={() => setExpandedCity(cityOpen ? null : cityKey)}
                              style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                background: cityOpen ? 'var(--color-bg-base)' : 'var(--color-bg-input)',
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              <div style={{ fontWeight: 500, fontSize: 13 }}>📍 {city}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stores.length} toko</span>
                                <ChevronRight size={13} color="var(--text-muted)"
                                  style={{ transform: cityOpen ? 'rotate(90deg)' : 'none', transition: '0.15s' }} />
                              </div>
                            </div>
                            {cityOpen && stores.length > 0 && (
                              <div style={{ paddingLeft: 12, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {stores.map((store) => (
                                  <div
                                    key={store}
                                    style={{
                                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                      padding: '6px 10px', borderRadius: 6, background: 'var(--color-bg-card)',
                                      border: '1px solid var(--color-border-light)', fontSize: 12,
                                    }}
                                  >
                                    <span>🏪 {store}</span>
                                    <button
                                      type="button"
                                      className="btn-ghost"
                                      onClick={() => handleDeleteStore(city, store)}
                                      title="Hapus toko"
                                      style={{ padding: 2, color: 'var(--text-muted)' }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: DAFTARKAN / EDIT LINK TRACKING VENDOR
          ══════════════════════════════════════════════════════════════════════ */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ExternalLink size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  {editingLink ? 'Edit Link Tracking Vendor' : 'Daftarkan Link Tracking Vendor'}
                </h3>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowLinkModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTrackingLink}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Nama Vendor / Ekspedisi *</label>
                <input
                  className="form-input"
                  placeholder="Contoh: PT Samudera Logistik / Kurnia Trans / Traccar"
                  value={linkForm.vendorName}
                  onChange={(e) => setLinkForm((f) => ({ ...f, vendorName: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Referensi DO / Surat Jalan (Opsional)</label>
                <select
                  className="form-input"
                  value={orders.some(o => o.id === linkForm.doReference) ? linkForm.doReference : (linkForm.doReference ? '__CUSTOM__' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__CUSTOM__') {
                      setLinkForm((f) => ({ ...f, doReference: '' }));
                    } else {
                      const selectedOrder = orders.find(o => o.id === val);
                      if (selectedOrder) {
                        setLinkForm((f) => ({
                          ...f,
                          doReference: selectedOrder.id,
                          vehiclePlate: selectedOrder.fleetPlate || f.vehiclePlate,
                          driverName: selectedOrder.driverName || f.driverName,
                          vendorName: selectedOrder.vendorName || f.vendorName,
                        }));
                      } else {
                        setLinkForm((f) => ({ ...f, doReference: val }));
                      }
                    }
                  }}
                  style={{ marginBottom: linkForm.doReference && !orders.some(o => o.id === linkForm.doReference) ? 8 : 0 }}
                >
                  <option value="">-- Pilih DO Aktif (Opsional) --</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} {o.clientName ? `— ${o.clientName}` : ''} {o.fleetPlate ? `(${o.fleetPlate})` : ''}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Input Manual No. Referensi DO...</option>
                </select>

                {(!orders.some(o => o.id === linkForm.doReference) || linkForm.doReference === '') && (
                  <input
                    className="form-input"
                    placeholder="Atau ketik no. DO / ref mandiri..."
                    style={{ marginTop: 6 }}
                    value={linkForm.doReference}
                    onChange={(e) => setLinkForm((f) => ({ ...f, doReference: e.target.value }))}
                  />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Plat Nomor Kendaraan</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: B 9123 KXZ"
                    value={linkForm.vehiclePlate}
                    onChange={(e) => setLinkForm((f) => ({ ...f, vehiclePlate: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Driver / Sopir</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: Bambang S."
                    value={linkForm.driverName}
                    onChange={(e) => setLinkForm((f) => ({ ...f, driverName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">URL / Tautan Tracking GPS *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="https://tracking.vendor.com/track?token=... atau share link"
                  value={linkForm.trackingUrl}
                  onChange={(e) => setLinkForm((f) => ({ ...f, trackingUrl: e.target.value }))}
                  required
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Tautan web resmi pelacakan yang diberikan oleh pihak vendor armada.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Status Link</label>
                  <select
                    className="form-input"
                    value={linkForm.status}
                    onChange={(e) => setLinkForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">Aktif (Sedang Berjalan)</option>
                    <option value="COMPLETED">Selesai (Tiba di Tujuan)</option>
                    <option value="INACTIVE">Nonaktif / Draft</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Batas Waktu / Expiry (Opsional)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={linkForm.expiresAt}
                    onChange={(e) => setLinkForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Catatan Tambahan (Opsional)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Catatan rute, nomor kontak vendor, atau instruksi pelacakan..."
                  value={linkForm.notes}
                  onChange={(e) => setLinkForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLinkModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={14} /> {editingLink ? 'Simpan Perubahan' : 'Daftarkan Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: PRATINJAU EMBEDDED TRACKING (DENGAN SAFE FALLBACK)
          ══════════════════════════════════════════════════════════════════════ */}
      {previewModal.open && (
        <div className="modal-overlay" onClick={() => setPreviewModal({ open: false, url: '', title: '' })}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 840, width: '95vw', padding: 20, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                  Pratinjau Tracking: {previewModal.title}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenTracking(previewModal.url)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <ExternalLink size={13} /> Buka di Tab Baru
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPreviewModal({ open: false, url: '', title: '' })}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Fallback Notice Banner */}
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: '#92400e',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
              <div>
                <strong>Catatan Integrasi:</strong> Beberapa provider GPS eksternal (seperti Traccar, Tracksolid, atau login portal) membatasi penayangan di dalam frame (X-Frame-Options / CSP). Jika pratinjau di bawah tidak muncul atau terblokir, klik tombol <strong>Buka di Tab Baru</strong>.
              </div>
            </div>

            {/* Sandboxed iframe */}
            <div style={{ flex: 1, minHeight: 460, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)', background: '#f8fafc' }}>
              <iframe
                src={previewModal.url}
                title="Vendor Tracking Live Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                style={{ width: '100%', height: '100%', minHeight: 460, border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: TAMBAH LOKASI MASTER WILAYAH & TOKO
          ══════════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Tambah Lokasi Baru</h3>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLocation}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Provinsi *</label>
                <select
                  className="form-input"
                  value={modalForm.province}
                  onChange={(e) => setModalForm((f) => ({ ...f, province: e.target.value }))}
                >
                  {safeProvinces.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="__NEW__">+ Input Provinsi Baru...</option>
                </select>
                {modalForm.province === '__NEW__' && (
                  <input
                    className="form-input"
                    placeholder="Nama provinsi baru..."
                    style={{ marginTop: 8 }}
                    value={modalForm.newProvince}
                    onChange={(e) => setModalForm((f) => ({ ...f, newProvince: e.target.value }))}
                    autoFocus
                  />
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Kota / Kabupaten *</label>
                <input
                  className="form-input"
                  placeholder="Contoh: Kota Bekasi / Kab. Karawang"
                  value={modalForm.city}
                  onChange={(e) => setModalForm((f) => ({ ...f, city: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Nama Toko / Outlet (Opsional)</label>
                <input
                  className="form-input"
                  placeholder="Contoh: Depot DC Barat / Alfamart DC"
                  value={modalForm.store}
                  onChange={(e) => setModalForm((f) => ({ ...f, store: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={14} /> Simpan Lokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
