import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  buildDashboardReport,
  calculateReturnFine,
  enrichLoanItem,
  evaluatePatronEligibility,
  generateNextCopyCode,
  getPatronsEnriched,
  getSlipsEnriched,
  getTitlesWithStats,
  getTodayStr,
  loadDb,
  mapReturnConditionToCopyStatus,
  recalculateSlipStatus,
  resetDbToSeed,
  saveDb,
} from './server/db.ts';
import {
  BUSINESS_RULES,
  KiemKeRecord,
  LoaiDocGia,
  LoanItemEnriched,
  SearchMode,
  TinhTrangKhiTra,
  TrangThaiBanSao,
  TrangThaiThe,
} from './src/types/library.ts';
import {
  executeLibrarySearch,
  getRelatedBooksDiscovery,
} from './server/search.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ============================================================================
  // NHÓM 4: BÁO CÁO & THỐNG KÊ (FR-4.3, FR-4.4)
  // ============================================================================
  app.get('/api/reports/overview', (_req, res) => {
    const db = loadDb();
    res.json(buildDashboardReport(db));
  });

  app.post('/api/reminders/send', (req, res) => {
    const { MaDocGia, Kenh = 'EMAIL', NoiDung } = req.body as {
      MaDocGia: string;
      Kenh?: 'EMAIL' | 'SMS';
      NoiDung?: string;
    };
    const db = loadDb();
    const docGia = db.DocGia.find((d) => d.MaDocGia === MaDocGia);
    if (!docGia) {
      res.status(404).json({ error: 'Không tìm thấy độc giả.' });
      return;
    }
    const record = {
      id: `NN-${Date.now().toString().slice(-6)}`,
      MaDocGia: docGia.MaDocGia,
      HoTen: docGia.HoTen,
      Kenh,
      NoiDung:
        NoiDung ||
        `Thông báo nhắc hạn trả sách gửi tới ${docGia.HoTen} (${Kenh === 'EMAIL' ? docGia.Email || docGia.SoDienThoai : docGia.SoDienThoai}).`,
      ThoiGianGui: new Date().toISOString(),
    };
    db.NhacNho.push(record);
    saveDb(db);
    res.json({ success: true, record });
  });

  // ============================================================================
  // NHÓM 1: ĐẦU SÁCH & BẢN SAO & TÌM KIẾM ĐA PHƯƠNG ÁN (FR-1.1..1.3, FR-4.1)
  // ============================================================================
  app.get('/api/titles/search', async (req, res) => {
    try {
      const db = loadDb();
      const {
        q = '',
        mode = 'traditional',
        theLoai = 'ALL',
        viTriKe = 'ALL',
        nam = 'ALL',
        chiConSach = 'false',
      } = req.query as Record<string, string>;

      const validMode: SearchMode =
        mode === 'fuzzy' || mode === 'semantic' ? mode : 'traditional';

      const result = await executeLibrarySearch(db, {
        q,
        mode: validMode,
        theLoai,
        viTriKe,
        nam,
        chiConSach: chiConSach === 'true',
      });
      res.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Lỗi thực thi tìm kiếm nâng cao.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/titles/:maDauSach/related', (req, res) => {
    const db = loadDb();
    const recommendations = getRelatedBooksDiscovery(db, req.params.maDauSach);
    res.json({ recommendations });
  });

  app.get('/api/titles', (req, res) => {
    const db = loadDb();
    const { q = '', theLoai = '', nam = '', chiConSach = 'false' } = req.query as Record<string, string>;
    let titles = getTitlesWithStats(db, true);

    if (q.trim()) {
      const kw = q.trim().toLowerCase();
      titles = titles.filter(
        (t) =>
          t.TenSach.toLowerCase().includes(kw) ||
          t.TacGia.toLowerCase().includes(kw) ||
          (t.ISBN && t.ISBN.toLowerCase().includes(kw)) ||
          t.MaDauSach.toLowerCase().includes(kw) ||
          (t.BanSaoList && t.BanSaoList.some((b) => b.MaBanSao.toLowerCase().includes(kw)))
      );
    }
    if (theLoai && theLoai !== 'ALL') {
      titles = titles.filter((t) => t.TheLoai === theLoai);
    }
    if (nam && nam !== 'ALL') {
      titles = titles.filter((t) => String(t.NamXuatBan) === nam);
    }
    if (chiConSach === 'true') {
      titles = titles.filter((t) => t.SoBanSanSang > 0);
    }

    const categories = Array.from(
      new Set(db.DauSach.filter((d) => !d.DaXoa).map((d) => d.TheLoai))
    ).sort();
    const years = Array.from(
      new Set(db.DauSach.filter((d) => !d.DaXoa).map((d) => d.NamXuatBan))
    ).sort((a, b) => b - a);

    res.json({ titles, categories, years });
  });

  app.post('/api/titles', (req, res) => {
    const {
      ISBN,
      TenSach,
      TacGia,
      TheLoai,
      NhaXuatBan,
      NamXuatBan,
      ViTriKe,
      GiaBia,
      MoTa,
      SoLuongBanSao = 1,
    } = req.body;

    if (!TenSach?.trim() || !TacGia?.trim() || !TheLoai?.trim()) {
      res.status(400).json({ error: 'Vui lòng nhập đầy đủ Tên sách, Tác giả và Thể loại.' });
      return;
    }

    const year = Number(NamXuatBan);
    if (Number.isNaN(year) || year <= 1900 || year > new Date().getFullYear() + 1) {
      res.status(400).json({ error: 'Năm xuất bản phải hợp lệ (> 1900).' });
      return;
    }

    const price = Number(GiaBia);
    if (Number.isNaN(price) || price < 0) {
      res.status(400).json({ error: 'Giá bìa phải >= 0.' });
      return;
    }

    const db = loadDb();
    if (ISBN && ISBN.trim()) {
      const dup = db.DauSach.find(
        (d) => !d.DaXoa && d.ISBN && d.ISBN.toLowerCase() === ISBN.trim().toLowerCase()
      );
      if (dup) {
        res.status(409).json({ error: `ISBN ${ISBN} đã tồn tại ở đầu sách ${dup.MaDauSach}.` });
        return;
      }
    }

    const nextNum =
      db.DauSach.reduce((max, d) => {
        const n = parseInt(d.MaDauSach.replace(/\D/g, ''), 10);
        return Number.isNaN(n) ? max : Math.max(max, n);
      }, 0) + 1;
    const maDauSach = `DS-${String(nextNum).padStart(3, '0')}`;

    const newTitle = {
      MaDauSach: maDauSach,
      ISBN: ISBN?.trim() || null,
      TenSach: TenSach.trim(),
      TacGia: TacGia.trim(),
      TheLoai: TheLoai.trim(),
      NhaXuatBan: NhaXuatBan?.trim() || null,
      NamXuatBan: year,
      ViTriKe: ViTriKe?.trim() || null,
      GiaBia: price,
      MoTa: MoTa?.trim() || '',
      NgayTao: new Date().toISOString(),
      DaXoa: false,
    };

    db.DauSach.push(newTitle);

    const copyCount = Math.min(20, Math.max(0, Number(SoLuongBanSao) || 0));
    const today = getTodayStr();
    const createdCopies = [];
    for (let i = 0; i < copyCount; i++) {
      const code = generateNextCopyCode(db, maDauSach);
      const copy = {
        MaBanSao: code,
        MaDauSach: maDauSach,
        NgayNhapKho: today,
        TrangThai: 'SAN_SANG' as TrangThaiBanSao,
        TinhTrangVatLy: 'Mới 100%',
      };
      db.BanSaoSach.push(copy);
      createdCopies.push(copy);
    }

    saveDb(db);
    res.status(201).json({ title: newTitle, createdCopies });
  });

  app.put('/api/titles/:maDauSach', (req, res) => {
    const { maDauSach } = req.params;
    const db = loadDb();
    const title = db.DauSach.find((d) => d.MaDauSach === maDauSach && !d.DaXoa);
    if (!title) {
      res.status(404).json({ error: 'Không tìm thấy đầu sách.' });
      return;
    }

    const { TenSach, TacGia, TheLoai, NhaXuatBan, NamXuatBan, ViTriKe, GiaBia, ISBN, MoTa } = req.body;
    if (TenSach !== undefined) title.TenSach = String(TenSach).trim();
    if (TacGia !== undefined) title.TacGia = String(TacGia).trim();
    if (TheLoai !== undefined) title.TheLoai = String(TheLoai).trim();
    if (NhaXuatBan !== undefined) title.NhaXuatBan = NhaXuatBan ? String(NhaXuatBan).trim() : null;
    if (NamXuatBan !== undefined) title.NamXuatBan = Number(NamXuatBan);
    if (ViTriKe !== undefined) title.ViTriKe = ViTriKe ? String(ViTriKe).trim() : null;
    if (GiaBia !== undefined) title.GiaBia = Math.max(0, Number(GiaBia));
    if (ISBN !== undefined) title.ISBN = ISBN ? String(ISBN).trim() : null;
    if (MoTa !== undefined) title.MoTa = String(MoTa).trim();

    saveDb(db);
    res.json({ title });
  });

  app.delete('/api/titles/:maDauSach', (req, res) => {
    const { maDauSach } = req.params;
    const db = loadDb();
    const title = db.DauSach.find((d) => d.MaDauSach === maDauSach && !d.DaXoa);
    if (!title) {
      res.status(404).json({ error: 'Không tìm thấy đầu sách.' });
      return;
    }

    const activeCopy = db.BanSaoSach.find(
      (b) => b.MaDauSach === maDauSach && b.TrangThai === 'DANG_MUON'
    );
    if (activeCopy) {
      res.status(400).json({
        error: `Không thể xóa đầu sách vì bản sao ${activeCopy.MaBanSao} đang được độc giả mượn.`,
      });
      return;
    }

    title.DaXoa = true;
    saveDb(db);
    res.json({ success: true });
  });

  app.post('/api/titles/:maDauSach/copies', (req, res) => {
    const { maDauSach } = req.params;
    const { soLuong = 1, tinhTrangVatLy = 'Mới 100%' } = req.body;
    const db = loadDb();
    const title = db.DauSach.find((d) => d.MaDauSach === maDauSach && !d.DaXoa);
    if (!title) {
      res.status(404).json({ error: 'Không tìm thấy đầu sách.' });
      return;
    }
    const count = Math.min(20, Math.max(1, Number(soLuong) || 1));
    const today = getTodayStr();
    const added = [];
    for (let i = 0; i < count; i++) {
      const code = generateNextCopyCode(db, maDauSach);
      const copy = {
        MaBanSao: code,
        MaDauSach: maDauSach,
        NgayNhapKho: today,
        TrangThai: 'SAN_SANG' as TrangThaiBanSao,
        TinhTrangVatLy: String(tinhTrangVatLy).trim() || 'Mới 100%',
      };
      db.BanSaoSach.push(copy);
      added.push(copy);
    }
    saveDb(db);
    res.status(201).json({ copies: added });
  });

  app.patch('/api/copies/:maBanSao', (req, res) => {
    const { maBanSao } = req.params;
    const { TrangThai, TinhTrangVatLy } = req.body as {
      TrangThai?: TrangThaiBanSao;
      TinhTrangVatLy?: string;
    };
    const db = loadDb();
    const copy = db.BanSaoSach.find((b) => b.MaBanSao === maBanSao);
    if (!copy) {
      res.status(404).json({ error: 'Không tìm thấy mã bản sao.' });
      return;
    }

    if (copy.TrangThai === 'DANG_MUON' && TrangThai && TrangThai !== 'DANG_MUON') {
      res.status(400).json({
        error: 'Bản sao đang được mượn. Vui lòng thực hiện trả sách tại Quầy Lưu hành.',
      });
      return;
    }

    if (TrangThai) copy.TrangThai = TrangThai;
    if (TinhTrangVatLy !== undefined) copy.TinhTrangVatLy = TinhTrangVatLy;
    saveDb(db);
    res.json({ copy });
  });

  app.get('/api/copies/lookup/:maBanSao', (req, res) => {
    const { maBanSao } = req.params;
    const db = loadDb();
    const copy = db.BanSaoSach.find(
      (b) => b.MaBanSao.toLowerCase() === maBanSao.trim().toLowerCase()
    );
    if (!copy) {
      res.status(404).json({ error: `Không tìm thấy bản sao có mã "${maBanSao}".` });
      return;
    }
    const title = db.DauSach.find((d) => d.MaDauSach === copy.MaDauSach);
    const activeLoan = db.ChiTietMuonTra.find(
      (ct) => ct.MaBanSao === copy.MaBanSao && ct.NgayTraThucTe === null
    );
    const activeLoanEnriched = activeLoan
      ? enrichLoanItem(activeLoan, db, getTodayStr())
      : null;

    res.json({ copy, title, activeLoan: activeLoanEnriched });
  });

  // Kiểm kê kho định kỳ (FR-1.3)
  app.get('/api/inventory/audits', (_req, res) => {
    const db = loadDb();
    res.json({ audits: [...db.KiemKe].reverse() });
  });

  app.post('/api/inventory/audit', (req, res) => {
    const { scannedCodes, nguoiKiemKe = 'Thủ thư trực kho', markMissingAsLost = false } =
      req.body as {
        scannedCodes: string[];
        nguoiKiemKe?: string;
        markMissingAsLost?: boolean;
      };

    const db = loadDb();
    const normalizedScanned = Array.from(
      new Set(
        (scannedCodes || [])
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      )
    );
    const scannedSet = new Set(normalizedScanned);

    const activeTitleIds = new Set(
      db.DauSach.filter((d) => !d.DaXoa).map((d) => d.MaDauSach)
    );
    const expectedOnShelf = db.BanSaoSach.filter(
      (b) => activeTitleIds.has(b.MaDauSach) && b.TrangThai === 'SAN_SANG'
    );

    const matched: string[] = [];
    const missingFromShelf: Array<{
      MaBanSao: string;
      TenSach: string;
      ViTriKe: string | null;
    }> = [];
    const statusMismatch: Array<{
      MaBanSao: string;
      TenSach: string;
      TrangThaiHeThong: TrangThaiBanSao;
    }> = [];
    const unknownCodes: string[] = [];

    for (const copy of expectedOnShelf) {
      if (scannedSet.has(copy.MaBanSao.toUpperCase())) {
        matched.push(copy.MaBanSao);
      } else {
        const title = db.DauSach.find((d) => d.MaDauSach === copy.MaDauSach);
        missingFromShelf.push({
          MaBanSao: copy.MaBanSao,
          TenSach: title?.TenSach || copy.MaDauSach,
          ViTriKe: title?.ViTriKe || null,
        });
        if (markMissingAsLost) {
          copy.TrangThai = 'THAT_LAC';
          copy.TinhTrangVatLy = `Gắn cờ thất lạc khi kiểm kê ngày ${getTodayStr()}`;
        }
      }
    }

    for (const code of normalizedScanned) {
      const found = db.BanSaoSach.find((b) => b.MaBanSao.toUpperCase() === code);
      if (!found) {
        unknownCodes.push(code);
      } else if (found.TrangThai !== 'SAN_SANG') {
        const title = db.DauSach.find((d) => d.MaDauSach === found.MaDauSach);
        statusMismatch.push({
          MaBanSao: found.MaBanSao,
          TenSach: title?.TenSach || found.MaDauSach,
          TrangThaiHeThong: found.TrangThai,
        });
      }
    }

    const record: KiemKeRecord = {
      id: `KK-${Date.now().toString().slice(-6)}`,
      NgayKiemKe: new Date().toISOString(),
      NguoiKiemKe: nguoiKiemKe,
      TongQuet: normalizedScanned.length,
      SoKhop: matched.length,
      SoThieu: missingFromShelf.length,
      SoLechTrangThai: statusMismatch.length,
      ChiTietThieu: missingFromShelf.map((m) => m.MaBanSao),
    };
    db.KiemKe.push(record);
    saveDb(db);

    res.json({
      record,
      expectedCount: expectedOnShelf.length,
      matched,
      missingFromShelf,
      statusMismatch,
      unknownCodes,
      markedAsLost: markMissingAsLost,
    });
  });

  // ============================================================================
  // NHÓM 2: QUẢN LÝ ĐỘC GIẢ & THẺ THƯ VIỆN (FR-2.1, FR-2.2, FR-2.3)
  // ============================================================================
  app.get('/api/patrons', (req, res) => {
    const db = loadDb();
    const { q = '', loai = 'ALL', trangThai = 'ALL' } = req.query as Record<string, string>;
    let patrons = getPatronsEnriched(db);

    if (q.trim()) {
      const kw = q.trim().toLowerCase();
      patrons = patrons.filter(
        (p) =>
          p.MaDocGia.toLowerCase().includes(kw) ||
          p.HoTen.toLowerCase().includes(kw) ||
          p.SoDienThoai.toLowerCase().includes(kw) ||
          (p.Email && p.Email.toLowerCase().includes(kw))
      );
    }
    if (loai !== 'ALL') {
      patrons = patrons.filter((p) => p.LoaiDocGia === loai);
    }
    if (trangThai !== 'ALL') {
      patrons = patrons.filter((p) => p.TrangThaiThe === trangThai);
    }

    res.json({ patrons });
  });

  app.post('/api/patrons', (req, res) => {
    const { HoTen, NgaySinh, SoDienThoai, Email, DiaChi, LoaiDocGia = 'SINH_VIEN', ThoiHanThang = 12 } = req.body;
    if (!HoTen?.trim() || !SoDienThoai?.trim()) {
      res.status(400).json({ error: 'Vui lòng nhập Họ tên và Số điện thoại.' });
      return;
    }

    const db = loadDb();
    if (db.DocGia.some((d) => d.SoDienThoai === SoDienThoai.trim())) {
      res.status(409).json({ error: 'Số điện thoại đã được đăng ký cho một thẻ độc giả khác.' });
      return;
    }
    if (
      Email?.trim() &&
      db.DocGia.some((d) => d.Email && d.Email.toLowerCase() === Email.trim().toLowerCase())
    ) {
      res.status(409).json({ error: 'Email đã tồn tại trong hệ thống.' });
      return;
    }

    const nextSeq =
      db.DocGia.reduce((max, d) => {
        const part = parseInt(d.MaDocGia.slice(-3), 10);
        return Number.isNaN(part) ? max : Math.max(max, part);
      }, 0) + 1;
    const year = new Date().getFullYear();
    const maDocGia = `DG-${year}${String(nextSeq).padStart(3, '0')}`;

    const today = new Date();
    const expiry = new Date(today);
    expiry.setMonth(expiry.getMonth() + (Number(ThoiHanThang) || 12));

    const newPatron = {
      MaDocGia: maDocGia,
      HoTen: HoTen.trim(),
      NgaySinh: NgaySinh || null,
      SoDienThoai: SoDienThoai.trim(),
      Email: Email?.trim() || null,
      DiaChi: DiaChi?.trim() || '',
      LoaiDocGia: LoaiDocGia as LoaiDocGia,
      NgayCapThe: today.toISOString().slice(0, 10),
      NgayHetHan: expiry.toISOString().slice(0, 10),
      TrangThaiThe: 'HOAT_DONG' as TrangThaiThe,
    };

    db.DocGia.push(newPatron);
    saveDb(db);
    res.status(201).json({ patron: newPatron });
  });

  app.put('/api/patrons/:maDocGia', (req, res) => {
    const { maDocGia } = req.params;
    const db = loadDb();
    const patron = db.DocGia.find((d) => d.MaDocGia === maDocGia);
    if (!patron) {
      res.status(404).json({ error: 'Không tìm thấy độc giả.' });
      return;
    }

    const { HoTen, NgaySinh, SoDienThoai, Email, DiaChi, LoaiDocGia } = req.body;
    if (HoTen !== undefined) patron.HoTen = String(HoTen).trim();
    if (NgaySinh !== undefined) patron.NgaySinh = NgaySinh || null;
    if (SoDienThoai !== undefined) patron.SoDienThoai = String(SoDienThoai).trim();
    if (Email !== undefined) patron.Email = Email ? String(Email).trim() : null;
    if (DiaChi !== undefined) patron.DiaChi = String(DiaChi).trim();
    if (LoaiDocGia !== undefined) patron.LoaiDocGia = LoaiDocGia;

    saveDb(db);
    res.json({ patron });
  });

  app.patch('/api/patrons/:maDocGia/card', (req, res) => {
    const { maDocGia } = req.params;
    const { action, extendMonths = 12 } = req.body as {
      action: 'LOCK' | 'UNLOCK' | 'RENEW';
      extendMonths?: number;
    };
    const db = loadDb();
    const patron = db.DocGia.find((d) => d.MaDocGia === maDocGia);
    if (!patron) {
      res.status(404).json({ error: 'Không tìm thấy độc giả.' });
      return;
    }

    if (action === 'LOCK') {
      patron.TrangThaiThe = 'BI_KHOA';
    } else if (action === 'UNLOCK') {
      const todayStr = getTodayStr();
      patron.TrangThaiThe = patron.NgayHetHan < todayStr ? 'HET_HAN' : 'HOAT_DONG';
    } else if (action === 'RENEW') {
      const todayStr = getTodayStr();
      const baseDate = patron.NgayHetHan > todayStr ? new Date(patron.NgayHetHan) : new Date();
      baseDate.setMonth(baseDate.getMonth() + (Number(extendMonths) || 12));
      patron.NgayHetHan = baseDate.toISOString().slice(0, 10);
      if (patron.TrangThaiThe === 'HET_HAN') {
        patron.TrangThaiThe = 'HOAT_DONG';
      }
    }

    saveDb(db);
    res.json({ patron });
  });

  // ============================================================================
  // NHÓM 3: LƯU HÀNH MƯỢN - TRẢ - GIA HẠN - THU PHẠT (FR-3.1..3.4, FR-4.2)
  // ============================================================================
  app.get('/api/circulation/slips', (req, res) => {
    const db = loadDb();
    const { q = '', trangThai = 'ALL' } = req.query as Record<string, string>;
    let slips = getSlipsEnriched(db);

    if (q.trim()) {
      const kw = q.trim().toLowerCase();
      slips = slips.filter(
        (s) =>
          s.MaPhieu.toLowerCase().includes(kw) ||
          s.MaDocGia.toLowerCase().includes(kw) ||
          s.HoTenDocGia.toLowerCase().includes(kw) ||
          s.ChiTiet.some(
            (ct) =>
              ct.MaBanSao.toLowerCase().includes(kw) ||
              ct.TenSach.toLowerCase().includes(kw)
          )
      );
    }
    if (trangThai !== 'ALL') {
      slips = slips.filter((s) => s.TrangThaiPhieu === trangThai);
    }

    res.json({ slips });
  });

  // FR-3.1: Lập phiếu mượn sách (Kiểm tra BR-01, BR-02, BR-03, BR-04)
  app.post('/api/circulation/borrow', (req, res) => {
    const {
      MaDocGia,
      MaBanSaoList,
      NguoiLapPhieu = 'Thủ thư Lan Hương',
      GhiChu = '',
      SoNgayMuonTuyChon,
    } = req.body as {
      MaDocGia: string;
      MaBanSaoList: string[];
      NguoiLapPhieu?: string;
      GhiChu?: string;
      SoNgayMuonTuyChon?: number;
    };

    if (!MaDocGia || !Array.isArray(MaBanSaoList) || MaBanSaoList.length === 0) {
      res.status(400).json({ error: 'Vui lòng chọn độc giả và ít nhất 1 bản sao sách.' });
      return;
    }

    const db = loadDb();
    const todayStr = getTodayStr();
    const docGia = db.DocGia.find((d) => d.MaDocGia === MaDocGia);
    if (!docGia) {
      res.status(404).json({ error: 'Không tìm thấy thẻ độc giả.' });
      return;
    }

    const eligibility = evaluatePatronEligibility(docGia, db, todayStr);
    if (!eligibility.hopLe) {
      res.status(400).json({
        error: eligibility.lyDoTuChoi.join(' '),
        reasons: eligibility.lyDoTuChoi,
      });
      return;
    }

    const uniqueCodes = Array.from(new Set(MaBanSaoList.map((c) => c.trim())));
    if (eligibility.dangMuonCount + uniqueCodes.length > eligibility.hanMucToiDa) {
      res.status(400).json({
        error: `BR-03: Vượt quá hạn mức mượn tối đa (${eligibility.dangMuonCount} đang mượn + ${uniqueCodes.length} chọn mới > ${eligibility.hanMucToiDa} cuốn).`,
      });
      return;
    }

    const copiesToBorrow = [];
    for (const code of uniqueCodes) {
      const copy = db.BanSaoSach.find((b) => b.MaBanSao === code);
      if (!copy) {
        res.status(404).json({ error: `Không tìm thấy mã bản sao "${code}".` });
        return;
      }
      if (copy.TrangThai !== 'SAN_SANG') {
        res.status(400).json({
          error: `BR-04: Bản sao ${copy.MaBanSao} hiện có trạng thái "${copy.TrangThai}", không thể cho mượn.`,
        });
        return;
      }
      copiesToBorrow.push(copy);
    }

    const dateCompact = todayStr.replace(/-/g, '');
    const todayCount =
      db.PhieuMuonTra.filter((p) => p.MaPhieu.includes(dateCompact)).length + 1;
    const maPhieu = `PM-${dateCompact}-${String(todayCount).padStart(4, '0')}`;

    const loanDays =
      SoNgayMuonTuyChon && SoNgayMuonTuyChon > 0
        ? Math.min(60, Number(SoNgayMuonTuyChon))
        : BUSINESS_RULES.LOAN_LIMITS[docGia.LoaiDocGia].loanDays;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);
    const ngayHenTra = dueDate.toISOString().slice(0, 10);

    const newSlip = {
      MaPhieu: maPhieu,
      MaDocGia: docGia.MaDocGia,
      NgayMuon: new Date().toISOString(),
      NguoiLapPhieu,
      TrangThaiPhieu: 'DANG_MUON' as const,
      GhiChu: GhiChu?.trim() || null,
    };
    db.PhieuMuonTra.push(newSlip);

    let nextDetailId =
      db.ChiTietMuonTra.reduce((m, c) => Math.max(m, c.MaChiTiet), 0) + 1;
    for (const copy of copiesToBorrow) {
      copy.TrangThai = 'DANG_MUON';
      db.ChiTietMuonTra.push({
        MaChiTiet: nextDetailId++,
        MaPhieu: maPhieu,
        MaBanSao: copy.MaBanSao,
        NgayHenTra: ngayHenTra,
        SoLanGiaHan: 0,
        NgayTraThucTe: null,
        TinhTrangKhiTra: null,
        TienPhat: 0,
        DaDongPhat: false,
      });
    }

    saveDb(db);
    const enrichedSlip = getSlipsEnriched(db).find((s) => s.MaPhieu === maPhieu);
    res.status(201).json({ slip: enrichedSlip });
  });

  // FR-3.2: Ghi nhận trả sách theo mã bản sao (hỗ trợ trả từng phần, tính phạt BR-05)
  app.post('/api/circulation/return', (req, res) => {
    const {
      MaBanSao,
      TinhTrangKhiTra = 'BINH_THUONG',
      DaDongPhatNgay = false,
    } = req.body as {
      MaBanSao: string;
      TinhTrangKhiTra?: TinhTrangKhiTra;
      DaDongPhatNgay?: boolean;
    };

    if (!MaBanSao?.trim()) {
      res.status(400).json({ error: 'Vui lòng nhập hoặc quét mã bản sao.' });
      return;
    }

    const db = loadDb();
    const copy = db.BanSaoSach.find(
      (b) => b.MaBanSao.toLowerCase() === MaBanSao.trim().toLowerCase()
    );
    if (!copy) {
      res.status(404).json({ error: `Không tìm thấy bản sao "${MaBanSao}".` });
      return;
    }

    const detail = db.ChiTietMuonTra.find(
      (ct) => ct.MaBanSao === copy.MaBanSao && ct.NgayTraThucTe === null
    );
    if (!detail) {
      res.status(400).json({
        error: `Bản sao ${copy.MaBanSao} hiện không nằm trong giao dịch đang mượn nào.`,
      });
      return;
    }

    const title = db.DauSach.find((d) => d.MaDauSach === copy.MaDauSach)!;
    const todayStr = getTodayStr();
    const fineInfo = calculateReturnFine(
      detail.NgayHenTra,
      todayStr,
      TinhTrangKhiTra,
      title.GiaBia
    );

    detail.NgayTraThucTe = new Date().toISOString();
    detail.TinhTrangKhiTra = TinhTrangKhiTra;
    detail.TienPhat = fineInfo.totalFine;
    detail.DaDongPhat = fineInfo.totalFine === 0 ? true : Boolean(DaDongPhatNgay);

    copy.TrangThai = mapReturnConditionToCopyStatus(TinhTrangKhiTra);
    if (TinhTrangKhiTra === 'HU_HONG') {
      copy.TinhTrangVatLy = `Hư hỏng khi trả ngày ${todayStr}`;
    } else if (TinhTrangKhiTra === 'LAM_MAT') {
      copy.TinhTrangVatLy = `Báo mất ngày ${todayStr}`;
    }

    recalculateSlipStatus(db, detail.MaPhieu);
    saveDb(db);

    const updatedSlip = getSlipsEnriched(db).find((s) => s.MaPhieu === detail.MaPhieu);
    res.json({
      returnedItem: enrichLoanItem(detail, db, todayStr),
      fineInfo,
      slip: updatedSlip,
    });
  });

  // FR-3.3: Gia hạn sách (Kiểm tra BR-06)
  app.post('/api/circulation/renew', (req, res) => {
    const { MaChiTiet, SoNgayGiaHan = BUSINESS_RULES.RENEWAL_DAYS } = req.body as {
      MaChiTiet: number;
      SoNgayGiaHan?: number;
    };

    const db = loadDb();
    const todayStr = getTodayStr();
    const detail = db.ChiTietMuonTra.find((ct) => ct.MaChiTiet === Number(MaChiTiet));
    if (!detail) {
      res.status(404).json({ error: 'Không tìm thấy chi tiết lượt mượn.' });
      return;
    }

    const enriched = enrichLoanItem(detail, db, todayStr);
    if (!enriched.CoTheGiaHan) {
      res.status(400).json({ error: enriched.LyDoKhongGiaHan || 'Không đủ điều kiện gia hạn.' });
      return;
    }

    const days = Math.min(14, Math.max(1, Number(SoNgayGiaHan) || BUSINESS_RULES.RENEWAL_DAYS));
    const currentDue = new Date(detail.NgayHenTra + 'T00:00:00');
    currentDue.setDate(currentDue.getDate() + days);
    detail.NgayHenTra = currentDue.toISOString().slice(0, 10);
    detail.SoLanGiaHan += 1;

    saveDb(db);
    res.json({ item: enrichLoanItem(detail, db, todayStr) });
  });

  // FR-3.4: Thanh toán tiền phạt & Xuất biên lai
  app.post('/api/fines/pay', (req, res) => {
    const { MaChiTietList } = req.body as { MaChiTietList: number[] };
    if (!Array.isArray(MaChiTietList) || MaChiTietList.length === 0) {
      res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 khoản phạt cần thanh toán.' });
      return;
    }
    const db = loadDb();
    let totalPaid = 0;
    const paidItems: LoanItemEnriched[] = [];
    const todayStr = getTodayStr();

    for (const id of MaChiTietList) {
      const detail = db.ChiTietMuonTra.find((ct) => ct.MaChiTiet === Number(id));
      if (detail && detail.TienPhat > 0 && !detail.DaDongPhat) {
        detail.DaDongPhat = true;
        totalPaid += detail.TienPhat;
        paidItems.push(enrichLoanItem(detail, db, todayStr));
      }
    }

    saveDb(db);
    res.json({
      receiptId: `BL-${Date.now().toString().slice(-6)}`,
      paidAt: new Date().toISOString(),
      totalPaid,
      paidItems,
    });
  });

  // Reset demo data if user wants a fresh start
  app.post('/api/system/reset', (_req, res) => {
    const db = resetDbToSeed();
    res.json({ success: true, counts: { dauSach: db.DauSach.length } });
  });

  // Raw schema inspector counts
  app.get('/api/system/schema-stats', (_req, res) => {
    const db = loadDb();
    res.json({
      counts: {
        DauSach: db.DauSach.length,
        BanSaoSach: db.BanSaoSach.length,
        DocGia: db.DocGia.length,
        PhieuMuonTra: db.PhieuMuonTra.length,
        ChiTietMuonTra: db.ChiTietMuonTra.length,
      },
      sample: {
        DauSach: db.DauSach.slice(0, 3),
        BanSaoSach: db.BanSaoSach.slice(0, 3),
        DocGia: db.DocGia.slice(0, 3),
        PhieuMuonTra: db.PhieuMuonTra.slice(0, 3),
        ChiTietMuonTra: db.ChiTietMuonTra.slice(0, 3),
      },
    });
  });

  // Vite Dev or Static Prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Library Management Server running at http://localhost:${PORT}`);
  });
}

startServer();
