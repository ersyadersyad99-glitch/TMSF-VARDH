// Mock data — semua data dummy untuk demonstrasi

export const mockClients = [];

export const mockLocations = {
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

export const mockVendors = [];

export const mockDrivers = [];

export const mockFleet = [];

export const mockOrders = [];

export const mockInvoices = [];

export const mockTravelFunds = [];

// Dashboard stats helpers
export const getDashboardStats = () => {
  const activeOrders = mockOrders.filter(o => ['aktif','transit','menunggu_dp'].includes(o.status)).length;
  const pendingReceivable = mockInvoices
    .filter(i => i.type === 'pelunasan' && i.status !== 'paid')
    .reduce((sum, i) => sum + i.amount, 0)
    + mockOrders.filter(o => o.status === 'selesai' && o.paymentStatus !== 'lunas')
      .reduce((sum, o) => sum + o.finalAmount, 0);
  const unpaidDP = mockInvoices.filter(i => i.type === 'dp' && i.status === 'unpaid').reduce((sum,i) => sum+i.amount, 0);
  const travelFundOut = mockTravelFunds
    .filter(t => ['dicairkan','pengajuan'].includes(t.status))
    .reduce((sum,t) => sum + t.disbursedAmount, 0);

  const completedOrders = mockOrders.filter(o => o.status === 'selesai');
  const totalRevenue = completedOrders.reduce((sum,o) => sum+o.totalValue, 0);
  const totalCost = mockTravelFunds
    .filter(t => t.status === 'realisasi_selesai')
    .reduce((sum,t) => sum+t.totalRealized, 0);
  const margin = totalRevenue - totalCost;

  return { activeOrders, pendingReceivable, travelFundOut, margin, unpaidDP };
};

export const getPLPerTrip = () => {
  return mockOrders
    .filter(o => o.status === 'selesai')
    .map(o => {
      const fund = mockTravelFunds.find(t => t.orderId === o.id);
      const cost = fund ? fund.totalRealized : 0;
      return {
        name: o.id.replace('DO-2025-','DO-'),
        revenue: o.totalValue,
        cost,
        margin: o.totalValue - cost,
      };
    });
};

export const getCashflowData = () => {
  const days = [];
  const now = new Date('2025-07-23');
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = `${d.getDate()}/${d.getMonth()+1}`;
    days.push({
      date: label,
      masuk: Math.floor(Math.random() * 8000000) + 2000000,
      keluar: Math.floor(Math.random() * 4000000) + 500000,
    });
  }
  return days;
};
