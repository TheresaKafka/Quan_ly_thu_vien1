import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  BUSINESS_RULES,
  DauSachWithStats,
  LoanItemEnriched,
  PatronEnriched,
  PhieuMuonEnriched,
  RETURN_CONDITION_LABELS,
  TinhTrangKhiTra,
  TrangThaiBanSao,
} from '../types/library';
import { daysUntil, formatCurrency, formatDateTimeVi, formatDateVi } from '../utils/format';
import { BarcodeSvg } from './BarcodeSvg';
import { CardStatusText, SlipStatusText } from './StatusText';

type CirculationTab = 'borrow' | 'return' | 'renew' | 'history';

interface CirculationViewProps {
  patrons: PatronEnriched[];
  titles: DauSachWithStats[];
  slips: PhieuMuonEnriched[];
  initialReturnBarcode?: string;
  onClearInitialReturnBarcode?: () => void;
  onBorrow: (payload: {
    MaDocGia: string;
    MaBanSaoList: string[];
    GhiChu?: string;
  }) => Promise<PhieuMuonEnriched>;
  onReturn: (payload: {
    MaBanSao: string;
    TinhTrangKhiTra: TinhTrangKhiTra;
    DaDongPhatNgay: boolean;
  }) => Promise<{
    returnedItem: LoanItemEnriched;
    fineInfo: {
      overdueDays: number;
      overdueFine: number;
      conditionFine: number;
      totalFine: number;
    };
    slip: PhieuMuonEnriched;
  }>;
  onRenew: (maChiTiet: number, days: number) => Promise<void>;
  onPayFines: (maChiTietList: number[]) => Promise<{
    receiptId: string;
    paidAt: string;
    totalPaid: number;
    paidItems: LoanItemEnriched[];
  }>;
}

export const CirculationView: React.FC<CirculationViewProps> = ({
  patrons,
  titles,
  slips,
  initialReturnBarcode,
  onClearInitialReturnBarcode,
  onBorrow,
  onReturn,
  onRenew,
  onPayFines,
}) => {
  const [activeTab, setActiveTab] = useState<CirculationTab>(
    initialReturnBarcode ? 'return' : 'borrow'
  );

  const [patronQuery, setPatronQuery] = useState('');
  const [selectedPatronId, setSelectedPatronId] = useState<string>('');
  const [copyBarcodeInput, setCopyBarcodeInput] = useState('');
  const [selectedCopies, setSelectedCopies] = useState<string[]>([]);
  const [borrowNote, setBorrowNote] = useState('');
  const [borrowSubmitting, setBorrowSubmitting] = useState(false);
  const [borrowError, setBorrowError] = useState<string | null>(null);
  const [createdSlipModal, setCreatedSlipModal] = useState<PhieuMuonEnriched | null>(null);

  const [returnBarcode, setReturnBarcode] = useState(initialReturnBarcode || '');
  const [returnCondition, setReturnCondition] = useState<TinhTrangKhiTra>('BINH_THUONG');
  const [payImmediately, setPayImmediately] = useState(true);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [lastReturnResult, setLastReturnResult] = useState<{
    returnedItem: LoanItemEnriched;
    fineInfo: {
      overdueDays: number;
      overdueFine: number;
      conditionFine: number;
      totalFine: number;
    };
    slip: PhieuMuonEnriched;
  } | null>(null);

  const [renewDays, setRenewDays] = useState<number>(7);
  const [renewingId, setRenewingId] = useState<number | null>(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyStatus, setHistoryStatus] = useState('ALL');
  const [receiptModal, setReceiptModal] = useState<{
    receiptId: string;
    paidAt: string;
    totalPaid: number;
    paidItems: LoanItemEnriched[];
  } | null>(null);

  React.useEffect(() => {
    if (initialReturnBarcode) {
      setActiveTab('return');
      setReturnBarcode(initialReturnBarcode);
      setLastReturnResult(null);
      setReturnError(null);
      onClearInitialReturnBarcode?.();
    }
  }, [initialReturnBarcode, onClearInitialReturnBarcode]);

  const allCopies = useMemo(() => {
    const list: Array<{
      MaBanSao: string;
      MaDauSach: string;
      TenSach: string;
      TacGia: string;
      GiaBia: number;
      TrangThai: TrangThaiBanSao;
      TinhTrangVatLy: string;
    }> = [];
    for (const t of titles) {
      for (const c of t.BanSaoList || []) {
        list.push({
          MaBanSao: c.MaBanSao,
          MaDauSach: t.MaDauSach,
          TenSach: t.TenSach,
          TacGia: t.TacGia,
          GiaBia: t.GiaBia,
          TrangThai: c.TrangThai,
          TinhTrangVatLy: c.TinhTrangVatLy,
        });
      }
    }
    return list;
  }, [titles]);

  const filteredPatrons = useMemo(() => {
    const q = patronQuery.trim().toLowerCase();
    if (!q) return patrons;
    return patrons.filter(
      (p) =>
        p.MaDocGia.toLowerCase().includes(q) ||
        p.HoTen.toLowerCase().includes(q) ||
        p.SoDienThoai.includes(q)
    );
  }, [patrons, patronQuery]);

  const selectedPatron = useMemo(
    () => patrons.find((p) => p.MaDocGia === selectedPatronId) || null,
    [patrons, selectedPatronId]
  );

  const activeLoanItems = useMemo(() => {
    const items: LoanItemEnriched[] = [];
    for (const s of slips) {
      for (const ct of s.ChiTiet) {
        if (ct.NgayTraThucTe === null) {
          items.push(ct);
        }
      }
    }
    return items.sort((a, b) => a.NgayHenTra.localeCompare(b.NgayHenTra));
  }, [slips]);

  const returnTargetItem = useMemo(() => {
    const code = returnBarcode.trim().toLowerCase();
    if (!code) return null;
    return activeLoanItems.find((i) => i.MaBanSao.toLowerCase() === code) || null;
  }, [activeLoanItems, returnBarcode]);

  const previewFine = useMemo(() => {
    if (!returnTargetItem) return null;
    const overdueDays = Math.max(0, -daysUntil(returnTargetItem.NgayHenTra));
    const overdueFine = overdueDays * BUSINESS_RULES.FINE_PER_DAY;
    let conditionFine = 0;
    if (returnCondition === 'HU_HONG') {
      conditionFine = Math.round(returnTargetItem.GiaBia * BUSINESS_RULES.DAMAGE_FINE_RATE);
    } else if (returnCondition === 'LAM_MAT') {
      conditionFine = Math.round(returnTargetItem.GiaBia * BUSINESS_RULES.LOST_FINE_RATE);
    }
    return {
      overdueDays,
      overdueFine,
      conditionFine,
      totalFine: overdueFine + conditionFine,
    };
  }, [returnTargetItem, returnCondition]);

  const filteredSlips = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    return slips.filter((s) => {
      if (historyStatus !== 'ALL' && s.TrangThaiPhieu !== historyStatus) return false;
      if (!q) return true;
      return (
        s.MaPhieu.toLowerCase().includes(q) ||
        s.MaDocGia.toLowerCase().includes(q) ||
        s.HoTenDocGia.toLowerCase().includes(q) ||
        s.ChiTiet.some(
          (c) =>
            c.MaBanSao.toLowerCase().includes(q) ||
            c.TenSach.toLowerCase().includes(q)
        )
      );
    });
  }, [slips, historyQuery, historyStatus]);

  const handleAddCopyByBarcode = (codeRaw?: string) => {
    setBorrowError(null);
    const code = (codeRaw ?? copyBarcodeInput).trim().toUpperCase();
    if (!code) return;
    const found = allCopies.find((c) => c.MaBanSao.toUpperCase() === code);
    if (!found) {
      setBorrowError(`Không tìm thấy bản sao có mã "${code}".`);
      return;
    }
    if (found.TrangThai !== 'SAN_SANG') {
      setBorrowError(
        `BR-04: Bản sao ${found.MaBanSao} (${found.TenSach}) hiện không ở trạng thái Sẵn sàng.`
      );
      return;
    }
    if (selectedCopies.includes(found.MaBanSao)) {
      setBorrowError(`Bản sao ${found.MaBanSao} đã có trong danh sách mượn.`);
      return;
    }
    if (
      selectedPatron &&
      selectedPatron.eligibility.dangMuonCount + selectedCopies.length + 1 >
        selectedPatron.eligibility.hanMucToiDa
    ) {
      setBorrowError(
        `BR-03: Vượt quá hạn mức tối đa ${selectedPatron.eligibility.hanMucToiDa} cuốn của độc giả này.`
      );
      return;
    }
    setSelectedCopies((prev) => [...prev, found.MaBanSao]);
    if (!codeRaw) setCopyBarcodeInput('');
  };

  const handleSubmitBorrow = async () => {
    if (!selectedPatron || selectedCopies.length === 0) return;
    setBorrowSubmitting(true);
    setBorrowError(null);
    try {
      const slip = await onBorrow({
        MaDocGia: selectedPatron.MaDocGia,
        MaBanSaoList: selectedCopies,
        GhiChu: borrowNote,
      });
      setSelectedCopies([]);
      setBorrowNote('');
      setCreatedSlipModal(slip);
    } catch (err) {
      setBorrowError(err instanceof Error ? err.message : 'Lỗi lập phiếu mượn.');
    } finally {
      setBorrowSubmitting(false);
    }
  };

  const handleSubmitReturn = async () => {
    if (!returnBarcode.trim()) return;
    setReturnSubmitting(true);
    setReturnError(null);
    try {
      const res = await onReturn({
        MaBanSao: returnBarcode.trim(),
        TinhTrangKhiTra: returnCondition,
        DaDongPhatNgay: payImmediately,
      });
      setLastReturnResult(res);
      setReturnBarcode('');
      setReturnCondition('BINH_THUONG');
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : 'Lỗi ghi nhận trả sách.');
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleRenewClick = async (maChiTiet: number) => {
    setRenewingId(maChiTiet);
    try {
      await onRenew(maChiTiet, renewDays);
    } finally {
      setRenewingId(null);
    }
  };

  const handlePaySlipFines = async (slip: PhieuMuonEnriched) => {
    const unpaidIds = slip.ChiTiet.filter((c) => c.TienPhat > 0 && !c.DaDongPhat).map(
      (c) => c.MaChiTiet
    );
    if (unpaidIds.length === 0) return;
    const receipt = await onPayFines(unpaidIds);
    setReceiptModal(receipt);
  };

  const availableCopiesQuickPick = useMemo(
    () => allCopies.filter((c) => c.TrangThai === 'SAN_SANG' && !selectedCopies.includes(c.MaBanSao)),
    [allCopies, selectedCopies]
  );

  return (
    <div className="space-y-6">
      {/* Segmented Flow Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center p-1 bg-[#121826] rounded-lg border border-slate-800">
          {[
            { id: 'borrow', label: '1. Lập phiếu mượn' },
            { id: 'return', label: '2. Ghi nhận trả sách' },
            { id: 'renew', label: '3. Gia hạn sách' },
            { id: 'history', label: '4. Lịch sử & Thu phạt' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CirculationTab)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 font-mono tabular-nums">
          Phạt trễ: {formatCurrency(BUSINESS_RULES.FINE_PER_DAY)}/ngày · Gia hạn tối đa{' '}
          {BUSINESS_RULES.MAX_RENEWALS} lần
        </div>
      </div>

      {/* TAB 1: BORROW */}
      {activeTab === 'borrow' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-[#121826] border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                Bước 1: Quét thẻ độc giả (BR-01, BR-02, BR-03)
              </h2>
              <UserCheck className="w-4 h-4 text-slate-500" />
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={patronQuery}
                onChange={(e) => setPatronQuery(e.target.value)}
                placeholder="Nhập mã thẻ (DG-...), tên hoặc SĐT..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#0B0F19] text-white placeholder:text-slate-500 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-md divide-y divide-slate-800/80 bg-[#0B0F19]">
              {filteredPatrons.map((p) => {
                const isSelected = p.MaDocGia === selectedPatronId;
                return (
                  <button
                    key={p.MaDocGia}
                    onClick={() => {
                      setSelectedPatronId(p.MaDocGia);
                      setBorrowError(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-emerald-500/15' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{p.HoTen}</div>
                      <div className="text-xs text-slate-400 font-mono tabular-nums">
                        {p.MaDocGia} · {BUSINESS_RULES.LOAN_LIMITS[p.LoaiDocGia].label}
                      </div>
                    </div>
                    <CardStatusText status={p.TrangThaiThe} />
                  </button>
                );
              })}
            </div>

            {selectedPatron && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {selectedPatron.HoTen}
                    </div>
                    <div className="text-xs text-slate-400 tabular-nums mt-0.5">
                      Hạn thẻ: {formatDateVi(selectedPatron.NgayHetHan)} · Hạn mức:{' '}
                      {selectedPatron.eligibility.dangMuonCount}/
                      {selectedPatron.eligibility.hanMucToiDa} cuốn
                    </div>
                  </div>
                  {selectedPatron.eligibility.hopLe ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đủ điều kiện</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                      <XCircle className="w-4 h-4" />
                      <span>Không đủ ĐK</span>
                    </span>
                  )}
                </div>

                {!selectedPatron.eligibility.hopLe && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-md space-y-1">
                    {selectedPatron.eligibility.lyDoTuChoi.map((reason, idx) => (
                      <div key={idx} className="text-xs text-rose-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-[#121826] border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                Bước 2: Quét mã vạch bản sao sách (BR-04)
              </h2>
              <Barcode className="w-4 h-4 text-slate-500" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={copyBarcodeInput}
                onChange={(e) => setCopyBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCopyByBarcode();
                  }
                }}
                placeholder="Quét hoặc nhập mã bản sao (vd: BS-00102) rồi nhấn Enter..."
                className="flex-1 px-3 py-2 text-sm font-mono bg-[#0B0F19] text-white placeholder:text-slate-500 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              <button
                onClick={() => handleAddCopyByBarcode()}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 text-white border border-slate-700 rounded-md hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                Thêm bản sao
              </button>
            </div>

            {borrowError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-md text-xs text-rose-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{borrowError}</span>
              </div>
            )}

            <div>
              <div className="text-xs font-medium text-slate-400 mb-2">
                Chọn nhanh bản sao đang sẵn sàng trên kệ ({availableCopiesQuickPick.length}):
              </div>
              <div className="max-h-40 overflow-y-auto border border-slate-800 rounded-md divide-y divide-slate-800/80 bg-[#0B0F19]">
                {availableCopiesQuickPick.slice(0, 12).map((c) => (
                  <div
                    key={c.MaBanSao}
                    className="px-3 py-2 flex items-center justify-between gap-3 text-xs hover:bg-slate-800/40"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-semibold text-emerald-400 mr-2">
                        {c.MaBanSao}
                      </span>
                      <span className="text-slate-200 truncate">{c.TenSach}</span>
                    </div>
                    <button
                      onClick={() => handleAddCopyByBarcode(c.MaBanSao)}
                      className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded hover:bg-emerald-500/20 whitespace-nowrap shrink-0"
                    >
                      + Chọn mượn
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">
                  Danh sách sách xuất kho ({selectedCopies.length})
                </span>
                {selectedPatron && (
                  <span className="text-xs text-slate-400 tabular-nums">
                    Thời hạn mặc định: {selectedPatron.eligibility.soNgayMuonMacDinh} ngày
                  </span>
                )}
              </div>

              {selectedCopies.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-700 rounded-md">
                  Chưa có bản sao nào được chọn. Hãy quét mã hoặc bấm chọn nhanh ở trên.
                </div>
              ) : (
                <div className="border border-slate-800 rounded-md divide-y divide-slate-800 bg-[#0B0F19]">
                  {selectedCopies.map((code) => {
                    const info = allCopies.find((c) => c.MaBanSao === code);
                    return (
                      <div
                        key={code}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-white truncate">{info?.TenSach}</div>
                          <div className="text-xs font-mono text-slate-400">
                            {code} · {info?.TinhTrangVatLy}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setSelectedCopies((prev) => prev.filter((x) => x !== code))
                          }
                          className="text-slate-400 hover:text-rose-400 p-1"
                          title="Bỏ chọn"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Ghi chú phiếu mượn
                </label>
                <input
                  type="text"
                  value={borrowNote}
                  onChange={(e) => setBorrowNote(e.target.value)}
                  placeholder="Ví dụ: Mượn phục vụ nghiên cứu học phần..."
                  className="w-full px-3 py-2 text-sm bg-[#0B0F19] text-white placeholder:text-slate-500 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
              <button
                onClick={handleSubmitBorrow}
                disabled={
                  !selectedPatron ||
                  !selectedPatron.eligibility.hopLe ||
                  selectedCopies.length === 0 ||
                  borrowSubmitting
                }
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {borrowSubmitting ? 'Đang lập phiếu...' : 'Xác nhận lập phiếu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RETURN */}
      {activeTab === 'return' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-[#121826] border border-slate-800 rounded-lg p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Quét mã bản sao trả sách (Hỗ trợ trả từng phần)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hệ thống tự động truy ngược ra phiếu mượn đang mở và tính tiền phạt theo BR-05
              </p>
            </div>

            <input
              type="text"
              value={returnBarcode}
              onChange={(e) => {
                setReturnBarcode(e.target.value);
                setReturnError(null);
              }}
              placeholder="Nhập hoặc quét mã bản sao đang mượn (vd: BS-00101)..."
              className="w-full px-3 py-2 text-sm font-mono bg-[#0B0F19] text-white placeholder:text-slate-500 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />

            {returnError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-md text-xs text-rose-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{returnError}</span>
              </div>
            )}

            {returnBarcode.trim() && !returnTargetItem && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-md text-xs text-amber-300">
                Không tìm thấy giao dịch đang mượn nào gắn với mã bản sao{' '}
                <span className="font-mono font-semibold">{returnBarcode}</span>.
              </div>
            )}

            {returnTargetItem && previewFine && (
              <div className="border border-slate-700 rounded-lg p-4 space-y-4 bg-[#0B0F19]">
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {returnTargetItem.TenSach}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                      Mã bản sao:{' '}
                      <span className="font-mono font-medium text-emerald-400">
                        {returnTargetItem.MaBanSao}
                      </span>{' '}
                      · Phiếu: <span className="font-mono">{returnTargetItem.MaPhieu}</span> · Giá
                      bìa: {formatCurrency(returnTargetItem.GiaBia)}
                    </div>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    <div className="font-medium text-white">{returnTargetItem.HoTenDocGia}</div>
                    <div className="text-slate-400">
                      Hạn trả: {formatDateVi(returnTargetItem.NgayHenTra)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Đánh giá tình trạng thực tế khi trả (BR-05):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['BINH_THUONG', 'HU_HONG', 'LAM_MAT'] as TinhTrangKhiTra[]).map((cond) => (
                      <button
                        key={cond}
                        onClick={() => setReturnCondition(cond)}
                        className={`px-3 py-2 text-xs font-medium rounded-md border text-center transition-colors ${
                          returnCondition === cond
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-[#121826] text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {RETURN_CONDITION_LABELS[cond]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#121826] border border-slate-800 rounded-md p-3.5 space-y-1.5 text-xs tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      Phạt trễ hạn ({previewFine.overdueDays} ngày ×{' '}
                      {formatCurrency(BUSINESS_RULES.FINE_PER_DAY)}):
                    </span>
                    <span className="font-mono font-medium text-white">
                      {formatCurrency(previewFine.overdueFine)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bồi hoàn hư hỏng / mất sách:</span>
                    <span className="font-mono font-medium text-white">
                      {formatCurrency(previewFine.conditionFine)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-800 font-semibold text-sm">
                    <span className="text-white">Tổng tiền phạt phát sinh:</span>
                    <span
                      className={
                        previewFine.totalFine > 0
                          ? 'text-rose-400 font-mono'
                          : 'text-emerald-400 font-mono'
                      }
                    >
                      {formatCurrency(previewFine.totalFine)}
                    </span>
                  </div>
                </div>

                {previewFine.totalFine > 0 && (
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payImmediately}
                      onChange={(e) => setPayImmediately(e.target.checked)}
                      className="rounded border-slate-700 bg-[#121826] text-emerald-500"
                    />
                    <span>Độc giả thanh toán ngay khoản phạt này tại quầy</span>
                  </label>
                )}

                <button
                  onClick={handleSubmitReturn}
                  disabled={returnSubmitting}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-50"
                >
                  {returnSubmitting ? 'Đang cập nhật kho...' : 'Xác nhận nhận trả sách'}
                </button>
              </div>
            )}

            {lastReturnResult && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-md space-y-2 text-xs text-emerald-200">
                <div className="font-semibold flex items-center gap-1.5 text-sm text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    Đã ghi nhận trả bản sao {lastReturnResult.returnedItem.MaBanSao}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>
                    Trạng thái phiếu{' '}
                    <span className="font-mono font-semibold">{lastReturnResult.slip.MaPhieu}</span>:
                  </span>
                  <SlipStatusText status={lastReturnResult.slip.TrangThaiPhieu} />
                </div>
                <div className="tabular-nums">
                  Tiền phạt: {formatCurrency(lastReturnResult.fineInfo.totalFine)} (
                  {lastReturnResult.returnedItem.DaDongPhat ? 'Đã hoàn tất' : 'Chờ đóng phạt'})
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-[#121826] border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Bản sao đang lưu hành ({activeLoanItems.length})
              </h3>
              <span className="text-xs text-slate-400">Bấm để quét trả nhanh</span>
            </div>
            <div className="divide-y divide-slate-800/80 max-h-[460px] overflow-y-auto">
              {activeLoanItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Không có bản sao nào đang được mượn.
                </div>
              ) : (
                activeLoanItems.map((item) => {
                  const remain = daysUntil(item.NgayHenTra);
                  return (
                    <button
                      key={item.MaChiTiet}
                      onClick={() => {
                        setReturnBarcode(item.MaBanSao);
                        setLastReturnResult(null);
                        setReturnError(null);
                      }}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-800/50 transition-colors ${
                        returnBarcode.toUpperCase() === item.MaBanSao ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-semibold text-emerald-400">
                          {item.MaBanSao}{' '}
                          <span className="font-sans font-normal text-slate-400">
                            · {item.HoTenDocGia}
                          </span>
                        </div>
                        <div className="text-xs text-slate-200 truncate mt-0.5">
                          {item.TenSach}
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums text-xs">
                        <div className="font-mono text-slate-300">
                          {formatDateVi(item.NgayHenTra)}
                        </div>
                        <div
                          className={
                            remain < 0
                              ? 'text-rose-400 font-semibold'
                              : remain <= 3
                              ? 'text-amber-400 font-medium'
                              : 'text-slate-500'
                          }
                        >
                          {remain < 0 ? `Trễ ${Math.abs(remain)}d` : `Còn ${remain}d`}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RENEW */}
      {activeTab === 'renew' && (
        <div className="bg-[#121826] border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Gia hạn thời gian mượn (BR-06)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Điều kiện: Sách chưa quá hạn, số lần gia hạn &lt; {BUSINESS_RULES.MAX_RENEWALS} và
                thẻ còn hiệu lực
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Số ngày cộng thêm:</span>
              <select
                value={renewDays}
                onChange={(e) => setRenewDays(Number(e.target.value))}
                className="px-2.5 py-1.5 border border-slate-700 rounded-md bg-[#0B0F19] text-white font-medium"
              >
                <option value={7}>+7 ngày</option>
                <option value={14}>+14 ngày</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0F1522] text-xs text-slate-400">
                  <th className="text-left px-5 py-2.5 font-medium">Bản sao / Đầu sách</th>
                  <th className="text-left px-4 py-2.5 font-medium">Độc giả</th>
                  <th className="text-left px-4 py-2.5 font-medium">Hạn trả hiện tại</th>
                  <th className="text-center px-4 py-2.5 font-medium">Đã gia hạn</th>
                  <th className="text-left px-4 py-2.5 font-medium">Đánh giá BR-06</th>
                  <th className="text-right px-5 py-2.5 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 tabular-nums">
                {activeLoanItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                      Không có bản sao nào đang mượn để gia hạn.
                    </td>
                  </tr>
                ) : (
                  activeLoanItems.map((item) => (
                    <tr key={item.MaChiTiet} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3">
                        <div className="font-medium text-white line-clamp-1">{item.TenSach}</div>
                        <div className="text-xs font-mono text-slate-400">
                          {item.MaBanSao} · {item.MaPhieu}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{item.HoTenDocGia}</div>
                        <div className="text-xs text-slate-400">{item.MaDocGia}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {formatDateVi(item.NgayHenTra)}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs text-slate-300">
                        {item.SoLanGiaHan}/{BUSINESS_RULES.MAX_RENEWALS}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.CoTheGiaHan ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đủ điều kiện</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.LyDoKhongGiaHan}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleRenewClick(item.MaChiTiet)}
                          disabled={!item.CoTheGiaHan || renewingId === item.MaChiTiet}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Gia hạn +{renewDays}d</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: HISTORY & FINES */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-[#121826] border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Tra cứu theo Mã phiếu, Mã độc giả, Tên độc giả, Mã bản sao..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#0B0F19] text-white placeholder:text-slate-500 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div className="inline-flex items-center p-1 bg-[#0B0F19] rounded-md border border-slate-800">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'DANG_MUON', label: 'Đang mượn' },
                { id: 'TRA_MOT_PHAN', label: 'Trả một phần' },
                { id: 'DA_HOAN_THANH', label: 'Đã hoàn thành' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setHistoryStatus(st.id)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    historyStatus === st.id
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredSlips.length === 0 ? (
              <div className="bg-[#121826] border border-slate-800 rounded-lg p-8 text-center text-sm text-slate-400">
                Không tìm thấy phiếu mượn trả nào khớp với từ khóa tra cứu.
              </div>
            ) : (
              filteredSlips.map((slip) => (
                <div
                  key={slip.MaPhieu}
                  className="bg-[#121826] border border-slate-800 rounded-lg overflow-hidden"
                >
                  <div className="px-5 py-3.5 bg-[#0F1522] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-mono font-semibold text-sm text-white">
                        {slip.MaPhieu}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="font-medium text-slate-200">
                        {slip.HoTenDocGia} ({slip.MaDocGia})
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400 tabular-nums">
                        Ngày mượn: {formatDateTimeVi(slip.NgayMuon)}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">Lập bởi: {slip.NguoiLapPhieu}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <SlipStatusText status={slip.TrangThaiPhieu} />
                      {slip.TienPhatChuaDong > 0 && (
                        <button
                          onClick={() => handlePaySlipFines(slip)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded hover:bg-rose-500 inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Thu phạt {formatCurrency(slip.TienPhatChuaDong)}</span>
                        </button>
                      )}
                      <button
                        onClick={() => setCreatedSlipModal(slip)}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-[#192233] border border-slate-700 rounded hover:bg-slate-800 inline-flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Phiếu</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800/80 text-slate-400">
                          <th className="text-left px-5 py-2 font-medium">Mã bản sao</th>
                          <th className="text-left px-3 py-2 font-medium">Tên sách</th>
                          <th className="text-left px-3 py-2 font-medium">Hạn trả</th>
                          <th className="text-center px-3 py-2 font-medium">Gia hạn</th>
                          <th className="text-left px-3 py-2 font-medium">Ngày trả thực tế</th>
                          <th className="text-left px-3 py-2 font-medium">Tình trạng trả</th>
                          <th className="text-right px-5 py-2 font-medium">Tiền phạt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 tabular-nums">
                        {slip.ChiTiet.map((ct) => (
                          <tr key={ct.MaChiTiet} className="h-10">
                            <td className="px-5 font-mono font-medium text-emerald-400">
                              {ct.MaBanSao}
                            </td>
                            <td className="px-3 text-slate-200">{ct.TenSach}</td>
                            <td className="px-3 font-mono text-slate-300">
                              {formatDateVi(ct.NgayHenTra)}
                            </td>
                            <td className="px-3 text-center font-mono text-slate-300">
                              {ct.SoLanGiaHan}
                            </td>
                            <td className="px-3 font-mono text-slate-300">
                              {ct.NgayTraThucTe ? (
                                formatDateTimeVi(ct.NgayTraThucTe)
                              ) : (
                                <button
                                  onClick={() => {
                                    setActiveTab('return');
                                    setReturnBarcode(ct.MaBanSao);
                                  }}
                                  className="text-emerald-400 hover:underline font-sans inline-flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Đang mượn · Trả ngay</span>
                                </button>
                              )}
                            </td>
                            <td className="px-3 text-slate-300">
                              {ct.TinhTrangKhiTra
                                ? RETURN_CONDITION_LABELS[ct.TinhTrangKhiTra]
                                : '—'}
                            </td>
                            <td className="px-5 text-right font-mono">
                              {ct.TienPhat > 0 ? (
                                <span
                                  className={
                                    ct.DaDongPhat
                                      ? 'text-emerald-400'
                                      : 'text-rose-400 font-semibold'
                                  }
                                >
                                  {formatCurrency(ct.TienPhat)} (
                                  {ct.DaDongPhat ? 'Đã thu' : 'Chưa thu'})
                                </span>
                              ) : (
                                <span className="text-slate-500">0 đ</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Printable Loan Slip Modal (Crisp white paper for printing) */}
      {createdSlipModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-lg max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Phiếu Mượn Sách Thư Viện
                </h3>
                <div className="text-xs text-slate-500 mt-0.5 font-mono">
                  Mã phiếu: {createdSlipModal.MaPhieu} · Ngày lập:{' '}
                  {formatDateTimeVi(createdSlipModal.NgayMuon)}
                </div>
              </div>
              <BarcodeSvg code={createdSlipModal.MaPhieu} height={28} showText={false} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-md p-3.5">
              <div>
                <span className="text-slate-500">Độc giả:</span>{' '}
                <span className="font-semibold text-slate-900">
                  {createdSlipModal.HoTenDocGia}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Mã thẻ:</span>{' '}
                <span className="font-mono font-medium text-slate-900">
                  {createdSlipModal.MaDocGia}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Thủ thư lập:</span>{' '}
                <span className="text-slate-800">{createdSlipModal.NguoiLapPhieu}</span>
              </div>
              <div>
                <span className="text-slate-500">Trạng thái:</span>{' '}
                <SlipStatusText status={createdSlipModal.TrangThaiPhieu} lightSurface />
              </div>
            </div>

            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Mã bản sao</th>
                  <th className="text-left px-3 py-2 font-medium">Nhan đề</th>
                  <th className="text-right px-3 py-2 font-medium">Hạn trả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {createdSlipModal.ChiTiet.map((ct) => (
                  <tr key={ct.MaChiTiet}>
                    <td className="px-3 py-2 font-mono font-medium">{ct.MaBanSao}</td>
                    <td className="px-3 py-2">{ct.TenSach}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatDateVi(ct.NgayHenTra)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-end gap-2 pt-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In phiếu</span>
              </button>
              <button
                onClick={() => setCreatedSlipModal(null)}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Fine Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Biên lai thu phí phạt</h3>
                <div className="text-xs font-mono text-slate-500">
                  Số biên lai: {receiptModal.receiptId} ·{' '}
                  {formatDateTimeVi(receiptModal.paidAt)}
                </div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {receiptModal.paidItems.map((item) => (
                <div key={item.MaChiTiet} className="py-2 flex justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">{item.TenSach}</div>
                    <div className="text-slate-500 font-mono">
                      {item.MaBanSao} · {item.HoTenDocGia}
                    </div>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(item.TienPhat)}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
              <span>Tổng tiền đã thu:</span>
              <span className="font-mono text-emerald-700 tabular-nums">
                {formatCurrency(receiptModal.totalPaid)}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In biên lai</span>
              </button>
              <button
                onClick={() => setReceiptModal(null)}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
