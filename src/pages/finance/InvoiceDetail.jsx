import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FileText, CheckCircle, Printer } from 'lucide-react';
import { useInvoiceStore, useOrderStore, useClientStore, useToastStore } from '../../store';
import { useTenant } from '../../context/TenantContext';
import {
  formatRupiah, formatDate, formatDateShort, terbilang,
  invoiceStatusLabel, invoiceStatusClass
} from '../../utils/helpers';
import './InvoicePrint.css';

export default function InvoiceDetail() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const id = params.id;
  const splat = params['*'];
  const targetId = id
    ? (splat ? `${id}/${splat}` : id)
    : decodeURIComponent(location.pathname.replace('/finance/invoices/', ''));

  const { invoices, markPaid } = useInvoiceStore();
  const { orders } = useOrderStore();
  const { clients } = useClientStore();
  const { addToast } = useToastStore();
  const { branding } = useTenant();

  const rawInvoice = invoices.find(i => i.id === targetId || i.id === id || encodeURIComponent(i.id) === targetId || i.orderId === targetId || (i.invoice && (i.invoice.id === targetId || i.invoice.id === id)));
  if (!rawInvoice) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-title">Invoice tidak ditemukan</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Kembali</button>
      </div>
    );
  }

  const invoice = rawInvoice.invoice
    ? { ...rawInvoice.invoice, date: rawInvoice.invoice.issueDate || rawInvoice.invoice.date, clientName: rawInvoice.invoice.clientName || rawInvoice.client?.name || '—' }
    : { ...rawInvoice, date: rawInvoice.date || rawInvoice.issueDate || rawInvoice.createdAt };

  const order = orders.find(o => o.id === invoice.orderId);
  const clientObj = clients.find(c => c.name === invoice.clientName || c.id === invoice.clientId);

  const podFiles = order?.drops?.filter(d => d.pod).map(d => d.pod) || [];
  const paymentType = invoice.paymentType || order?.paymentType || '70:30';
  const isTop = paymentType.startsWith('TOP');

  // Client Details
  const clientName = invoice.clientName || clientObj?.name || 'PT. SELALU SIAP SOLUSI';
  const clientAddress = clientObj?.address || order?.clientAddress || 'Jalan Palagan Tentara Pelajar Nomor 77 KM 7, RT 001/RW 033, Sedan, Sariharjo, Ngaglik, Sleman, Yogyakarta';

  // Origin & Drops
  const originText = order?.originCity || order?.originStore || order?.origin?.city || 'Jatake';
  const drops = order?.drops && order.drops.length > 0 ? order.drops : [
    { city: 'Palembang', store: 'OPP' },
    { city: 'Palembang', store: 'PTC' },
    { city: 'Palembang', store: 'NPI' },
    { city: 'Palembang', store: 'PSN' },
    { city: 'Medan', store: 'DPM' },
    { city: 'Medan', store: 'CPM' },
  ];


  const isMultiDrop = drops.length > 1;

  // Build From Summary (e.g. "Jatake to Sumatera Area")
  const lastDropName = drops[drops.length - 1]?.city || drops[drops.length - 1]?.store || 'Destination';
  const fromSummary = `${originText} to ${isMultiDrop ? lastDropName + ' Area' : lastDropName}`;

  // Vehicle & Driver
  const noMobil = order?.fleetPlate || 'B9523FXX';
  const driverName = order?.driverName || 'Jajang';

  // Rates & Financial Calculations
  const rates = order?.tarifSelling || invoice.amount || 23241875;
  const multiDropFee = isMultiDrop
    ? (order?.multiDropFee || (drops.length > 1 ? (drops.length - 1) * 75000 : 375000))
    : 0;
  const tkbmLangsir = (order?.biayaTKBM || 0) + (order?.biayaLain || 0);

  const totalRow = rates + multiDropFee + tkbmLangsir;
  const dpp = totalRow;
  const grandTotal = dpp;

  // Tagihan Percentage calculation
  let tagihanNominal = invoice.amount || grandTotal;
  let tagihanLabel = 'Tagihan';
  if (invoice.type === 'dp') {
    tagihanLabel = 'Tagihan 70%';
    if (!invoice.amount) tagihanNominal = Math.round(grandTotal * 0.7);
  } else if (invoice.type === 'pelunasan') {
    tagihanLabel = 'Tagihan 30%';
    if (!invoice.amount) tagihanNominal = Math.round(grandTotal * 0.3);
  } else {
    tagihanLabel = 'Tagihan 100%';
  }

  const cleanClient = (clientName || '').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const pdfTitle = `Invoice_${invoice.id}_${cleanClient}`;

  React.useEffect(() => {
    const prevTitle = document.title;
    document.title = pdfTitle;
    return () => {
      document.title = prevTitle;
    };
  }, [pdfTitle]);

  const handlePrintPDF = () => {
    document.title = pdfTitle;
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handleMergePDF = () => {
    const mergeTitle = `Invoice_SuratJalan_${invoice.id}_${cleanClient}`;
    document.title = mergeTitle;
    addToast(`Menggabungkan ${podFiles.length} Surat Jalan ke Invoice ${id}...`, 'info');
    setTimeout(() => {
      window.print();
      addToast(`PDF berhasil dicetak / digabungkan!`, 'success');
    }, 500);
  };

  const handleMarkPaid = () => {
    markPaid(id);
    if (invoice.type === 'pelunasan' || isTop) {
      useOrderStore.getState().markOrderLunas(invoice.orderId);
    }
    addToast(`Invoice ${id} ditandai Lunas!`, 'success');
  };

  return (
    <div>
      {/* Action Header */}
      <div className="page-header no-print">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            ← Kembali
          </button>
          <h1 className="page-title">{invoice.id}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <span className={`badge ${isTop ? 'badge-done' : invoice.type === 'dp' ? 'badge-active' : 'badge-done'}`}>
              💳 Pembayaran: {paymentType} ({isTop ? 'Full 100%' : invoice.type === 'dp' ? 'DP 70%' : 'Pelunasan 30%'})
            </span>
            <span className={`badge ${invoiceStatusClass[invoice.status]}`}>{invoiceStatusLabel[invoice.status]}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {podFiles.length > 0 && (
            <button className="btn btn-secondary" onClick={handleMergePDF}>
              <FileText size={14} /> Merge PDF + SJ ({podFiles.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={handlePrintPDF}>
            <Printer size={14} /> Cetak / Save PDF
          </button>
          {invoice.status === 'unpaid' && (
            <button className="btn btn-success" onClick={handleMarkPaid}>
              <CheckCircle size={14} /> Tandai Lunas
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* Printable Official Invoice Layout */}
        <div className="invoice-print-card">
          {/* Header */}
          <div className="invoice-top-header">
            <div className="invoice-logo-wrap">
              <img
                src={branding.logoImage || '/logo-vardh.png'}
                alt={branding.sidebarTitle}
              />
            </div>
            <div className="invoice-company-info">
              <div className="company-line">Sentra Timur K 11 AB</div>
              <div className="company-line">Cakung, Pulo Gebang</div>
              <div className="company-line">Jakarta Timur - DKI Jakarta</div>
              <div className="company-line">Telp : 0897-9146-445</div>
              <div className="company-line">Email : commercial@gci-express.com</div>
            </div>
          </div>

          <hr className="invoice-divider" />

          {/* Centered Document Title */}
          <div className="invoice-doc-title">INVOICE</div>

          {/* Metadata Grid */}
          <div className="invoice-meta-grid">
            <div className="invoice-meta-left">
              <div className="meta-row">
                <span className="meta-label">Company</span>
                <span className="meta-colon">:</span>
                <span className="meta-value"><strong>{clientName}</strong></span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Address</span>
                <span className="meta-colon">:</span>
                <span className="meta-value">{clientAddress}</span>
              </div>
            </div>

            <div className="invoice-meta-right">
              <div className="meta-row">
                <span className="meta-label">Invoice No</span>
                <span className="meta-colon">:</span>
                <span className="meta-value"><strong>{invoice.id}</strong></span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Date</span>
                <span className="meta-colon">:</span>
                <span className="meta-value">{formatDate(invoice.date)}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Term</span>
                <span className="meta-colon">:</span>
                <span className="meta-value">{paymentType}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">From</span>
                <span className="meta-colon">:</span>
                <span className="meta-value">{fromSummary}</span>
              </div>
            </div>
          </div>

          {/* Main Table (Multi-Drop vs Single Drop) */}
          <div className="invoice-table-wrapper">
            <table className="invoice-official-table">
              <thead>
                <tr>
                  <th>NO.</th>
                  <th>No. Surat Jalan</th>
                  <th>Tanggal Kirim</th>
                  <th>Origin</th>

                  {/* Multi Drop columns TRIP 1, TRIP 2 ... OR single Destination */}
                  {isMultiDrop ? (
                    drops.map((_, idx) => (
                      <th key={idx}>TRIP {idx + 1}</th>
                    ))
                  ) : (
                    <th>Destination</th>
                  )}

                  <th>NO MOBIL</th>
                  <th>DRIVER</th>
                  <th>RATES</th>
                  {isMultiDrop && <th>MULTI DROP</th>}
                  <th>KULI BONGKAR dan LANGSIR</th>
                  <th>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td className="font-bold">{order?.soNumber || order?.id || invoice.orderId}</td>
                  <td>{formatDateShort(order?.tanggalPickup || order?.createdAt || invoice.date)}</td>
                  <td>{originText}</td>

                  {/* Multi Drop TRIP cells vs Destination cell (Store - City only, no District) */}
                  {isMultiDrop ? (
                    drops.map((d, idx) => {
                      const storeName = d.store || d.toko || d.gudang;
                      const cityName  = d.city || d.kota;
                      let text = '—';
                      if (storeName && cityName) {
                        text = `${storeName} - ${cityName}`;
                      } else if (storeName) {
                        text = storeName;
                      } else if (cityName) {
                        text = cityName;
                      }
                      return <td key={idx}>{text}</td>;
                    })
                  ) : (
                    <td>
                      {(() => {
                        const d0 = drops[0] || {};
                        const storeName = d0.store || d0.toko || d0.gudang;
                        const cityName  = d0.city || d0.kota || order?.destinationCity;
                        if (storeName && cityName) return `${storeName} - ${cityName}`;
                        return storeName || cityName || 'Destination';
                      })()}
                    </td>
                  )}


                  <td>{noMobil}</td>
                  <td>{driverName}</td>
                  <td className="text-right">{formatRupiah(rates)}</td>
                  {isMultiDrop && (
                    <td className="text-right">{multiDropFee > 0 ? formatRupiah(multiDropFee) : 'Rp -'}</td>
                  )}
                  <td className="text-right">{tkbmLangsir > 0 ? formatRupiah(tkbmLangsir) : 'Rp -'}</td>
                  <td className="text-right font-bold">{formatRupiah(totalRow)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Terbilang & Calculations Summary */}
          <div className="invoice-summary-section">
            <div className="invoice-terbilang-box">
              {terbilang(tagihanNominal)}
            </div>

            <div className="invoice-calc-box">
              <div className="calc-row">
                <span>DPP</span>
                <span>{formatRupiah(dpp)}</span>
              </div>
              <div className="calc-row">
                <span>Grand Total</span>
                <span>{formatRupiah(grandTotal)}</span>
              </div>
              <div className="calc-row tagihan-highlight">
                <span>{tagihanLabel}</span>
                <span>{formatRupiah(tagihanNominal)}</span>
              </div>
            </div>
          </div>

          {/* Footer Bank Info & Signature */}
          <div className="invoice-footer-section">
            <div className="invoice-bank-details">
              <div className="bank-header">Pembayaran Dapat di transfer ke :</div>
              <div className="bank-info-line">
                <span className="b-label">Bank</span>
                <span>: Maybank</span>
              </div>
              <div className="bank-info-line">
                <span className="b-label">Acc No</span>
                <span>: 277-900-2379</span>
              </div>
              <div className="bank-info-line">
                <span className="b-label">A/n</span>
                <span>: PT Gerak Cepat Indonesia</span>
              </div>
            </div>

            <div className="invoice-signature-block">
              <div className="sig-company">PT Gerak Cepat Indonesia</div>
              <div className="sig-name">Ayu Rahmawati</div>
              <div className="sig-title">Finance and Tax Specialist</div>
            </div>
          </div>
        </div>

        {/* Right Action Panel (Non-printable) */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Status Pembayaran
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Diterbitkan', 'Dikirim ke Klien', 'Dibayar'].map((step, i) => {
                const done = invoice.status === 'paid' ? true : i < 1;
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: done ? 'var(--color-success-dim)' : 'var(--color-bg-input)',
                      border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'}`,
                      color: done ? 'var(--color-success)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span style={{ color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* POD attachments */}
          {(invoice.type === 'pelunasan' || invoice.type === 'top_full') && (
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Lampiran Surat Jalan
              </h3>
              {podFiles.length > 0 ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {podFiles.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--color-bg-base)', borderRadius: 6, fontSize: 12 }}>
                        <FileText size={13} color="var(--color-primary)" />
                        <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleMergePDF}>
                    <Printer size={14} /> Merge PDF & Cetak ({podFiles.length} SJ)
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                  Belum ada Surat Jalan yang diupload
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
