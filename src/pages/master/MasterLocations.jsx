import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, ChevronRight, Navigation, RefreshCw,
  Search, Shield, Truck, Radio, Activity, Filter, CheckCircle2, X, MapPin
} from 'lucide-react';
import GpsMap from '../../components/GpsMap';
import { gpsApi } from '../../services/gpsApi';
import { useToastStore } from '../../store';

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
  const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'master'
  const { addToast } = useToastStore();

  // Master Lokasi State with Persistence
  const [locations, setLocations] = useState(() => {
    try {
      const saved = localStorage.getItem('vardh_locations_data');
      if (saved) return JSON.parse(saved);
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

  // GPS Tracking State
  const [vehicles, setVehicles] = useState([]);
  const [loadingGps, setLoadingGps] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [simulatorActive, setSimulatorActive] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchGpsVehicles = async () => {
    setLoadingGps(true);
    const data = await gpsApi.getVehicles();
    setVehicles(Array.isArray(data) ? data : []);
    setLastRefreshed(new Date());
    setLoadingGps(false);
  };

  useEffect(() => {
    if (activeTab === 'tracking') {
      fetchGpsVehicles();
      const timer = setInterval(() => {
        fetchGpsVehicles();
      }, 20000);
      return () => clearInterval(timer);
    }
  }, [activeTab]);

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

  // Filtered vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const matchSearch = !searchFilter.trim() ||
      v.plate.toLowerCase().includes(searchFilter.toLowerCase()) ||
      v.vehicleType.toLowerCase().includes(searchFilter.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Summary counts
  const countMoving = vehicles.filter((v) => v.status === 'MOVING').length;
  const countIdle = vehicles.filter((v) => v.status === 'IDLE').length;
  const countStopped = vehicles.filter((v) => v.status === 'STOPPED').length;
  const countOffline = vehicles.filter((v) => v.status === 'OFFLINE').length;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">GPS Tracking & Lokasi</h1>
          <p className="page-subtitle">Monitoring posisi armada telematics secara live & master wilayah tujuan</p>
        </div>

        {/* Tab Switcher & Tambah Lokasi Button */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
              onClick={() => setActiveTab('master')}
              className={`btn btn-sm ${activeTab === 'master' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <Filter size={14} /> Master Wilayah & Toko
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} /> Tambah Lokasi
          </button>
        </div>
      </div>

      {activeTab === 'tracking' ? (
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
      ) : (
        /* TAB 2: Master Wilayah & Toko Existing */
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {locations.provinces.map((province) => {
              const isOpen = expanded === province;
              const cities = locations.cities[province] || [];
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
                        const stores = locations.stores[city] || [];
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
                                  <div key={store} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '6px 10px', fontSize: 12, color: 'var(--text-secondary)',
                                    background: 'var(--color-bg-base)', borderRadius: 6, border: '1px solid var(--color-border)',
                                  }}>
                                    <span>🏪 {store}</span>
                                    <button
                                      type="button"
                                      className="btn btn-ghost"
                                      onClick={() => handleDeleteStore(city, store)}
                                      style={{ padding: '2px 4px', color: 'var(--color-danger)' }}
                                      title="Hapus Toko"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', marginTop: 8 }}
                        onClick={() => {
                          setModalForm((f) => ({ ...f, province }));
                          setShowAddModal(true);
                        }}
                      >
                        <Plus size={12} /> Tambah Kota di {province}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Tambah Lokasi Baru */}
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
                  {locations.provinces.map((p) => (
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
