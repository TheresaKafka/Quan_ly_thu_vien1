import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Clock,
  Mail,
  MessageSquare,
  Send,
} from 'lucide-react';
import { DashboardReport } from '../types/library';
import { daysUntil, formatCurrency, formatDateTimeVi, formatDateVi } from '../utils/format';

interface DashboardViewProps {
  report: DashboardReport | null;
  loading: boolean;
  onSendReminder: (maDocGia: string, kenh: 'EMAIL' | 'SMS', noiDung: string) => Promise<void>;
  onNavigateToReturn: (maBanSao: string) => void;
  onNavigateTab: (tab: 'circulation' | 'catalog' | 'patrons' | 'blueprint') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  report,
  loading,
  onSendReminder,
  onNavigateToReturn,
  onNavigateTab,
}) => {
  const [sendingId, setSendingId] = useState<string | null>(null);

  if (loading || !report) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-44 bg-[#121826] border border-slate-800 rounded-lg animate-pulse" />
          <div className="lg:col-span-5 h-44 bg-[#121826] border border-slate-800 rounded-lg animate-pulse" />
        </div>
        <div className="h-72 bg-[#121826] border border-slate-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  const totalCopies = Math.max(1, report.tongBanSao);
  const pctSanSang = Math.round((report.banSaoSanSang / totalCopies) * 100);
  const pctDangMuon = Math.round((report.banSaoDangMuon / totalCopies) * 100);
  const pctHuHong = Math.round((report.banSaoHuHong / totalCopies) * 100);
  const pctThatLac = Math.round((report.banSaoThatLac / totalCopies) * 100);
  const pctThanhLy = Math.max(0, 100 - pctSanSang - pctDangMuon - pctHuHong - pctThatLac);

  const handleReminder = async (
    maChiTiet: number,
    maDocGia: string,
    tenSach: string,
    maBanSao: string,
    ngayHenTra: string,
    kenh: 'EMAIL' | 'SMS'
  ) => {
    setSendingId(`${maChiTiet}-${kenh}`);
    try {
      const msg = `Nhắc hạn trả sách ${maBanSao} (${tenSach}) — Hạn trả: ${formatDateVi(ngayHenTra)}.`;
      await onSendReminder(maDocGia, kenh, msg);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Asymmetric Ledger Metrics + Inventory Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Unified 4-cell metric ledger (no floating card clutter) */}
        <section className="lg:col-span-7 bg-[#121826] border border-slate-800 rounded-lg grid grid-cols-2 divide-x divide-y divide-slate-800 overflow-hidden">
          <div className="p-5 flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-400">Tổng kho bản sao</div>
            <div className="mt-3 flex items-baseline gap-2.5 tabular-nums">
              <span className="text-3xl font-bold text-white font-display">
                {report.tongBanSao}
              </span>
              <span className="text-xs text-slate-400">{report.tongDauSach} đầu sách</span>
            </div>
            <div className="mt-2 text-xs text-emerald-400 font-medium tabular-nums">
              {report.banSaoSanSang} bản sẵn sàng ({pctSanSang}%)
            </div>
          </div>

          <div className="p-5 flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-400">Lưu hành hiện tại</div>
            <div className="mt-3 flex items-baseline gap-2.5 tabular-nums">
              <span className="text-3xl font-bold text-white font-display">
                {report.banSaoDangMuon}
              </span>
              <span className="text-xs text-slate-400">{report.phieuDangMo} phiếu mở</span>
            </div>
            <div className="mt-2 text-xs tabular-nums text-slate-400">
              <span className={report.luotQuaHan > 0 ? 'text-rose-400 font-semibold' : ''}>
                {report.luotQuaHan} quá hạn
              </span>
              <span className="mx-1.5 text-slate-600">·</span>
              <span className={report.luotSapDenHan > 0 ? 'text-amber-400 font-medium' : ''}>
                {report.luotSapDenHan} sắp đến hạn
              </span>
            </div>
          </div>

          <div className="p-5 flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-400">Độc giả & Thẻ</div>
            <div className="mt-3 flex items-baseline gap-2.5 tabular-nums">
              <span className="text-3xl font-bold text-white font-display">
                {report.tongDocGia}
              </span>
              <span className="text-xs text-slate-400">hồ sơ thẻ</span>
            </div>
            <div className="mt-2 text-xs tabular-nums">
              {report.docGiaBiKhoa > 0 ? (
                <span className="text-rose-400 font-medium">
                  {report.docGiaBiKhoa} thẻ đang bị khóa
                </span>
              ) : (
                <span className="text-emerald-400">Tất cả thẻ bình thường</span>
              )}
            </div>
          </div>

          <div className="p-5 flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-400">Tiền phạt & Bồi hoàn</div>
            <div className="mt-3 flex items-baseline gap-2 tabular-nums">
              <span className="text-2xl font-bold text-white font-display">
                {formatCurrency(report.doanhThuPhatDaThu)}
              </span>
              <span className="text-xs text-slate-400">đã thu</span>
            </div>
            <div className="mt-2 text-xs tabular-nums">
              {report.tienPhatChuaThu > 0 ? (
                <span className="text-rose-400 font-medium">
                  Còn nợ: {formatCurrency(report.tienPhatChuaThu)}
                </span>
              ) : (
                <span className="text-emerald-400">Không có nợ phạt tồn đọng</span>
              )}
            </div>
          </div>
        </section>

        {/* Right: Inventory Distribution */}
        <section className="lg:col-span-5 bg-[#121826] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Cơ cấu trạng thái kho (FR-4.4)</h2>
              <button
                onClick={() => onNavigateTab('catalog')}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>Kho sách</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tỷ trọng từng cuốn sách vật lý theo vòng đời lưu hành
            </p>
          </div>

          <div className="my-5">
            <div className="h-3 w-full bg-slate-800 rounded-sm overflow-hidden flex">
              <div style={{ width: `${pctSanSang}%` }} className="bg-emerald-500 h-full" />
              <div style={{ width: `${pctDangMuon}%` }} className="bg-sky-500 h-full" />
              <div style={{ width: `${pctHuHong}%` }} className="bg-amber-500 h-full" />
              <div style={{ width: `${pctThatLac}%` }} className="bg-rose-500 h-full" />
              <div style={{ width: `${pctThanhLy}%` }} className="bg-slate-600 h-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs tabular-nums border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Sẵn sàng</span>
              <span className="font-mono font-semibold text-emerald-400">{report.banSaoSanSang}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Đang mượn</span>
              <span className="font-mono font-semibold text-sky-400">{report.banSaoDangMuon}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Hư hỏng</span>
              <span className="font-mono font-semibold text-amber-400">{report.banSaoHuHong}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Thất lạc</span>
              <span className="font-mono font-semibold text-rose-400">{report.banSaoThatLac}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Thanh lý</span>
              <span className="font-mono font-semibold text-slate-400">{report.banSaoThanhLy}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Overdue & Due Soon Warnings (FR-4.3) */}
      <section className="bg-[#121826] border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Cảnh báo quá hạn & Sắp đến hạn trả (FR-4.3)
              </h2>
              <p className="text-xs text-slate-400">
                Các bản sao đang mượn đã quá hạn hoặc còn ≤ 3 ngày tới hạn
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {report.canhBaoQuaHanVaSapDenHan.length} lượt cần xử lý
          </span>
        </div>

        {report.canhBaoQuaHanVaSapDenHan.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Không có cuốn sách nào quá hạn hoặc sắp đến hạn trong 3 ngày tới.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0F1522] text-xs text-slate-400">
                  <th className="text-left px-5 py-2.5 font-medium">Bản sao / Đầu sách</th>
                  <th className="text-left px-4 py-2.5 font-medium">Độc giả</th>
                  <th className="text-left px-4 py-2.5 font-medium">Hạn trả</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tình trạng</th>
                  <th className="text-right px-4 py-2.5 font-medium">Phạt dự kiến</th>
                  <th className="text-right px-5 py-2.5 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {report.canhBaoQuaHanVaSapDenHan.map((item) => {
                  const remain = daysUntil(item.NgayHenTra);
                  const isOverdue = remain < 0;
                  return (
                    <tr key={item.MaChiTiet} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-100 line-clamp-1">
                          {item.TenSach}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {item.MaBanSao} · {item.MaPhieu}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{item.HoTenDocGia}</div>
                        <div className="text-xs text-slate-400 tabular-nums">
                          {item.MaDocGia} · {item.SoDienThoai}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap">
                        {formatDateVi(item.NgayHenTra)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 tabular-nums">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Quá hạn {Math.abs(remain)} ngày</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 tabular-nums">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {remain === 0 ? 'Đến hạn hôm nay' : `Còn ${remain} ngày`}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-medium tabular-nums whitespace-nowrap">
                        {item.PhatDuKienNeuTraHomNay > 0 ? (
                          <span className="text-rose-400">
                            {formatCurrency(item.PhatDuKienNeuTraHomNay)}
                          </span>
                        ) : (
                          <span className="text-slate-500">0 đ</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              handleReminder(
                                item.MaChiTiet,
                                item.MaDocGia,
                                item.TenSach,
                                item.MaBanSao,
                                item.NgayHenTra,
                                'EMAIL'
                              )
                            }
                            disabled={sendingId === `${item.MaChiTiet}-EMAIL`}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-[#192233] border border-slate-700 rounded hover:bg-slate-800 inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email</span>
                          </button>
                          <button
                            onClick={() =>
                              handleReminder(
                                item.MaChiTiet,
                                item.MaDocGia,
                                item.TenSach,
                                item.MaBanSao,
                                item.NgayHenTra,
                                'SMS'
                              )
                            }
                            disabled={sendingId === `${item.MaChiTiet}-SMS`}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-[#192233] border border-slate-700 rounded hover:bg-slate-800 inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>SMS</span>
                          </button>
                          <button
                            onClick={() => onNavigateToReturn(item.MaBanSao)}
                            className="px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded hover:bg-emerald-500/20 whitespace-nowrap"
                          >
                            Nhận trả
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bottom Split: Top Borrowed Books + Patron Groups & Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-6 bg-[#121826] border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Top đầu sách mượn nhiều nhất
            </h2>
            <span className="text-xs text-slate-400">Xếp hạng lượt mượn</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="text-left px-5 py-2.5 font-medium w-10">#</th>
                <th className="text-left px-3 py-2.5 font-medium">Đầu sách</th>
                <th className="text-right px-4 py-2.5 font-medium">Sẵn có</th>
                <th className="text-right px-5 py-2.5 font-medium">Lượt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 tabular-nums">
              {report.topDauSach.map((book, idx) => (
                <tr key={book.MaDauSach} className="h-12 hover:bg-slate-800/30">
                  <td className="px-5 font-mono text-xs text-slate-500">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-100 line-clamp-1">{book.TenSach}</div>
                    <div className="text-xs text-slate-400">
                      {book.TacGia} · {book.TheLoai}
                    </div>
                  </td>
                  <td className="px-4 text-right text-xs text-slate-400 whitespace-nowrap">
                    {book.SoBanSanSang}/{book.TongBanSao}
                  </td>
                  <td className="px-5 text-right font-semibold text-emerald-400 font-mono">
                    {book.LuotMuon}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="lg:col-span-6 space-y-6">
          <section className="bg-[#121826] border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">
                Lưu hành theo nhóm độc giả
              </h2>
              <button
                onClick={() => onNavigateTab('patrons')}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
              >
                <span>Độc giả</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="text-left py-2 font-medium">Nhóm độc giả</th>
                  <th className="text-right py-2 font-medium">Số thẻ</th>
                  <th className="text-right py-2 font-medium">Đang giữ</th>
                  <th className="text-right py-2 font-medium">Tổng lượt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 tabular-nums">
                {report.thongKeTheoNhomDocGia.map((g) => (
                  <tr key={g.LoaiDocGia} className="h-10">
                    <td className="font-medium text-slate-200">{g.Label}</td>
                    <td className="text-right text-slate-400">{g.SoDocGia}</td>
                    <td className="text-right text-sky-400 font-medium">{g.DangMuon}</td>
                    <td className="text-right font-semibold text-white">{g.LuotMuon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="bg-[#121826] border border-slate-800 rounded-lg">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Nhật ký gửi nhắc hạn</h2>
              <Send className="w-4 h-4 text-slate-500" />
            </div>
            <div className="divide-y divide-slate-800/70 max-h-48 overflow-y-auto">
              {report.lichSuNhacNho.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-500">
                  Chưa có thông báo nhắc hạn nào được gửi.
                </div>
              ) : (
                report.lichSuNhacNho.map((log) => (
                  <div key={log.id} className="px-5 py-3 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-medium text-slate-200">
                        {log.HoTen} ({log.MaDocGia})
                      </span>
                      <span className="font-mono tabular-nums">
                        {log.Kenh} · {formatDateTimeVi(log.ThoiGianGui)}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-1 leading-relaxed">{log.NoiDung}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
