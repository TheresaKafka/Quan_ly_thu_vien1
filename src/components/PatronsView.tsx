import React, { useMemo, useState } from 'react';
import {
  CreditCard,
  Edit3,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Unlock,
  X,
} from 'lucide-react';
import {
  BUSINESS_RULES,
  LoaiDocGia,
  PatronEnriched,
  RETURN_CONDITION_LABELS,
} from '../types/library';
import { formatCurrency, formatDateVi } from '../utils/format';
import { BarcodeSvg } from './BarcodeSvg';
import { CardStatusText } from './StatusText';

interface PatronsViewProps {
  patrons: PatronEnriched[];
  onCreatePatron: (payload: {
    HoTen: string;
    NgaySinh?: string;
    SoDienThoai: string;
    Email?: string;
    DiaChi?: string;
    LoaiDocGia: LoaiDocGia;
    ThoiHanThang: number;
  }) => Promise<void>;
  onUpdatePatron: (
    maDocGia: string,
    payload: Partial<PatronEnriched>
  ) => Promise<void>;
  onCardAction: (
    maDocGia: string,
    action: 'LOCK' | 'UNLOCK' | 'RENEW',
    extendMonths?: number
  ) => Promise<void>;
}

export const PatronsView: React.FC<PatronsViewProps> = ({
  patrons,
  onCreatePatron,
  onUpdatePatron,
  onCardAction,
}) => {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPatronId, setSelectedPatronId] = useState<string | null>(null);
  const [cardPreviewPatron, setCardPreviewPatron] = useState<PatronEnriched | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatron, setEditingPatron] = useState<PatronEnriched | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formState, setFormState] = useState({
    HoTen: '',
    NgaySinh: '2004-01-01',
    SoDienThoai: '',
    Email: '',
    DiaChi: '',
    LoaiDocGia: 'SINH_VIEN' as LoaiDocGia,
    ThoiHanThang: 12,
  });

  const filteredPatrons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patrons.filter((p) => {
      if (typeFilter !== 'ALL' && p.LoaiDocGia !== typeFilter) return false;
      if (statusFilter !== 'ALL' && p.TrangThaiThe !== statusFilter) return false;
      if (!q) return true;
      return (
        p.MaDocGia.toLowerCase().includes(q) ||
        p.HoTen.toLowerCase().includes(q) ||
        p.SoDienThoai.includes(q) ||
        (p.Email && p.Email.toLowerCase().includes(q))
      );
    });
  }, [patrons, query, typeFilter, statusFilter]);

  const selectedPatron = useMemo(
    () => patrons.find((p) => p.MaDocGia === selectedPatronId) || null,
    [patrons, selectedPatronId]
  );

  const openCreateModal = () => {
    setEditingPatron(null);
    setFormState({
      HoTen: '',
      NgaySinh: '2004-01-01',
      SoDienThoai: '',
      Email: '',
      DiaChi: '',
      LoaiDocGia: 'SINH_VIEN',
      ThoiHanThang: 12,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (p: PatronEnriched) => {
    setEditingPatron(p);
    setFormState({
      HoTen: p.HoTen,
      NgaySinh: p.NgaySinh || '',
      SoDienThoai: p.SoDienThoai,
      Email: p.Email || '',
      DiaChi: p.DiaChi || '',
      LoaiDocGia: p.LoaiDocGia,
      ThoiHanThang: 12,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);
    try {
      if (editingPatron) {
        await onUpdatePatron(editingPatron.MaDocGia, {
          HoTen: formState.HoTen,
          NgaySinh: formState.NgaySinh || null,
          SoDienThoai: formState.SoDienThoai,
          Email: formState.Email || null,
          DiaChi: formState.DiaChi,
          LoaiDocGia: formState.LoaiDocGia,
        });
      } else {
        await onCreatePatron(formState);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Lỗi lưu hồ sơ độc giả.');
    } finally {
      setFormSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filter & Primary CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo Mã thẻ, Họ tên, SĐT, Email..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#121826] text-white placeholder:text-slate-500 border border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-[#121826] border border-slate-800 rounded-md text-slate-200"
          >
            <option value="ALL">Mọi nhóm độc giả</option>
            <option value="SINH_VIEN">Sinh viên (tối đa 5 cuốn)</option>
            <option value="GIANG_VIEN">Giảng viên (tối đa 10 cuốn)</option>
            <option value="KHACH">Khách (tối đa 3 cuốn)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-[#121826] border border-slate-800 rounded-md text-slate-200"
          >
            <option value="ALL">Mọi trạng thái thẻ</option>
            <option value="HOAT_DONG">Hoạt động</option>
            <option value="BI_KHOA">Bị khóa</option>
            <option value="HET_HAN">Hết hạn</option>
          </select>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Đăng ký thẻ độc giả</span>
        </button>
      </div>

      {/* Full-Width Patron Table */}
      <div className="bg-[#121826] border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0F1522] text-xs text-slate-400">
                <th className="text-left px-5 py-2.5 font-medium">Độc giả</th>
                <th className="text-left px-3 py-2.5 font-medium">Loại & Hạn thẻ</th>
                <th className="text-center px-3 py-2.5 font-medium">Đang mượn</th>
                <th className="text-right px-3 py-2.5 font-medium">Nợ phạt</th>
                <th className="text-left px-3 py-2.5 font-medium">Trạng thái thẻ</th>
                <th className="text-right px-5 py-2.5 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 tabular-nums">
              {filteredPatrons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                    Không tìm thấy hồ sơ độc giả nào.
                  </td>
                </tr>
              ) : (
                filteredPatrons.map((p) => (
                  <tr
                    key={p.MaDocGia}
                    onClick={() => setSelectedPatronId(p.MaDocGia)}
                    className={`cursor-pointer transition-colors ${
                      p.MaDocGia === selectedPatronId
                        ? 'bg-emerald-500/10'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold text-white">{p.HoTen}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {p.MaDocGia} · {p.SoDienThoai}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="font-medium text-slate-200">
                        {BUSINESS_RULES.LOAN_LIMITS[p.LoaiDocGia].label}
                      </div>
                      <div className="text-slate-400">Hạn: {formatDateVi(p.NgayHetHan)}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs">
                      <span className="font-semibold text-white">
                        {p.eligibility.dangMuonCount}
                      </span>
                      <span className="text-slate-500">/{p.eligibility.hanMucToiDa}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">
                      {p.eligibility.tongPhatChuaDong > 0 ? (
                        <span className="text-rose-400 font-semibold">
                          {formatCurrency(p.eligibility.tongPhatChuaDong)}
                        </span>
                      ) : (
                        <span className="text-slate-500">0 đ</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <CardStatusText status={p.TrangThaiThe} />
                    </td>
                    <td
                      className="px-5 py-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setCardPreviewPatron(p)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 rounded hover:bg-emerald-500/10"
                          title="Xem & In thẻ thư viện"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                          title="Sửa hồ sơ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Credit Profile Drawer */}
      {selectedPatron && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setSelectedPatronId(null)}
          />
          <aside className="relative w-full max-w-lg bg-[#121826] border-l border-slate-800 h-full overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-2 pb-4 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono text-emerald-400">
                  {selectedPatron.MaDocGia} ·{' '}
                  {BUSINESS_RULES.LOAN_LIMITS[selectedPatron.LoaiDocGia].label}
                </div>
                <h3 className="font-display text-xl font-bold text-white mt-0.5">
                  {selectedPatron.HoTen}
                </h3>
                <div className="text-xs text-slate-400 mt-1">
                  {selectedPatron.Email || 'Chưa có email'} ·{' '}
                  {selectedPatron.DiaChi || 'Chưa cập nhật địa chỉ'}
                </div>
              </div>
              <button
                onClick={() => setSelectedPatronId(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0B0F19] border border-slate-800 rounded-md p-3.5">
              <div>
                <CardStatusText status={selectedPatron.TrangThaiThe} />
                <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                  Cấp: {formatDateVi(selectedPatron.NgayCapThe)} · Hết hạn:{' '}
                  {formatDateVi(selectedPatron.NgayHetHan)}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onCardAction(selectedPatron.MaDocGia, 'RENEW', 12)}
                  className="px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-[#121826] border border-emerald-500/30 rounded hover:bg-emerald-500/10 inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Gia hạn +12 tháng</span>
                </button>
                {selectedPatron.TrangThaiThe === 'BI_KHOA' ? (
                  <button
                    onClick={() => onCardAction(selectedPatron.MaDocGia, 'UNLOCK')}
                    className="px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-[#121826] border border-emerald-500/30 rounded hover:bg-emerald-500/10 inline-flex items-center gap-1"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Mở khóa</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onCardAction(selectedPatron.MaDocGia, 'LOCK')}
                    className="px-2.5 py-1.5 text-xs font-medium text-rose-300 bg-[#121826] border border-rose-500/30 rounded hover:bg-rose-500/10 inline-flex items-center gap-1"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Khóa thẻ</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
              <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded-md">
                <div className="text-base font-bold text-white">
                  {selectedPatron.eligibility.dangMuonCount}/
                  {selectedPatron.eligibility.hanMucToiDa}
                </div>
                <div className="text-[11px] text-slate-400">Sách đang giữ</div>
              </div>
              <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded-md">
                <div className="text-base font-bold text-white">
                  {selectedPatron.tongLuotMuon}
                </div>
                <div className="text-[11px] text-slate-400">Tổng lượt mượn</div>
              </div>
              <div className="p-3 bg-[#0B0F19] border border-slate-800 rounded-md">
                <div
                  className={`text-base font-bold ${
                    selectedPatron.eligibility.tongPhatChuaDong > 0
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(selectedPatron.eligibility.tongPhatChuaDong)}
                </div>
                <div className="text-[11px] text-slate-400">Nợ phạt chưa đóng</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Lịch sử mượn trả & vi phạm ({selectedPatron.lichSuMuon.length})
              </div>
              <div className="border border-slate-800 rounded-md divide-y divide-slate-800 bg-[#0B0F19] text-xs">
                {selectedPatron.lichSuMuon.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    Độc giả chưa có lượt mượn sách nào.
                  </div>
                ) : (
                  selectedPatron.lichSuMuon.map((item) => (
                    <div key={item.MaChiTiet} className="p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-white">{item.TenSach}</div>
                        <span className="font-mono text-emerald-400 shrink-0">
                          {item.MaBanSao}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 tabular-nums">
                        <span>Hạn trả: {formatDateVi(item.NgayHenTra)}</span>
                        {item.NgayTraThucTe ? (
                          <span className="text-emerald-400">
                            Đã trả ({RETURN_CONDITION_LABELS[item.TinhTrangKhiTra || 'BINH_THUONG']})
                          </span>
                        ) : item.SoNgayQuaHan > 0 ? (
                          <span className="text-rose-400 font-semibold">
                            Quá hạn {item.SoNgayQuaHan} ngày
                          </span>
                        ) : (
                          <span className="text-sky-400">Đang mượn</span>
                        )}
                      </div>
                      {item.TienPhat > 0 && (
                        <div className="text-rose-400 font-mono tabular-nums">
                          Phạt: {formatCurrency(item.TienPhat)} (
                          {item.DaDongPhat ? 'Đã thanh toán' : 'Chưa thanh toán'})
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Create / Edit Patron Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-slate-700 rounded-lg max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingPatron
                  ? `Cập nhật hồ sơ ${editingPatron.MaDocGia}`
                  : 'Đăng ký thẻ độc giả mới'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-300 mb-1">Họ và tên *</label>
                <input
                  required
                  type="text"
                  value={formState.HoTen}
                  onChange={(e) => setFormState({ ...formState, HoTen: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Số điện thoại *</label>
                  <input
                    required
                    type="text"
                    value={formState.SoDienThoai}
                    onChange={(e) =>
                      setFormState({ ...formState, SoDienThoai: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={formState.NgaySinh}
                    onChange={(e) => setFormState({ ...formState, NgaySinh: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formState.Email}
                  onChange={(e) => setFormState({ ...formState, Email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={formState.DiaChi}
                  onChange={(e) => setFormState({ ...formState, DiaChi: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Loại độc giả *</label>
                  <select
                    value={formState.LoaiDocGia}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        LoaiDocGia: e.target.value as LoaiDocGia,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md"
                  >
                    <option value="SINH_VIEN">Sinh viên (5 cuốn)</option>
                    <option value="GIANG_VIEN">Giảng viên (10 cuốn)</option>
                    <option value="KHACH">Khách (3 cuốn)</option>
                  </select>
                </div>
                {!editingPatron && (
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Thời hạn thẻ (tháng)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={formState.ThoiHanThang}
                      onChange={(e) =>
                        setFormState({ ...formState, ThoiHanThang: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 bg-[#192233] border border-slate-700 rounded-md hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-50"
                >
                  {formSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Library Card Modal (Crisp paper card) */}
      {cardPreviewPatron && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="border border-slate-300 rounded-lg p-5 bg-slate-50 space-y-4">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                    Thẻ Độc Giả Thư Viện
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {cardPreviewPatron.HoTen}
                  </div>
                  <div className="text-xs text-slate-600">
                    {BUSINESS_RULES.LOAN_LIMITS[cardPreviewPatron.LoaiDocGia].label} · Tối đa{' '}
                    {cardPreviewPatron.eligibility.hanMucToiDa} cuốn
                  </div>
                </div>
                <CardStatusText status={cardPreviewPatron.TrangThaiThe} lightSurface />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 tabular-nums">
                <div>
                  Ngày cấp:{' '}
                  <span className="font-mono">{formatDateVi(cardPreviewPatron.NgayCapThe)}</span>
                </div>
                <div>
                  Hết hạn:{' '}
                  <span className="font-mono">{formatDateVi(cardPreviewPatron.NgayHetHan)}</span>
                </div>
                <div className="col-span-2">
                  SĐT: <span className="font-mono">{cardPreviewPatron.SoDienThoai}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded p-3 flex justify-center">
                <BarcodeSvg code={cardPreviewPatron.MaDocGia} height={36} />
              </div>
            </div>

            <div className="flex justify-end gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In thẻ</span>
              </button>
              <button
                onClick={() => setCardPreviewPatron(null)}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
