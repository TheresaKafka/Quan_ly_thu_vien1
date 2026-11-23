import React, { useEffect, useState } from 'react';
import { Database, GitBranch, KeyRound, Layers, ShieldCheck } from 'lucide-react';

interface SchemaStats {
  counts: Record<string, number>;
  sample: Record<string, Array<Record<string, unknown>>>;
}

const TABLES_META = [
  {
    name: 'DauSach',
    desc: 'Quản lý thông tin tác phẩm / đầu sách (tách biệt với bản sao vật lý)',
    indexes: ['PK: MaDauSach', 'UNIQUE: ISBN', 'Full-Text Index: (TenSach, TacGia)', 'B-Tree Index: TheLoai'],
    columns: [
      { col: 'MaDauSach', type: 'VARCHAR(20)', key: 'PK', note: 'Mã định danh đầu sách' },
      { col: 'ISBN', type: 'VARCHAR(20)', key: 'UNIQUE', note: 'Mã số tiêu chuẩn quốc tế' },
      { col: 'TenSach', type: 'NVARCHAR(255)', key: 'NOT NULL', note: 'Tên đầy đủ (Indexed)' },
      { col: 'TacGia', type: 'NVARCHAR(150)', key: 'NOT NULL', note: 'Tác giả (Indexed)' },
      { col: 'TheLoai', type: 'NVARCHAR(100)', key: 'NOT NULL', note: 'Thể loại' },
      { col: 'ViTriKe', type: 'VARCHAR(50)', key: 'NULL', note: 'Vị trí kệ lưu trữ' },
      { col: 'GiaBia', type: 'DECIMAL(12,0)', key: 'CHECK >= 0', note: 'Cơ sở tính bồi hoàn' },
    ],
  },
  {
    name: 'BanSaoSach',
    desc: 'Quản lý từng cuốn sách vật lý cụ thể với mã vạch riêng',
    indexes: ['PK: MaBanSao', 'FK: MaDauSach -> DauSach', 'Composite Index: (MaDauSach, TrangThai)'],
    columns: [
      { col: 'MaBanSao', type: 'VARCHAR(30)', key: 'PK', note: 'Mã vạch / QR dán trên sách' },
      { col: 'MaDauSach', type: 'VARCHAR(20)', key: 'FK', note: 'Tham chiếu DauSach' },
      { col: 'NgayNhapKho', type: 'DATE', key: 'NOT NULL', note: 'Ngày nhập kho' },
      { col: 'TrangThai', type: 'VARCHAR(20)', key: 'NOT NULL', note: 'SAN_SANG | DANG_MUON | HU_HONG | THAT_LAC | THANH_LY' },
      { col: 'TinhTrangVatLy', type: 'NVARCHAR(255)', key: 'NULL', note: 'Mô tả thực trạng vật lý' },
    ],
  },
  {
    name: 'DocGia',
    desc: 'Hồ sơ và trạng thái thẻ thư viện của độc giả',
    indexes: ['PK: MaDocGia', 'UNIQUE: SoDienThoai', 'UNIQUE: Email'],
    columns: [
      { col: 'MaDocGia', type: 'VARCHAR(20)', key: 'PK', note: 'Mã số thẻ độc giả' },
      { col: 'HoTen', type: 'NVARCHAR(100)', key: 'NOT NULL', note: 'Họ và tên đầy đủ' },
      { col: 'SoDienThoai', type: 'VARCHAR(15)', key: 'UNIQUE', note: 'Tra cứu nhanh & gửi SMS' },
      { col: 'LoaiDocGia', type: 'VARCHAR(20)', key: 'NOT NULL', note: 'SINH_VIEN | GIANG_VIEN | KHACH' },
      { col: 'NgayHetHan', type: 'DATE', key: 'CHECK > NgayCap', note: 'Kiểm tra BR-01' },
      { col: 'TrangThaiThe', type: 'VARCHAR(20)', key: 'NOT NULL', note: 'HOAT_DONG | BI_KHOA | HET_HAN' },
    ],
  },
  {
    name: 'PhieuMuonTra',
    desc: 'Phiên giao dịch mượn sách (hỗ trợ mượn nhiều sách trong 1 phiếu)',
    indexes: ['PK: MaPhieu', 'FK: MaDocGia -> DocGia'],
    columns: [
      { col: 'MaPhieu', type: 'VARCHAR(25)', key: 'PK', note: 'Ví dụ: PM-20261123-0001' },
      { col: 'MaDocGia', type: 'VARCHAR(20)', key: 'FK', note: 'Tham chiếu DocGia' },
      { col: 'NgayMuon', type: 'DATETIME', key: 'NOT NULL', note: 'Thời điểm xuất kho' },
      { col: 'NguoiLapPhieu', type: 'VARCHAR(50)', key: 'NOT NULL', note: 'Thủ thư thực hiện' },
      { col: 'TrangThaiPhieu', type: 'VARCHAR(20)', key: 'NOT NULL', note: 'DANG_MUON | TRA_MOT_PHAN | DA_HOAN_THANH' },
    ],
  },
  {
    name: 'ChiTietMuonTra',
    desc: 'Bảng trung gian từng bản sao: hạn trả, gia hạn, trả từng phần & tiền phạt',
    indexes: ['PK: MaChiTiet', 'FK: MaPhieu, MaBanSao', 'Composite Index: (NgayTraThucTe, NgayHenTra)'],
    columns: [
      { col: 'MaChiTiet', type: 'BIGINT', key: 'PK', note: 'Khóa chính tự tăng' },
      { col: 'MaPhieu', type: 'VARCHAR(25)', key: 'FK', note: 'Tham chiếu PhieuMuonTra' },
      { col: 'MaBanSao', type: 'VARCHAR(30)', key: 'FK', note: 'Tham chiếu BanSaoSach' },
      { col: 'NgayHenTra', type: 'DATE', key: 'NOT NULL', note: 'Cập nhật khi gia hạn' },
      { col: 'SoLanGiaHan', type: 'TINYINT', key: 'CHECK <= 2', note: 'Kiểm soát BR-06' },
      { col: 'NgayTraThucTe', type: 'DATETIME', key: 'NULL', note: 'NULL nếu đang mượn' },
      { col: 'TienPhat', type: 'DECIMAL(12,0)', key: 'DEFAULT 0', note: 'Tính tự động theo BR-05' },
      { col: 'DaDongPhat', type: 'BOOLEAN', key: 'DEFAULT FALSE', note: 'Trạng thái thanh toán' },
    ],
  },
];

const BUSINESS_RULES_DOC = [
  {
    code: 'BR-01',
    title: 'Tư cách & hiệu lực thẻ độc giả',
    desc: 'Thẻ phải đang ở trạng thái HOAT_DONG và NgayHetHan >= Ngày hiện tại mới được phép mượn hoặc gia hạn.',
  },
  {
    code: 'BR-02',
    title: 'Kiểm tra nợ đọng & sách quá hạn',
    desc: 'Từ chối cho mượn mới nếu độc giả đang giữ ít nhất 1 bản sao quá hạn hoặc còn tiền phạt chưa thanh toán (DaDongPhat = false).',
  },
  {
    code: 'BR-03',
    title: 'Hạn mức mượn theo nhóm độc giả',
    desc: 'Tổng số bản sao chưa trả + số chọn mới không vượt quá hạn mức (Sinh viên: 5 cuốn, Giảng viên: 10 cuốn, Khách: 3 cuốn).',
  },
  {
    code: 'BR-04',
    title: 'Tính toàn vẹn trạng thái bản sao',
    desc: 'Chỉ những BanSaoSach có trạng thái SAN_SANG mới được xuất kho. Khi lập phiếu, hệ thống đồng bộ ngay sang DANG_MUON.',
  },
  {
    code: 'BR-05',
    title: 'Tính phạt trễ hạn & phục hồi kho khi trả',
    desc: 'Phạt trễ hạn = Số ngày trễ × 5.000đ/ngày. Nếu Hư hỏng (+50% giá bìa) hoặc Làm mất (+100% giá bìa). Phiếu tự chuyển TRA_MOT_PHAN hoặc DA_HOAN_THANH.',
  },
  {
    code: 'BR-06',
    title: 'Điều kiện gia hạn sách',
    desc: 'Chỉ gia hạn khi thỏa mãn đồng thời: (1) Sách chưa quá hạn tại thời điểm gia hạn, (2) SoLanGiaHan < 2, (3) Thẻ còn hiệu lực.',
  },
];

export const SystemBlueprintView: React.FC = () => {
  const [stats, setStats] = useState<SchemaStats | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<'borrow' | 'return' | 'renew'>('borrow');
  const [selectedTable, setSelectedTable] = useState<string>('DauSach');

  useEffect(() => {
    fetch('/api/system/schema-stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  const currentTableMeta = TABLES_META.find((t) => t.name === selectedTable) || TABLES_META[0];

  return (
    <div className="space-y-6">
      <section className="bg-[#121826] border border-slate-800 rounded-lg p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Lưu đồ quy trình & Quy tắc nghiệp vụ thực thi (BR-01 đến BR-06)
              </h2>
              <p className="text-xs text-slate-400">
                Tất cả điều kiện kiểm tra dưới đây đang được thực thi trực tiếp ở tầng máy chủ Express
              </p>
            </div>
          </div>

          <div className="inline-flex items-center p-1 bg-[#0B0F19] rounded-md border border-slate-800">
            {[
              { id: 'borrow', label: 'Luồng Mượn sách' },
              { id: 'return', label: 'Luồng Trả sách' },
              { id: 'renew', label: 'Luồng Gia hạn' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFlow(f.id as 'borrow' | 'return' | 'renew')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  selectedFlow === f.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#0B0F19] border border-slate-800 rounded-md p-4 overflow-x-auto">
          {selectedFlow === 'borrow' && (
            <div className="flex items-center gap-3 min-w-[780px] text-xs">
              {[
                { step: '1. Quét mã thẻ', rule: 'DocGia' },
                { step: '2. Kiểm tra hiệu lực thẻ', rule: 'BR-01' },
                { step: '3. Kiểm tra quá hạn & nợ phạt', rule: 'BR-02' },
                { step: '4. Kiểm tra hạn mức sách', rule: 'BR-03' },
                { step: '5. Quét bản sao Sẵn sàng', rule: 'BR-04' },
                { step: '6. Tạo Phiếu & Đổi = Đang mượn', rule: 'Commit' },
              ].map((node, i, arr) => (
                <React.Fragment key={node.step}>
                  <div className="flex-1 bg-[#121826] border border-slate-800 rounded-md p-3">
                    <div className="font-mono text-[11px] text-emerald-400 font-semibold">
                      {node.rule}
                    </div>
                    <div className="font-medium text-slate-100 mt-1">{node.step}</div>
                  </div>
                  {i < arr.length - 1 && <span className="text-slate-600 font-mono">→</span>}
                </React.Fragment>
              ))}
            </div>
          )}

          {selectedFlow === 'return' && (
            <div className="flex items-center gap-3 min-w-[780px] text-xs">
              {[
                { step: '1. Quét mã bản sao trả', rule: 'MaBanSao' },
                { step: '2. Truy ngược ChiTietMuonTra mở', rule: 'Lookup' },
                { step: '3. Kiểm tra thực trạng & Hạn trả', rule: 'Inspect' },
                { step: '4. Tính phạt trễ / hư hỏng / mất', rule: 'BR-05' },
                { step: '5. Phục hồi trạng thái kho', rule: 'BanSaoSach' },
                { step: '6. Cập nhật Trả một phần / Hoàn thành', rule: 'PhieuMuonTra' },
              ].map((node, i, arr) => (
                <React.Fragment key={node.step}>
                  <div className="flex-1 bg-[#121826] border border-slate-800 rounded-md p-3">
                    <div className="font-mono text-[11px] text-sky-400 font-semibold">
                      {node.rule}
                    </div>
                    <div className="font-medium text-slate-100 mt-1">{node.step}</div>
                  </div>
                  {i < arr.length - 1 && <span className="text-slate-600 font-mono">→</span>}
                </React.Fragment>
              ))}
            </div>
          )}

          {selectedFlow === 'renew' && (
            <div className="flex items-center gap-3 min-w-[680px] text-xs">
              {[
                { step: '1. Chọn bản sao đang mượn', rule: 'ChiTietMuonTra' },
                { step: '2. Chưa quá hạn & Thẻ còn hạn', rule: 'BR-01 & BR-06' },
                { step: '3. Số lần gia hạn < 2', rule: 'BR-06' },
                { step: '4. Cộng NgayHenTra & SoLanGiaHan + 1', rule: 'Update' },
              ].map((node, i, arr) => (
                <React.Fragment key={node.step}>
                  <div className="flex-1 bg-[#121826] border border-slate-800 rounded-md p-3">
                    <div className="font-mono text-[11px] text-amber-400 font-semibold">
                      {node.rule}
                    </div>
                    <div className="font-medium text-slate-100 mt-1">{node.step}</div>
                  </div>
                  {i < arr.length - 1 && <span className="text-slate-600 font-mono">→</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUSINESS_RULES_DOC.map((r) => (
            <div key={r.code} className="bg-[#0B0F19] border border-slate-800 rounded-md p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono text-xs font-bold text-emerald-400">{r.code}</span>
                <span className="text-xs font-semibold text-white">{r.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#121826] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-slate-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Thiết kế Cơ sở dữ liệu 5 bảng chuẩn hóa 3NF & Chiến lược Index
              </h2>
              <p className="text-xs text-slate-400">
                Chọn từng bảng để xem cấu trúc trường dữ liệu, khóa chính/ngoại và số bản ghi thực tế
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TABLES_META.map((t) => {
            const count = stats?.counts?.[t.name] ?? 0;
            const active = selectedTable === t.name;
            return (
              <button
                key={t.name}
                onClick={() => setSelectedTable(t.name)}
                className={`text-left p-3 rounded-md border transition-colors ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-[#0B0F19] text-slate-200 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-mono text-xs font-semibold">{t.name}</div>
                <div
                  className={`text-xs mt-1 tabular-nums ${
                    active ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  {count} bản ghi
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          <div className="lg:col-span-8 border border-slate-800 rounded-md overflow-hidden bg-[#0B0F19]">
            <div className="px-4 py-3 bg-[#0F1522] border-b border-slate-800">
              <span className="font-mono text-sm font-bold text-white">
                {currentTableMeta.name}
              </span>
              <span className="text-xs text-slate-400 ml-2">— {currentTableMeta.desc}</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left px-4 py-2 font-medium">Tên trường</th>
                  <th className="text-left px-3 py-2 font-medium">Kiểu dữ liệu</th>
                  <th className="text-left px-3 py-2 font-medium">Khóa / Ràng buộc</th>
                  <th className="text-left px-4 py-2 font-medium">Mô tả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {currentTableMeta.columns.map((c) => (
                  <tr key={c.col} className="h-9">
                    <td className="px-4 font-mono font-semibold text-white">{c.col}</td>
                    <td className="px-3 font-mono text-slate-400">{c.type}</td>
                    <td className="px-3 font-mono text-emerald-400 font-medium">{c.key}</td>
                    <td className="px-4 text-slate-300">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#0B0F19] border border-slate-800 rounded-md p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Chỉ mục tối ưu hiệu năng (Indexing)</span>
              </div>
              <ul className="space-y-1.5 text-xs font-mono text-slate-300">
                {currentTableMeta.indexes.map((idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <span>{idx}</span>
                  </li>
                ))}
              </ul>
            </div>

            {stats?.sample?.[currentTableMeta.name] && (
              <div className="bg-[#0B0F19] border border-slate-800 rounded-md p-4 space-y-2">
                <div className="text-xs font-semibold text-white">
                  Dữ liệu mẫu thực tế ({currentTableMeta.name})
                </div>
                <pre className="text-[11px] font-mono text-slate-300 bg-[#121826] p-2.5 rounded border border-slate-800 overflow-x-auto max-h-48">
                  {JSON.stringify(stats.sample[currentTableMeta.name][0], null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
