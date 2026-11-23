import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Menu,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import { CatalogView } from './components/CatalogView';
import { CirculationView } from './components/CirculationView';
import { DashboardView } from './components/DashboardView';
import { PatronsView } from './components/PatronsView';
import { SystemBlueprintView } from './components/SystemBlueprintView';
import {
  DashboardReport,
  DauSachWithStats,
  KiemKeRecord,
  LoaiDocGia,
  LoanItemEnriched,
  PatronEnriched,
  PhieuMuonEnriched,
  TinhTrangKhiTra,
  TrangThaiBanSao,
} from './types/library';

type ActiveSection = 'dashboard' | 'circulation' | 'catalog' | 'patrons' | 'blueprint';

interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  text: string;
}

const SECTION_META: Record<ActiveSection, { title: string; breadcrumb: string }> = {
  dashboard: {
    title: 'Tổng quan & Báo cáo quản trị',
    breadcrumb: 'Thư viện Trung tâm / Tổng quan & Thống kê',
  },
  circulation: {
    title: 'Quầy Lưu hành Mượn — Trả — Gia hạn',
    breadcrumb: 'Thư viện Trung tâm / Quầy Lưu hành',
  },
  catalog: {
    title: 'Kho Đầu sách, Bản sao & Tra cứu',
    breadcrumb: 'Thư viện Trung tâm / Kho sách & Tra cứu',
  },
  patrons: {
    title: 'Hồ sơ Độc giả & Thẻ thư viện',
    breadcrumb: 'Thư viện Trung tâm / Độc giả & Thẻ',
  },
  blueprint: {
    title: 'Kiến trúc Nghiệp vụ & Cơ sở dữ liệu 3NF',
    breadcrumb: 'Thư viện Trung tâm / Quy trình & CSDL',
  },
};

export default function App() {
  const [section, setSection] = useState<ActiveSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [report, setReport] = useState<DashboardReport | null>(null);
  const [titles, setTitles] = useState<DauSachWithStats[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [audits, setAudits] = useState<KiemKeRecord[]>([]);
  const [patrons, setPatrons] = useState<PatronEnriched[]>([]);
  const [slips, setSlips] = useState<PhieuMuonEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialReturnBarcode, setInitialReturnBarcode] = useState<string | undefined>();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((type: 'success' | 'error', text: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      const [repRes, titlesRes, auditsRes, patronsRes, slipsRes] = await Promise.all([
        fetch('/api/reports/overview'),
        fetch('/api/titles'),
        fetch('/api/inventory/audits'),
        fetch('/api/patrons'),
        fetch('/api/circulation/slips'),
      ]);

      if (!repRes.ok || !titlesRes.ok || !patronsRes.ok || !slipsRes.ok) {
        throw new Error('Không thể tải dữ liệu từ máy chủ thư viện.');
      }

      const [repData, titlesData, auditsData, patronsData, slipsData] = await Promise.all([
        repRes.json(),
        titlesRes.json(),
        auditsRes.json(),
        patronsRes.json(),
        slipsRes.json(),
      ]);

      setReport(repData);
      setTitles(titlesData.titles);
      setCategories(titlesData.categories);
      setYears(titlesData.years);
      setAudits(auditsData.audits || []);
      setPatrons(patronsData.patrons);
      setSlips(slipsData.slips);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Thao tác không thành công.');
    }
    return data as T;
  }

  const handleSendReminder = async (
    MaDocGia: string,
    Kenh: 'EMAIL' | 'SMS',
    NoiDung: string
  ) => {
    await apiJson('/api/reminders/send', {
      method: 'POST',
      body: JSON.stringify({ MaDocGia, Kenh, NoiDung }),
    });
    await fetchAllData();
    pushToast('success', `Đã gửi nhắc nhở qua ${Kenh} tới độc giả ${MaDocGia}.`);
  };

  const handleBorrow = async (payload: {
    MaDocGia: string;
    MaBanSaoList: string[];
    GhiChu?: string;
  }): Promise<PhieuMuonEnriched> => {
    const data = await apiJson<{ slip: PhieuMuonEnriched }>('/api/circulation/borrow', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchAllData();
    pushToast('success', `Đã lập phiếu mượn ${data.slip.MaPhieu}.`);
    return data.slip;
  };

  const handleReturn = async (payload: {
    MaBanSao: string;
    TinhTrangKhiTra: TinhTrangKhiTra;
    DaDongPhatNgay: boolean;
  }) => {
    const data = await apiJson<{
      returnedItem: LoanItemEnriched;
      fineInfo: {
        overdueDays: number;
        overdueFine: number;
        conditionFine: number;
        totalFine: number;
      };
      slip: PhieuMuonEnriched;
    }>('/api/circulation/return', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchAllData();
    pushToast('success', `Đã nhận trả bản sao ${payload.MaBanSao}.`);
    return data;
  };

  const handleRenew = async (MaChiTiet: number, SoNgayGiaHan: number) => {
    try {
      await apiJson('/api/circulation/renew', {
        method: 'POST',
        body: JSON.stringify({ MaChiTiet, SoNgayGiaHan }),
      });
      await fetchAllData();
      pushToast('success', `Đã gia hạn thêm ${SoNgayGiaHan} ngày.`);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Không thể gia hạn.');
    }
  };

  const handlePayFines = async (MaChiTietList: number[]) => {
    const receipt = await apiJson<{
      receiptId: string;
      paidAt: string;
      totalPaid: number;
      paidItems: LoanItemEnriched[];
    }>('/api/fines/pay', {
      method: 'POST',
      body: JSON.stringify({ MaChiTietList }),
    });
    await fetchAllData();
    pushToast('success', `Đã thu tiền phạt và xuất biên lai ${receipt.receiptId}.`);
    return receipt;
  };

  const handleCreateTitle = async (payload: {
    ISBN?: string;
    TenSach: string;
    TacGia: string;
    TheLoai: string;
    NhaXuatBan?: string;
    NamXuatBan: number;
    ViTriKe?: string;
    GiaBia: number;
    MoTa?: string;
    SoLuongBanSao: number;
  }) => {
    await apiJson('/api/titles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchAllData();
    pushToast('success', `Đã thêm đầu sách "${payload.TenSach}".`);
  };

  const handleUpdateTitle = async (
    maDauSach: string,
    payload: Partial<DauSachWithStats>
  ) => {
    await apiJson(`/api/titles/${maDauSach}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await fetchAllData();
    pushToast('success', `Đã cập nhật đầu sách ${maDauSach}.`);
  };

  const handleDeleteTitle = async (maDauSach: string) => {
    try {
      await apiJson(`/api/titles/${maDauSach}`, { method: 'DELETE' });
      await fetchAllData();
      pushToast('success', `Đã xóa mềm đầu sách ${maDauSach}.`);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Không thể xóa đầu sách.');
    }
  };

  const handleAddCopies = async (
    maDauSach: string,
    soLuong: number,
    tinhTrangVatLy: string
  ) => {
    await apiJson(`/api/titles/${maDauSach}/copies`, {
      method: 'POST',
      body: JSON.stringify({ soLuong, tinhTrangVatLy }),
    });
    await fetchAllData();
    pushToast('success', `Đã nhập kho ${soLuong} bản sao mới cho ${maDauSach}.`);
  };

  const handleUpdateCopy = async (
    maBanSao: string,
    payload: { TrangThai?: TrangThaiBanSao; TinhTrangVatLy?: string }
  ) => {
    try {
      await apiJson(`/api/copies/${maBanSao}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await fetchAllData();
      pushToast('success', `Đã cập nhật trạng thái bản sao ${maBanSao}.`);
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Lỗi cập nhật bản sao.');
    }
  };

  const handleRunAudit = async (payload: {
    scannedCodes: string[];
    nguoiKiemKe: string;
    markMissingAsLost: boolean;
  }) => {
    const res = await apiJson<{
      expectedCount: number;
      matched: string[];
      missingFromShelf: Array<{
        MaBanSao: string;
        TenSach: string;
        ViTriKe: string | null;
      }>;
      statusMismatch: Array<{
        MaBanSao: string;
        TenSach: string;
        TrangThaiHeThong: TrangThaiBanSao;
      }>;
      unknownCodes: string[];
      markedAsLost: boolean;
    }>('/api/inventory/audit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchAllData();
    pushToast('success', 'Đã hoàn tất đối chiếu kiểm kê kho.');
    return res;
  };

  const handleCreatePatron = async (payload: {
    HoTen: string;
    NgaySinh?: string;
    SoDienThoai: string;
    Email?: string;
    DiaChi?: string;
    LoaiDocGia: LoaiDocGia;
    ThoiHanThang: number;
  }) => {
    await apiJson('/api/patrons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchAllData();
    pushToast('success', `Đã đăng ký thẻ độc giả cho "${payload.HoTen}".`);
  };

  const handleUpdatePatron = async (
    maDocGia: string,
    payload: Partial<PatronEnriched>
  ) => {
    await apiJson(`/api/patrons/${maDocGia}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await fetchAllData();
    pushToast('success', `Đã cập nhật hồ sơ ${maDocGia}.`);
  };

  const handleCardAction = async (
    maDocGia: string,
    action: 'LOCK' | 'UNLOCK' | 'RENEW',
    extendMonths = 12
  ) => {
    await apiJson(`/api/patrons/${maDocGia}/card`, {
      method: 'PATCH',
      body: JSON.stringify({ action, extendMonths }),
    });
    await fetchAllData();
    const labelMap = {
      LOCK: 'Đã khóa thẻ độc giả',
      UNLOCK: 'Đã mở khóa thẻ độc giả',
      RENEW: `Đã gia hạn thẻ thêm ${extendMonths} tháng`,
    };
    pushToast('success', `${labelMap[action]} ${maDocGia}.`);
  };

  const handleResetDemo = async () => {
    await apiJson('/api/system/reset', { method: 'POST' });
    await fetchAllData();
    pushToast('success', 'Đã khôi phục dữ liệu mẫu ban đầu.');
  };

  const navItems: Array<{ id: ActiveSection; label: string }> = [
    { id: 'dashboard', label: 'Tổng quan' },
    { id: 'circulation', label: 'Lưu hành' },
    { id: 'catalog', label: 'Kho sách' },
    { id: 'patrons', label: 'Độc giả' },
    { id: 'blueprint', label: 'Quy trình' },
  ];

  const meta = SECTION_META[section];

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-slate-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="h-16 bg-[#0B0F19]/95 backdrop-blur border-b border-slate-800 sticky top-0 z-40 no-print">
        <div className="max-w-[1380px] mx-auto h-full px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => setSection('dashboard')}
            className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            LibraCore
          </button>

          {/* Zone 2: 5 clean single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`relative py-5 transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setSection('circulation')}
              className="hidden sm:inline-flex px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
            >
              Lập phiếu mượn
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-300 hover:text-white"
              aria-label="Mở điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-full bg-[#121826] border-r border-slate-800 h-full flex flex-col p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-display text-lg font-bold text-white">LibraCore</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-1 flex-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-md ${
                    section === item.id
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Workspace Body */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-7 space-y-6">
        {/* Contextual Page Header & Utility Strip */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/90 pb-5 no-print">
          <div>
            <div className="text-xs font-medium text-slate-400">{meta.breadcrumb}</div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1 text-balance">
              {meta.title}
            </h1>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="hidden sm:inline">
              Thủ thư trực: <strong className="text-slate-200 font-medium">Lan Hương</strong>
            </span>
            <button
              onClick={handleResetDemo}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#121826] border border-slate-800 rounded-md hover:bg-[#192233] hover:text-white inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục dữ liệu mẫu</span>
            </button>
          </div>
        </div>

        {section === 'dashboard' && (
          <DashboardView
            report={report}
            loading={loading}
            onSendReminder={handleSendReminder}
            onNavigateToReturn={(maBanSao) => {
              setInitialReturnBarcode(maBanSao);
              setSection('circulation');
            }}
            onNavigateTab={(tab) => setSection(tab)}
          />
        )}

        {section === 'circulation' && (
          <CirculationView
            patrons={patrons}
            titles={titles}
            slips={slips}
            initialReturnBarcode={initialReturnBarcode}
            onClearInitialReturnBarcode={() => setInitialReturnBarcode(undefined)}
            onBorrow={handleBorrow}
            onReturn={handleReturn}
            onRenew={handleRenew}
            onPayFines={handlePayFines}
          />
        )}

        {section === 'catalog' && (
          <CatalogView
            titles={titles}
            categories={categories}
            years={years}
            audits={audits}
            onCreateTitle={handleCreateTitle}
            onUpdateTitle={handleUpdateTitle}
            onDeleteTitle={handleDeleteTitle}
            onAddCopies={handleAddCopies}
            onUpdateCopy={handleUpdateCopy}
            onRunAudit={handleRunAudit}
          />
        )}

        {section === 'patrons' && (
          <PatronsView
            patrons={patrons}
            onCreatePatron={handleCreatePatron}
            onUpdatePatron={handleUpdatePatron}
            onCardAction={handleCardAction}
          />
        )}

        {section === 'blueprint' && <SystemBlueprintView />}
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg border shadow-xl text-xs font-medium flex items-center gap-2.5 ${
              t.type === 'success'
                ? 'bg-[#121826] border-emerald-500/40 text-emerald-200'
                : 'bg-[#121826] border-rose-500/40 text-rose-200'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
