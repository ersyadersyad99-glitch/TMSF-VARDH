import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Upload, CheckCircle, Clock, AlertTriangle, FileText, X, Printer, Download,
  ExternalLink, Copy, Check, Navigation, Plus
} from 'lucide-react';
import { useOrderStore, useInvoiceStore, useToastStore } from '../../store';
import { useTenant } from '../../context/TenantContext';
import { apiSync, getUploadUrl } from '../../services/api';
import { gpsApi } from '../../services/gpsApi';
import {
  formatRupiah, formatDate,
  statusLabels, statusBadgeClass,
  paymentLabels, paymentBadgeClass,
  allPODUploaded, getDropProgress
} from '../../utils/helpers';

function PODUploadCard({ drop, onUpload, onUpdatePodDate }) {
  const [dragging, setDragging] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  // Local date state — shown when editing or when file just uploaded without date
  const [localDate, setLocalDate] = useState(drop.podDate || new Date().toISOString().split('T')[0]);

  const handleFile = (file) => {
    if (file) {
      onUpload(drop.id, file, localDate);
    }
  };

  const handleSaveDate = () => {
    if (localDate) {
      onUpdatePodDate(drop.id, localDate);
      setEditingDate(false);
    }
  };

  return (
    <div style={{
      background: 'var(--color-bg-base)', border: `1px solid ${drop.pod ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'}`,
      borderRadius: 10, padding: '14px 16px',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: drop.pod ? 'var(--color-success-dim)' : 'var(--color-bg-input)',
              color: drop.pod ? 'var(--color-success)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              border: `1px solid ${drop.pod ? 'rgba(34,197,94,0.3)' : 'var(--color-border-light)'}`,
            }}>
              {drop.pod ? '✓' : drop.seq}
            </div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{drop.store || drop.city}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 32 }}>
            {drop.district ? `Kec. ${drop.district}, ` : ''}{drop.city}, {drop.province}
            {(drop.pic || drop.phone) && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                👤 PIC Penerima: {drop.pic || '—'} {drop.phone ? `(${drop.phone})` : ''}
              </div>
            )}
          </div>
        </div>
        {drop.pod && (
          <span className="badge badge-done">POD ✓</span>
        )}
      </div>

      {/* ─── Tanggal POD (shown before AND after upload) ─── */}
      {!drop.pod && (
        <div style={{ marginBottom: 10, paddingLeft: 32 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            📅 Tanggal POD Aktual (Actual Delivered) *
          </label>
          <input
            type="date"
            className="form-input"
            value={localDate}
            onChange={e => setLocalDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            style={{ width: '100%', fontSize: 13, padding: '6px 10px' }}
          />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
            Masukkan tanggal aktual barang tiba di drop point ini sebelum upload Surat Jalan.
          </div>
        </div>
      )}

      {drop.pod ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* File link row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: 'var(--color-success-dim)', borderRadius: 6, fontSize: 12,
          }}>
            <FileText size={14} color="var(--color-success)" />
            <a
              href={getUploadUrl(drop.pod)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-success)', flex: 1, textDecoration: 'underline', fontWeight: 600 }}
            >
              📎 {drop.pod} (Lihat File)
            </a>
            <button type="button" className="btn-ghost" style={{ color: 'var(--text-muted)', padding: 2 }}
              title="Batalkan / Hapus POD"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpload(drop.id, null, null); }}>
              <X size={14} />
            </button>
          </div>

          {/* Tanggal POD display/edit row */}
          <div style={{
            padding: '8px 12px', borderRadius: 6,
            background: drop.podDate ? 'rgba(99,102,241,0.07)' : 'rgba(234,179,8,0.08)',
            border: `1px solid ${drop.podDate ? 'rgba(99,102,241,0.2)' : 'rgba(234,179,8,0.3)'}`,
            fontSize: 12,
          }}>
            {editingDate ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>📅 Tgl POD:</span>
                <input
                  type="date"
                  className="form-input"
                  value={localDate}
                  onChange={e => setLocalDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
                  autoFocus
                />
                <button className="btn btn-success btn-sm" style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' }} onClick={handleSaveDate} disabled={!localDate}>
                  Simpan
                </button>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setEditingDate(false)}>
                  Batal
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>📅 Tgl POD Aktual: </span>
                  {drop.podDate ? (
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {new Date(drop.podDate + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  ) : (
                    <span style={{ color: '#ca8a04', fontWeight: 600 }}>⚠️ Belum diisi</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 11, color: 'var(--color-primary)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(99,102,241,0.3)' }}
                  onClick={() => { setLocalDate(drop.podDate || new Date().toISOString().split('T')[0]); setEditingDate(true); }}
                  title="Edit Tanggal POD"
                >
                  ✏️ Edit
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <label
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
          onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragging(false); }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
          className={`upload-zone ${dragging ? 'drag-over' : ''}`}
          style={{ cursor: localDate ? 'pointer' : 'not-allowed', display: 'block', opacity: localDate ? 1 : 0.6 }}
          title={localDate ? '' : 'Isi Tanggal POD terlebih dahulu'}
        >
          <input type="file" accept=".pdf,image/*" hidden
            onChange={e => {
              if (!localDate) return;
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Upload size={20} color={localDate ? 'var(--text-muted)' : '#ca8a04'} />
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {localDate ? 'Klik atau drag & drop Surat Jalan (PDF / Foto)' : '⚠️ Isi Tanggal POD Aktual dulu sebelum upload'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Format: PDF / Gambar</div>
          </div>
        </label>
      )}
    </div>
  );
}

function SuratJalanModal({ order, onClose }) {
  const { branding } = useTenant();
  const cleanClient = (order.clientName || '').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const pdfFileName = `SuratJalan_${order.id}_${cleanClient}`;

  React.useEffect(() => {
    const prevTitle = document.title;
    document.title = pdfFileName;
    return () => { document.title = prevTitle; };
  }, [pdfFileName]);

  const handlePrint = () => {
    document.title = pdfFileName;
    setTimeout(() => window.print(), 50);
  };

  const originLabel = order.origin
    ? `${order.origin.store || order.origin.city || ''}${order.origin.city ? `, ${order.origin.city}` : ''}`
    : `${order.originStore || order.originCity || '—'}`;

  const fmtDate = (d) => d
    ? new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const TH = ({ children, center, w }) => (
    <th style={{
      border: '1px solid #999', padding: '8px 10px',
      background: '#f5f5f5', fontWeight: 700, fontSize: 11,
      textAlign: center ? 'center' : 'left',
      whiteSpace: 'nowrap',
      ...(w ? { width: w } : {}),
    }}>{children}</th>
  );
  const TD = ({ children, center, bold }) => (
    <td style={{
      border: '1px solid #bbb', padding: '10px 10px',
      fontSize: 11, textAlign: center ? 'center' : 'left',
      fontWeight: bold ? 700 : 400,
      verticalAlign: 'middle',
    }}>{children}</td>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: 860, background: '#ffffff', color: '#000000', padding: 32, borderRadius: 8 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Toolbar — no-print */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #ddd', paddingBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📄 Pratinjau Surat Jalan — {order.id}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={14} /> Cetak / Save PDF
            </button>
            <button className="btn btn-secondary" onClick={onClose}>Tutup</button>
          </div>
        </div>

        {/* ═══════════════ PRINTABLE DOCUMENT ═══════════════ */}
        <div className="printable-doc" style={{ fontFamily: 'Arial, sans-serif', color: '#000', lineHeight: 1.5, padding: '0 4px' }}>

          {/* ── LETTERHEAD ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            {/* Logo kiri */}
            <div>
              {branding.logoImage ? (
                <img src={branding.logoImage} alt={branding.sidebarTitle} style={{ height: 60, width: 'auto', objectFit: 'contain' }} />
              ) : (
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 1, color: '#2d5f5f' }}>{branding.sidebarTitle}</div>
              )}
            </div>
            {/* Info perusahaan kanan */}
            <div style={{ textAlign: 'right', fontSize: 10, color: '#333', lineHeight: 1.7 }}>
              <div>Sentra Timur K11 AB, Cakung Jakarta</div>
              <div>Telp : 021- 29824542</div>
              <div>Email : gcxpress.logistik@gmail.com</div>
            </div>
          </div>

          {/* Garis pemisah tebal */}
          <hr style={{ border: 'none', borderTop: '2.5px solid #000', margin: '10px 0 16px' }} />

          {/* Judul dokumen */}
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>
            SURAT JALAN
          </div>

          {/* Info klien */}
          <div style={{ fontSize: 11, marginBottom: 14, lineHeight: 1.8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontWeight: 700, minWidth: 70 }}>Company</span>
              <span>{order.clientName || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontWeight: 700, minWidth: 70 }}>No. DO</span>
              <span>{order.id}{order.soNumber ? ` / SO: ${order.soNumber}` : ''}</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontWeight: 700, minWidth: 70 }}>Tgl Terbit</span>
              <span>{fmtDate(order.date)}</span>
            </div>
          </div>

          {/* Perihal & detail */}
          <div style={{ fontSize: 11, marginBottom: 14, lineHeight: 2 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ minWidth: 60 }}>Perihal</span>
              <span>: Surat Jalan Pengiriman Barang</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ minWidth: 60 }}>Sopir</span>
              <span>: {order.driverName || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ minWidth: 60 }}>Armada</span>
              <span>: {order.fleetPlate || '—'}{order.vendorName ? ` (${order.vendorName})` : ''}</span>
            </div>
          </div>

          {/* ── TABEL DROP POINTS (Without Selling Price) ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 8 }}>
            <thead>
              <tr>
                <TH center w="36">No</TH>
                <TH>Origin</TH>
                <TH>Destination</TH>
                <TH center>DO Number</TH>
                <TH center w="52">Unit</TH>
                <TH center w="70">Muatan</TH>
                <TH center w="88">Tgl POD</TH>
                <TH center w="80">Status</TH>
              </tr>
            </thead>
            <tbody>
              {(order.drops || []).map((drop, idx) => (
                <tr key={drop.id || idx}>
                  <TD center>{idx + 1}</TD>
                  <TD>{originLabel}</TD>
                  <TD bold>{drop.store || drop.city || '—'}{drop.city && drop.store ? `, ${drop.city}` : ''}</TD>
                  <TD center>{order.id}</TD>
                  <TD center>{order.serviceType || 'FTL'}</TD>
                  <TD center>
                    {order.kubikasi ? `${order.kubikasi} CBM` : ''}
                    {order.kubikasi && order.tonase ? ' / ' : ''}
                    {order.tonase ? `${order.tonase} Ton` : ''}
                    {!order.kubikasi && !order.tonase ? '—' : ''}
                  </TD>
                  <TD center>
                    {(drop.podDate || order.podDate)
                      ? new Date((drop.podDate || order.podDate) + ((drop.podDate || order.podDate).includes('T') ? '' : 'T00:00:00')).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </TD>

                  <TD center>{drop.pod ? 'Diterima ✓' : 'Proses'}</TD>
                </tr>
              ))}
              {/* TOTAL row */}
              <tr>
                <td colSpan={7} style={{ border: '1px solid #bbb', padding: '8px 10px', fontWeight: 700, fontSize: 11 }}>
                  TOTAL DROP POINT
                </td>
                <TD center bold>{order.drops?.length || 0} Titik</TD>
              </tr>
            </tbody>
          </table>

          {/* Catatan */}
          <div style={{ fontSize: 10, marginTop: 14, marginBottom: 28, lineHeight: 1.8, color: '#333' }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Nb :</div>
            <div>Barang diterima dalam kondisi baik dan lengkap sesuai dokumen.</div>
            <div>Segala klaim atas kerusakan/kehilangan wajib dilaporkan saat penerimaan.</div>
            {order.notes && <div style={{ marginTop: 4 }}><strong>Catatan:</strong> {order.notes}</div>}
            {order.pickupDate && <div style={{ fontWeight: 700, marginTop: 6 }}>ETD: {fmtDate(order.pickupDate)}</div>}
            {order.etaDate   && <div style={{ fontWeight: 700 }}>ETA: {fmtDate(order.etaDate)}</div>}
          </div>

          {/* ── TANDA TANGAN 3 KOLOM (Termasuk Sopir) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, fontSize: 10, marginTop: 8 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Dibuat Oleh,</div>
              <div>{branding.name || 'PT Gerak Cepat Indonesia'}</div>
              <div style={{ height: 56 }} />
              <div style={{ borderTop: '1px solid #999', paddingTop: 4, marginTop: 4 }}>
                ( __________________ )
              </div>
              <div style={{ color: '#444', marginTop: 2 }}>Dispatcher / Admin</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Pengemudi,</div>
              <div style={{ height: 56 }} />
              <div style={{ borderTop: '1px solid #999', paddingTop: 4, marginTop: 4 }}>
                ( <strong>{order.driverName || '______________'}</strong> )
              </div>
              <div style={{ color: '#444', marginTop: 2 }}>Sopir</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Menyetujui,</div>
              <div>{order.clientName || '—'}</div>
              <div style={{ height: 56 }} />
              <div style={{ borderTop: '1px solid #999', paddingTop: 4, marginTop: 4 }}>
                ( __________________ )
              </div>
              <div style={{ color: '#444', marginTop: 2 }}>Penerima Barang</div>
            </div>
          </div>

        </div>{/* end printable-doc */}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SURAT PENAWARAN HARGA (QUOTATION / SPH) MODAL
   ══════════════════════════════════════════════════════════════════════════ */
function SPHModal({ order, onClose }) {
  const { branding } = useTenant();
  const cleanClient = (order.clientName || '').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const pdfFileName = `PenawaranHarga_${order.id}_${cleanClient}`;

  React.useEffect(() => {
    const prevTitle = document.title;
    document.title = pdfFileName;
    return () => { document.title = prevTitle; };
  }, [pdfFileName]);

  const handlePrint = () => {
    document.title = pdfFileName;
    setTimeout(() => window.print(), 50);
  };

  const originLabel = order.origin
    ? `${order.origin.store || order.origin.city || ''}${order.origin.city ? `, ${order.origin.city}` : ''}`
    : `${order.originStore || order.originCity || '—'}`;

  const fmtDate = (d) => d
    ? new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const TH = ({ children, center, w }) => (
    <th style={{
      border: '1px solid #000', padding: '8px 10px',
      background: '#ffffff', fontWeight: 700, fontSize: 11,
      textAlign: center ? 'center' : 'left',
      whiteSpace: 'nowrap',
      ...(w ? { width: w } : {}),
    }}>{children}</th>
  );
  const TD = ({ children, center, bold, right }) => (
    <td style={{
      border: '1px solid #000', padding: '10px 10px',
      fontSize: 11, textAlign: right ? 'right' : center ? 'center' : 'left',
      fontWeight: bold ? 700 : 400,
      verticalAlign: 'middle',
    }}>{children}</td>
  );

  const totalSelling = order.totalValue || order.sellingRate || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: 880, background: '#ffffff', color: '#000000', padding: 36, borderRadius: 8 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Toolbar — no-print */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #ddd', paddingBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📄 Pratinjau Surat Penawaran Harga (SPH) — {order.id}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={14} /> Cetak / Save PDF
            </button>
            <button className="btn btn-secondary" onClick={onClose}>Tutup</button>
          </div>
        </div>

        {/* ═══════════════ PRINTABLE DOCUMENT ═══════════════ */}
        <div className="printable-doc" style={{ fontFamily: 'Arial, sans-serif', color: '#000', lineHeight: 1.5, padding: '0 4px' }}>

          {/* ── LETTERHEAD ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              {branding.logoImage ? (
                <img src={branding.logoImage} alt={branding.sidebarTitle} style={{ height: 60, width: 'auto', objectFit: 'contain' }} />
              ) : (
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 1, color: '#2d5f5f' }}>{branding.sidebarTitle}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: 10, color: '#333', lineHeight: 1.7 }}>
              <div>Sentra Timur K11 AB, Cakung Jakarta</div>
              <div>Telp : 021- 29824542</div>
              <div>Email : gcxpress.logistik@gmail.com</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, letterSpacing: 1, margin: '18px 0 16px' }}>
            PENAWARAN HARGA
          </div>

          <hr style={{ border: 'none', borderTop: '2.5px solid #000', margin: '10px 0 16px' }} />

          {/* Info Company & Address */}
          <div style={{ fontSize: 11, marginBottom: 14, lineHeight: 1.8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontWeight: 700, minWidth: 70 }}>Company</span>
              <span style={{ fontWeight: 700 }}>: {order.clientName || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontWeight: 700, minWidth: 70 }}>Address</span>
              <span>: {order.originStore || order.originCity || 'Indonesia'}</span>
            </div>
          </div>

          {/* Perihal & Up */}
          <div style={{ fontSize: 11, marginBottom: 16, lineHeight: 2 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontWeight: 700, minWidth: 70 }}>Perihal</span>
              <span>: Penawaran Harga</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontWeight: 700, minWidth: 70 }}>Up</span>
              <span>: Bapak/Ibu {order.clientName || 'Management'}</span>
            </div>
          </div>

          {/* ── TABEL SPH ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 0 }}>
            <thead>
              <tr>
                <TH center w="36">No</TH>
                <TH center w="110">Origin</TH>
                <TH center w="140">Destination</TH>
                <TH center w="100">DO Number</TH>
                <TH center w="50">Unit</TH>
                <TH center w="100">Price</TH>
                <TH center w="80">Qty/Collie</TH>
                <TH center w="80">Leadtime</TH>
                <TH center w="110">Total Price</TH>
              </tr>
            </thead>
            <tbody>
              {(order.drops || []).map((drop, idx) => {
                const itemPrice = drop.price || drop.sellingPrice || (totalSelling / (order.drops?.length || 1));
                return (
                  <tr key={drop.id || idx}>
                    <TD center>{idx + 1}</TD>
                    <TD center>{originLabel}</TD>
                    <TD center bold>{drop.store || drop.city || '—'}</TD>
                    <TD center>{order.id}</TD>
                    <TD center>{order.serviceType || 'FTL'}</TD>
                    <TD center>{formatRupiah(itemPrice)}</TD>
                    <TD center>
                      {order.kubikasi ? `${order.kubikasi} CBM` : (order.tonase ? `${order.tonase} Ton` : '1 koli')}
                    </TD>
                    <TD center>
                      {order.etaDate && order.pickupDate
                        ? `${Math.max(1, Math.round((new Date(order.etaDate) - new Date(order.pickupDate)) / (1000 * 60 * 60 * 24)))} Hari`
                        : '1-3 Hari'}
                    </TD>
                    <TD center bold>{formatRupiah(itemPrice)}</TD>
                  </tr>
                );
              })}
              {/* TOTAL row */}
              <tr>
                <td colSpan={8} style={{ border: '1px solid #000', padding: '8px 10px', fontWeight: 700, fontSize: 11 }}>
                  TOTAL
                </td>
                <TD center bold style={{ border: '1px solid #000' }}>
                  {formatRupiah(totalSelling)}
                </TD>
              </tr>
            </tbody>
          </table>

          {/* Nb / Catatan SPH */}
          <div style={{ fontSize: 10, marginTop: 14, marginBottom: 28, lineHeight: 1.8, color: '#000' }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Nb :</div>
            <div>Harga tidak termasuk Asuransi</div>
            <div>Harga Tidak termasuk Biaya Bongkar dan Muat</div>
            <div>Harga di luar PPN 1.1%</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>Schedule :</div>
            <div>ETD {fmtDate(order.pickupDate || order.date)}</div>
            <div>ETA {fmtDate(order.etaDate || order.date)}</div>
          </div>

          {/* ── TANDA TANGAN & REKENING (Tanpa Sopir) ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 10, marginTop: 16 }}>
            {/* Info Rekening Bank Kiri */}
            <div style={{ lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Pembayaran Dapat di transfer ke :</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontWeight: 700, minWidth: 60 }}>Bank</span>
                <span>: Maybank</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontWeight: 700, minWidth: 60 }}>Acc No</span>
                <span>: 2779002379</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontWeight: 700, minWidth: 60 }}>A/n</span>
                <span>: {branding.name || 'PT Gerak Cepat Indonesia'}</span>
              </div>
            </div>

            {/* Dibuat Oleh */}
            <div style={{ textAlign: 'center', minWidth: 160 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Dibuat Oleh,</div>
              <div style={{ fontWeight: 700 }}>{branding.name || 'PT Gerak Cepat Indonesia'}</div>
              <div style={{ height: 60 }} />
              <div style={{ fontWeight: 700 }}>( Admin / Finance )</div>
            </div>

            {/* Menyetujui Klien */}
            <div style={{ textAlign: 'center', minWidth: 180 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Menyetujui,</div>
              <div style={{ fontWeight: 700 }}>{order.clientName || '—'}</div>
              <div style={{ height: 60 }} />
              <div style={{ fontWeight: 700 }}>( ___________________ )</div>
            </div>
          </div>

        </div>{/* end printable-doc */}
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const id = params.id;
  const splat = params['*'];
  const targetId = id
    ? (splat ? `${id}/${splat}` : id)
    : decodeURIComponent(location.pathname.replace('/transport/orders/', ''));

  const { orders, updateDropPOD, closeOrder, markDPPaid, updateShipmentStatus } = useOrderStore();
  const { invoices, markPaid, addInvoice } = useInvoiceStore();
  const { addToast } = useToastStore();
  const [confirmClose, setConfirmClose] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSPHModal, setShowSPHModal] = useState(false);

  // Tanggal POD modal
  const [showPODDateModal, setShowPODDateModal] = useState(false);
  const [podDateInput, setPodDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [pendingStatus, setPendingStatus] = useState(null);

  const order = orders.find(o => o.id === targetId || o.id === id || encodeURIComponent(o.id) === targetId || o.soNumber === targetId);
  if (!order) return (
    <div className="empty-state">
      <div className="empty-state-icon">🔍</div>
      <div className="empty-state-title">Order tidak ditemukan</div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)}>Kembali</button>
    </div>
  );

  // Vendor Tracking Link State for this DO
  const [vendorLink, setVendorLink] = useState(null);
  const [loadingVendorLink, setLoadingVendorLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchLink = async () => {
      setLoadingVendorLink(true);
      try {
        const links = await gpsApi.getTrackingLinks({ search: order?.id });
        if (isMounted) {
          const match = Array.isArray(links)
            ? links.find(l => l.doReference === order?.id || (order?.soNumber && l.doReference === order?.soNumber))
            : null;
          setVendorLink(match || null);
        }
      } catch (err) {
        console.error('Failed to load tracking link for DO:', err);
      } finally {
        if (isMounted) setLoadingVendorLink(false);
      }
    };
    if (order?.id) {
      fetchLink();
    }
    return () => { isMounted = false; };
  }, [order?.id, order?.soNumber]);

  const dpInvoice = invoices.find(inv => inv.orderId === id && inv.type === 'dp');
  const finalInvoice = invoices.find(inv => inv.orderId === id && (inv.type === 'pelunasan' || inv.type === 'top_full'));
  const { done, total, pct } = getDropProgress(order.drops);

  const isTop = order.paymentType && order.paymentType.startsWith('TOP');
  const SHIPMENT_STATUSES = ['picked_up', 'in_transit', 'en_route', 'delivered'];
  const currentStepIdx = SHIPMENT_STATUSES.indexOf(order.status);
  const isInShipment = currentStepIdx >= 0;
  const isDelivered = order.status === 'delivered';
  const allPODDone = allPODUploaded(order.drops);

  // POD upload only allowed when status = Delivered
  // Close/Invoice only after Delivered + all POD done
  const topInvoiceGenerated = isTop && finalInvoice != null;
  const canClose = isDelivered && allPODDone && !isTop && order.status !== 'selesai';
  const canGenerateTopInvoice = isTop && isDelivered && allPODDone && order.invoicePending && !topInvoiceGenerated;

  const handleUpload = async (dropId, fileOrName, podDate = null) => {
    if (!fileOrName) {
      updateDropPOD(id, dropId, null, null, true);
      await apiSync.removePODFile(id, dropId);
      addToast(`POD Drop dibatalkan. Silakan upload ulang file Surat Jalan.`, 'info');
      return;
    }

    if (typeof fileOrName === 'object' && fileOrName instanceof File) {
      addToast(`Mengupload file ${fileOrName.name}...`, 'info');
      const savedFilename = await apiSync.uploadPODFile(id, dropId, fileOrName, podDate);
      updateDropPOD(id, dropId, savedFilename || fileOrName.name, podDate);
      const dateStr = podDate ? ` | Tgl POD: ${new Date(podDate + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}` : '';
      addToast(`POD Drop (${fileOrName.name}) berhasil diupload!${dateStr}`, 'success');
    } else {
      updateDropPOD(id, dropId, fileOrName, podDate);
      addToast(`POD Drop berhasil diupload!`, 'success');
    }
  };

  // Standalone: update only the pod date for an already-uploaded drop (via ✏️ Edit button)
  const handleUpdateDropPodDate = async (dropId, podDate) => {
    updateDropPOD(id, dropId, null, podDate); // null filename preserves existing file
    await apiSync.updateDropPodDate(id, dropId, podDate);
    addToast(`Tanggal POD diperbarui: ${new Date(podDate + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 'success');
  };


  // Update shipment tracking status (Picked Up → In Transit → En Route → Delivered)
  // When user selects 'delivered', show Tanggal POD modal first
  const handleUpdateShipmentStatus = (newStatus) => {
    if (newStatus === 'delivered') {
      setPendingStatus(newStatus);
      setPodDateInput(new Date().toISOString().split('T')[0]);
      setShowPODDateModal(true);
      return;
    }
    updateShipmentStatus(id, newStatus);
    const labels = { picked_up: 'Picked Up', in_transit: 'In Transit', en_route: 'En Route to Destination', delivered: 'Delivered' };
    addToast(`Status pengiriman diperbarui: ${labels[newStatus]}`, 'success');
  };

  const handleConfirmDelivered = () => {
    if (!podDateInput) {
      addToast('Tanggal POD wajib diisi!', 'error');
      return;
    }
    updateShipmentStatus(id, 'delivered', podDateInput);
    addToast(`Status diperbarui: Delivered | Tanggal POD: ${podDateInput}`, 'success');
    setShowPODDateModal(false);
    setPendingStatus(null);
  };

  // For TOP orders: generate invoice after Delivered + all POD uploaded
  const handleGenerateTopInvoice = () => {
    const topDays = order.topDays || 30;
    const deliveredDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + topDays * 86400000).toISOString().split('T')[0];
    addInvoice({
      id: `INV-TOP-${id}`,
      orderId: id,
      clientName: order.clientName,
      type: 'top_full',
      amount: order.totalValue,
      date: deliveredDate,
      dueDate: dueDate,
      status: 'unpaid',
      paymentType: order.paymentType,
      topDays,
    });
    addToast(`✅ Invoice ${order.paymentType} (${formatRupiah(order.totalValue)}) diterbitkan! Jatuh tempo: ${dueDate}.`, 'success');
  };

  // For 70:30: close order and issue 30% final invoice
  const handleClose = () => {
    closeOrder(id);
    if (!isTop) {
      addInvoice({
        id: `INV-LNS-${id}`,
        orderId: id,
        clientName: order.clientName,
        type: 'pelunasan',
        amount: order.finalAmount,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        status: 'unpaid',
      });
      addToast(`Order ${id} selesai! Invoice Pelunasan 30% diterbitkan.`, 'success');
    } else {
      addToast(`Order ${id} ditutup.`, 'success');
    }
    setConfirmClose(false);
  };

  const handleMarkDPPaid = () => {
    if (dpInvoice) markPaid(dpInvoice.id);
    markDPPaid(id);
    addToast('DP lunas! Order siap ditugaskan.', 'success');
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Kembali</button>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
          </div>
          <h1 className="page-title">{order.id}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <span className={`badge ${statusBadgeClass[order.status] || 'badge-active'}`}>{statusLabels[order.status] || order.status}</span>
            <span className={`badge ${paymentBadgeClass[order.paymentStatus]}`}>{paymentLabels[order.paymentStatus]}</span>
            {isTop && order.invoicePending && !topInvoiceGenerated && (
              <span className="badge badge-pending" style={{ fontSize: 10 }}>⏳ Invoice Pending (Delivered + POD)</span>
            )}
            {topInvoiceGenerated && (
              <span className="badge badge-done" style={{ fontSize: 10 }}>✅ Invoice TOP Diterbitkan</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowPrintModal(true)}>
            <Printer size={15} /> Cetak Surat Jalan
          </button>
          <button className="btn btn-secondary" onClick={() => setShowSPHModal(true)}>
            <FileText size={15} /> Cetak Quotation / SPH
          </button>
          {order.status === 'menunggu_dp' && (
            <button className="btn btn-success" onClick={handleMarkDPPaid}>
              ✅ Tandai DP Lunas
            </button>
          )}
          {['menunggu_dp', 'aktif'].includes(order.status) && !order.driverId && (
            <button className="btn btn-primary" onClick={() => navigate('/transport/assignments')}>
              Tugaskan Sopir & Armada
            </button>
          )}
          {/* Shipment Status Dropdown — always free to change when in shipment */}
          {isInShipment && order.status !== 'selesai' && (
            <select
              className="form-input form-select"
              style={{ fontSize: 13, height: 36, padding: '0 10px', borderRadius: 8 }}
              value={order.status}
              onChange={e => handleUpdateShipmentStatus(e.target.value)}
            >
              <option value="picked_up">📦 Picked Up</option>
              <option value="in_transit">🚛 In Transit</option>
              <option value="en_route">📍 En Route to Destination</option>
              <option value="delivered">✅ Delivered</option>
            </select>
          )}
          {/* TOP: Terbitkan Invoice — only after Delivered + all POD */}
          {canGenerateTopInvoice && (
            <button className="btn btn-success btn-lg" onClick={handleGenerateTopInvoice}>
              📋 Terbitkan Invoice {order.paymentType}
            </button>
          )}
          {/* TOP: delivered but POD not done yet */}
          {isTop && isDelivered && !allPODDone && order.invoicePending && !topInvoiceGenerated && (
            <div className="tooltip-wrap">
              <button className="btn btn-primary btn-lg" disabled>
                📋 Terbitkan Invoice
              </button>
              <div className="tooltip-tip">Upload semua POD terlebih dahulu ({done}/{total})</div>
            </div>
          )}
          {/* 70:30: Selesaikan — only after Delivered + all POD */}
          {canClose ? (
            <button className="btn btn-success btn-lg" onClick={() => setConfirmClose(true)}>
              🔒 Selesaikan Order
            </button>
          ) : !isTop && isDelivered && !allPODDone && (
            <div className="tooltip-wrap">
              <button className="btn btn-primary btn-lg" disabled>
                🔒 Selesaikan
              </button>
              <div className="tooltip-tip">Upload semua POD terlebih dahulu ({done}/{total})</div>
            </div>
          )}
        </div>
      </div>

      {/* Shipment Progress Tracker */}
      {isInShipment && (
        <div className="card" style={{ marginBottom: 16, padding: '16px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
            📍 Status Pengiriman
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {['picked_up', 'in_transit', 'en_route', 'delivered'].map((step, idx) => {
              const labels = { picked_up: 'Picked Up', in_transit: 'In Transit', en_route: 'En Route to Destination', delivered: 'Delivered' };
              const icons = { picked_up: '📦', in_transit: '🚛', en_route: '📍', delivered: '✅' };
              const stepIdx = SHIPMENT_STATUSES.indexOf(step);
              const isDone = currentStepIdx > stepIdx;
              const isCurrent = currentStepIdx === stepIdx;
              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', flex: idx < 3 ? 1 : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 90 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700,
                      background: isDone ? 'var(--color-success-dim)' : isCurrent ? 'var(--color-primary-dim)' : 'var(--color-bg-base)',
                      border: `2px solid ${isDone ? 'var(--color-success)' : isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      color: isDone ? 'var(--color-success)' : isCurrent ? 'var(--color-primary)' : 'var(--text-muted)',
                    }}>
                      {isDone ? '✓' : icons[step]}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--color-primary)' : isDone ? 'var(--color-success)' : 'var(--text-muted)', textAlign: 'center' }}>
                      {labels[step]}
                    </div>
                  </div>
                  {idx < 3 && (
                    <div style={{ flex: 1, height: 2, background: isDone ? 'var(--color-success)' : 'var(--color-border)', margin: '0 4px', marginBottom: 20 }} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Status info banners */}
          {isTop && isDelivered && !topInvoiceGenerated && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-success-dim)', borderRadius: 8, fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
              ✅ Shipment Delivered — {allPODDone ? `Invoice ${order.paymentType} siap diterbitkan!` : `Upload semua POD (${done}/${total}) untuk terbitkan invoice.`}
            </div>
          )}
          {isTop && topInvoiceGenerated && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-primary-dim)', borderRadius: 8, fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
              📋 Invoice {order.paymentType} telah diterbitkan. Jatuh tempo: {finalInvoice?.dueDate ? formatDate(finalInvoice.dueDate) : '—'}
            </div>
          )}
          {isTop && !isDelivered && order.invoicePending && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(234,179,8,0.1)', borderRadius: 8, fontSize: 12, color: '#ca8a04', fontWeight: 600 }}>
              ⏳ Ubah status ke <strong>Delivered</strong> lalu upload semua POD untuk menerbitkan invoice {order.paymentType}
            </div>
          )}
          {!isTop && isDelivered && !allPODDone && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(234,179,8,0.1)', borderRadius: 8, fontSize: 12, color: '#ca8a04', fontWeight: 600 }}>
              ⏳ Upload semua POD ({done}/{total}) untuk menyelesaikan order
            </div>
          )}
        </div>
      )}

      {/* Surat Jalan & SPH Quotation Modals */}
      {showPrintModal && <SuratJalanModal order={order} onClose={() => setShowPrintModal(false)} />}
      {showSPHModal && <SPHModal order={order} onClose={() => setShowSPHModal(false)} />}

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Info */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Informasi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'No. Delivery Order', value: <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{order.id}</span> },
                { label: 'No. Sales Order', value: order.soNumber || <span style={{ color: 'var(--text-muted)' }}>—</span> },
                { label: 'Klien', value: order.clientName },
                { label: 'Tipe Service', value: <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }}>{order.serviceType || 'FTL'}</span> },
                { label: 'Tipe Pembayaran', value: <span className="badge badge-done" style={{ fontSize: 11 }}>{order.paymentType || 'DP 70:30'}</span> },
                { label: 'Jenis Unit / Armada', value: order.unitType ? <span style={{ fontWeight: 600 }}>{order.unitType}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span> },
                { label: 'Kubikasi (CBM)', value: order.kubikasi ? <span className="badge badge-active">{order.kubikasi}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span> },
                { label: 'Tonase / Berat (Freetaks)', value: (order.tonase || order.weight) ? <span style={{ fontWeight: 600 }}>{order.tonase || order.weight}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span> },
                { label: 'Tgl Pickup', value: formatDate(order.pickupDate || order.date) },
                { label: 'Tgl ETD (Berangkat)', value: order.etdDate ? formatDate(order.etdDate) : <span style={{ color: 'var(--text-muted)' }}>—</span> },
                { label: 'Tgl ETA (Estimasi Tiba)', value: order.etaDate ? formatDate(order.etaDate) : <span style={{ color: 'var(--text-muted)' }}>—</span> },
                { label: '📋 Tgl POD (Actual Delivered)', value: order.podDate ? <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{formatDate(order.podDate)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span> },
                // Sopir & Armada
                { label: 'Sopir', value: order.driverName || <span style={{ color: 'var(--text-muted)' }}>Belum ditugaskan</span> },
                { label: 'Armada', value: order.fleetPlate || <span style={{ color: 'var(--text-muted)' }}>—</span> },
                { label: 'Vendor Armada', value: order.vendorName || <span style={{ color: 'var(--text-muted)' }}>—</span> },
                { label: 'Catatan', value: order.notes || <span style={{ color: 'var(--text-muted)' }}>—</span> },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* External GPS Tracking Link Card */}
          <div className="card" style={{ border: vendorLink ? '1px solid #c7d2fe' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Navigation size={14} color="var(--color-primary)" /> GPS Tracking Vendor
              </h3>
              {vendorLink && (
                <span className={`badge ${vendorLink.isExpired || vendorLink.status === 'EXPIRED' ? 'badge-waiting' : vendorLink.status === 'ACTIVE' ? 'badge-done' : 'badge-draft'}`} style={{ fontSize: 10 }}>
                  {vendorLink.isExpired || vendorLink.status === 'EXPIRED' ? 'Expired' : vendorLink.status === 'ACTIVE' ? 'Aktif' : vendorLink.status}
                </span>
              )}
            </div>

            {vendorLink ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Vendor:</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vendorLink.vendorName}</div>
                </div>

                {vendorLink.vehiclePlate && (
                  <div style={{ fontSize: 12 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Armada / Driver:</div>
                    <div>{vendorLink.vehiclePlate} {vendorLink.driverName ? `• ${vendorLink.driverName}` : ''}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => window.open(vendorLink.trackingUrl, '_blank', 'noopener,noreferrer')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11 }}
                  >
                    <ExternalLink size={12} /> Buka Tracking
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(vendorLink.trackingUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                      addToast('Tautan tracking berhasil disalin!', 'success');
                    }}
                    title="Salin Tautan Tracking"
                    style={{ padding: '0 8px' }}
                  >
                    {copiedLink ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '6px 0' }}>
                <div style={{ marginBottom: 8, fontSize: 11 }}>Belum ada link tracking GPS eksternal untuk DO ini.</div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/master/locations')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11 }}
                >
                  <Plus size={12} /> Daftarkan di Master Lokasi
                </button>
              </div>
            )}
          </div>

          {/* Finance */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Keuangan</h3>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Nilai Order</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{formatRupiah(order.totalValue)}</div>
              
              {order.costBreakdown && (
                <div style={{ background: 'var(--color-bg-base)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--color-border)', marginTop: 8, fontSize: 11 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Rincian Selling & Buying:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tarif Utama (Selling):</span>
                    <span>{formatRupiah(order.costBreakdown.baseFreight)}</span>
                  </div>
                  {(order.buyingPrice > 0 || order.costBreakdown.buyingPrice > 0) && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}>
                        <span>Harga Buying (Vendor):</span>
                        <span>{formatRupiah(order.buyingPrice || order.costBreakdown.buyingPrice)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: (order.totalValue - (order.buyingPrice || order.costBreakdown.buyingPrice)) >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                        <span>Profit Margin:</span>
                        <span>{formatRupiah(order.totalValue - (order.buyingPrice || order.costBreakdown.buyingPrice))}</span>
                      </div>
                    </>
                  )}
                  {order.costBreakdown.ppnFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}>
                      <span>PPN (1.1%):</span>
                      <span>+{formatRupiah(order.costBreakdown.ppnFee)}</span>
                    </div>
                  )}
                  {order.costBreakdown.tkbmFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>TKBM:</span>
                      <span>+{formatRupiah(order.costBreakdown.tkbmFee)}</span>
                    </div>
                  )}
                  {order.costBreakdown.kraniFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Krani / Tally:</span>
                      <span>+{formatRupiah(order.costBreakdown.kraniFee)}</span>
                    </div>
                  )}
                  {order.costBreakdown.otherFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Lainnya:</span>
                      <span>+{formatRupiah(order.costBreakdown.otherFee)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* DP Invoice (70:30 only) */}
              {!isTop && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: dpInvoice?.status === 'paid' ? 'var(--color-success-dim)' : 'var(--color-warning-dim)',
                border: `1px solid ${dpInvoice?.status === 'paid' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Invoice DP (70%)</span>
                  <span className={`badge ${dpInvoice?.status === 'paid' ? 'badge-done' : 'badge-pending'}`}>
                    {dpInvoice?.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: dpInvoice?.status === 'paid' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {formatRupiah(order.dpAmount)}
                </div>
                {dpInvoice && (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, fontSize: 11, padding: 0 }} onClick={() => navigate(`/finance/invoices/${dpInvoice.id}`)}>
                    📄 Lihat & Cetak Invoice DP
                  </button>
                )}
              </div>
              )}
              {/* Final Invoice (70:30 = Pelunasan 30%, TOP = Full invoice) */}
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: finalInvoice ? (finalInvoice.status === 'paid' ? 'var(--color-success-dim)' : 'var(--color-warning-dim)') : 'var(--color-bg-input)',
                border: `1px solid ${finalInvoice?.status === 'paid' ? 'rgba(34,197,94,0.2)' : 'var(--color-border)'}`,
                opacity: !finalInvoice ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>
                    {isTop ? `Invoice ${order.paymentType} (Full)` : 'Invoice Pelunasan (30%)'}
                  </span>
                  {finalInvoice && (
                    <span className={`badge ${finalInvoice.status === 'paid' ? 'badge-done' : 'badge-pending'}`}>
                      {finalInvoice.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                    </span>
                  )}
                  {!finalInvoice && <span className="badge badge-draft">Belum Terbit</span>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: finalInvoice?.status === 'paid' ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                  {isTop ? formatRupiah(order.totalValue) : formatRupiah(order.finalAmount)}
                </div>
                {finalInvoice ? (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, fontSize: 11, padding: 0 }} onClick={() => navigate(`/finance/invoices/${finalInvoice.id}`)}>
                    📄 Lihat & Cetak Invoice {isTop ? order.paymentType : '30%'}
                  </button>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {isTop
                      ? `Terbit setelah status Delivered & semua POD diupload`
                      : 'Terbit setelah order ditutup'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Route Tracker */}
        <div>
          {/* Progress bar */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Progress Perjalanan</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? 'var(--color-success)' : 'var(--color-primary)' }}>
                {done}/{total} Drop Points
              </span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className={`progress-fill ${pct === 100 ? 'success' : ''}`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Route Timeline + POD */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Upload POD (Proof of Delivery)
            </h3>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
              {isDelivered
                ? '✅ Shipment Delivered — Upload Surat Jalan (PDF) tiap drop point'
                : isInShipment
                  ? `⏳ POD akan tersedia setelah status berubah ke Delivered (Saat ini: ${statusLabels[order.status] || order.status})`
                  : '⚠️ Tugaskan sopir & armada terlebih dahulu'}
            </div>

            {/* Origin */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center', padding: '10px 14px', background: 'var(--color-primary-dim)', borderRadius: 8 }}>
              <div style={{ fontSize: 20 }}>📍</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Titik Asal (Muat)</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {order.origin?.store || order.originStore || order.origin?.city || order.originCity || '—'} — {order.origin?.city || order.originCity || '—'}, {order.origin?.province || order.originProvince || '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {(order.drops || []).map((drop, i) => (
                <React.Fragment key={drop.id}>
                  <div style={{ height: 12, width: 2, background: 'var(--color-border)', marginLeft: 20 }} />
                  {isDelivered ? (
                    <PODUploadCard drop={drop} onUpload={handleUpload} onUpdatePodDate={handleUpdateDropPodDate} />
                  ) : (
                    /* Locked state — POD not yet available */
                    <div style={{
                      background: 'var(--color-bg-base)', border: '1px solid var(--color-border)',
                      borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                      opacity: 0.6,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--color-bg-input)', color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                        border: '1px solid var(--color-border-light)',
                      }}>
                        {drop.seq}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{drop.store || drop.city}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{drop.city}, {drop.province}</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--color-bg-card)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                        🔒 Tersedia saat Delivered
                      </span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Info banners */}
            {isInShipment && !isDelivered && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, fontSize: 12, color: 'var(--color-primary)' }}>
                📦 Perbarui status ke <strong>Delivered</strong> menggunakan dropdown di atas, lalu upload POD setiap drop point.
              </div>
            )}
            {isDelivered && !allPODDone && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, fontSize: 12, color: '#ca8a04', fontWeight: 600 }}>
                ⏳ Upload semua POD ({done}/{total}) untuk {isTop ? `menerbitkan invoice ${order.paymentType}` : 'menyelesaikan order'}.
              </div>
            )}
            {isDelivered && allPODDone && !isTop && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-success-dim)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
                ✅ Semua POD lengkap! Klik <strong>Selesaikan Order</strong> untuk menerbitkan Invoice Pelunasan 30%.
              </div>
            )}
            {isDelivered && allPODDone && isTop && !topInvoiceGenerated && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-success-dim)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
                ✅ Semua POD lengkap! Klik <strong>Terbitkan Invoice {order.paymentType}</strong> di atas.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Close Modal */}
      {confirmClose && (
        <div className="modal-overlay" onClick={() => setConfirmClose(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Tutup & Selesaikan Order?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Semua <strong>{total} POD</strong> sudah diupload. Order akan ditutup dan Invoice Pelunasan <strong>{formatRupiah(order.finalAmount)}</strong> akan diterbitkan.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmClose(false)}>Batal</button>
              <button className="btn btn-success" onClick={handleClose}>Ya, Tutup Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Tanggal POD Modal — shown when user changes status to Delivered */}
      {showPODDateModal && (
        <div className="modal-overlay" onClick={() => setShowPODDateModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ padding: 28, maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              📋 Konfirmasi Status Delivered
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Masukkan <strong>Tanggal POD</strong> (tanggal aktual barang diterima di tujuan).
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Tanggal POD (Tanggal Aktual Delivered) *
              </label>
              <input
                type="date"
                className="form-input"
                value={podDateInput}
                onChange={e => setPodDateInput(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={{ width: '100%', fontSize: 14 }}
                autoFocus
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                * Tanggal ini akan dicatat sebagai bukti pengiriman (POD date) di sistem.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowPODDateModal(false); setPendingStatus(null); }}>
                Batal
              </button>
              <button className="btn btn-success" onClick={handleConfirmDelivered} disabled={!podDateInput}>
                ✅ Konfirmasi Delivered
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
