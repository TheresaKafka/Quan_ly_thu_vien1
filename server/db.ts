import fs from 'fs';
import path from 'path';
import {
  BanSaoSach,
  BUSINESS_RULES,
  ChiTietMuonTra,
  DashboardReport,
  DauSach,
  DauSachWithStats,
  DocGia,
  KiemKeRecord,
  LibraryDatabase,
  LoanItemEnriched,
  LoaiDocGia,
  NhacNhoRecord,
  PatronEligibility,
  PatronEnriched,
  PhieuMuonEnriched,
  PhieuMuonTra,
  TinhTrangKhiTra,
  TrangThaiBanSao,
} from '../src/types/library.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'library-db.json');

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(baseDateStr: string, days: number): string {
  const d = new Date(baseDateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function getTodayStr(): string {
  return formatDate(new Date());
}

export function diffDays(fromDateStr: string, toDateStr: string): number {
  const from = new Date(fromDateStr.slice(0, 10) + 'T00:00:00').getTime();
  const to = new Date(toDateStr.slice(0, 10) + 'T00:00:00').getTime();
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

function createSeedDatabase(): LibraryDatabase {
  const today = getTodayStr();

  const DauSach: DauSach[] = [
    {
      MaDauSach: 'DS-001',
      ISBN: '978-0-13-235088-4',
      TenSach: 'Clean Code — Mã sạch và Con đường trở thành nghệ nhân phần mềm',
      TacGia: 'Robert C. Martin',
      TheLoai: 'Công nghệ thông tin',
      NhaXuatBan: 'NXB Dân Trí',
      NamXuatBan: 2022,
      ViTriKe: 'Kệ A1 - Tầng 2',
      GiaBia: 320000,
      MoTa: 'Cẩm nang chuẩn mực về thiết kế, đặt tên, cấu trúc hàm và tái cấu trúc mã nguồn sạch.',
      NgayTao: addDays(today, -180) + 'T08:30:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-002',
      ISBN: '978-0-201-63361-0',
      TenSach: 'Designing Data-Intensive Applications',
      TacGia: 'Martin Kleppmann',
      TheLoai: 'Công nghệ thông tin',
      NhaXuatBan: "O'Reilly Media",
      NamXuatBan: 2021,
      ViTriKe: 'Kệ A1 - Tầng 3',
      GiaBia: 580000,
      MoTa: 'Kiến trúc hệ thống phân tán, cơ sở dữ liệu, nhân bản và xử lý luồng dữ liệu quy mô lớn.',
      NgayTao: addDays(today, -160) + 'T09:15:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-003',
      ISBN: '978-604-1-19823-4',
      TenSach: 'Giáo trình Cơ sở dữ liệu Quan hệ & Chuẩn hóa 3NF',
      TacGia: 'PGS.TS. Nguyễn Bá Tường',
      TheLoai: 'Công nghệ thông tin',
      NhaXuatBan: 'NXB Đại học Quốc gia',
      NamXuatBan: 2023,
      ViTriKe: 'Kệ A2 - Tầng 1',
      GiaBia: 145000,
      MoTa: 'Lý thuyết mô hình thực thể kết hợp ERD, đại số quan hệ, chuẩn hóa và tối ưu chỉ mục SQL.',
      NgayTao: addDays(today, -140) + 'T10:00:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-004',
      ISBN: '978-604-2-28411-9',
      TenSach: 'Tư duy nhanh và chậm (Thinking, Fast and Slow)',
      TacGia: 'Daniel Kahneman',
      TheLoai: 'Tâm lý - Kinh tế',
      NhaXuatBan: 'NXB Thế Giới',
      NamXuatBan: 2021,
      ViTriKe: 'Kệ B3 - Tầng 2',
      GiaBia: 210000,
      MoTa: 'Phân tích hai hệ thống tư duy của con người và các thiên kiến nhận thức trong ra quyết định.',
      NgayTao: addDays(today, -120) + 'T14:20:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-005',
      ISBN: '978-604-58-9214-2',
      TenSach: 'Kinh tế học vĩ mô căn bản',
      TacGia: 'N. Gregory Mankiw',
      TheLoai: 'Kinh tế',
      NhaXuatBan: 'NXB Hồng Đức',
      NamXuatBan: 2020,
      ViTriKe: 'Kệ B1 - Tầng 1',
      GiaBia: 295000,
      MoTa: 'Nguyên lý cung cầu, lạm phát, chính sách tiền tệ và tăng trưởng kinh tế dài hạn.',
      NgayTao: addDays(today, -110) + 'T11:10:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-006',
      ISBN: '978-604-1-17452-8',
      TenSach: 'Số Đỏ',
      TacGia: 'Vũ Trọng Phụng',
      TheLoai: 'Văn học Việt Nam',
      NhaXuatBan: 'NXB Văn Học',
      NamXuatBan: 2019,
      ViTriKe: 'Kệ C2 - Tầng 1',
      GiaBia: 98000,
      MoTa: 'Tác phẩm tiểu thuyết trào phúng kinh điển của văn học hiện thực phê phán Việt Nam.',
      NgayTao: addDays(today, -95) + 'T08:45:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-007',
      ISBN: '978-604-3-41920-5',
      TenSach: 'Lược sử loài người (Sapiens)',
      TacGia: 'Yuval Noah Harari',
      TheLoai: 'Lịch sử - Khoa học',
      NhaXuatBan: 'NXB Tri Thức',
      NamXuatBan: 2022,
      ViTriKe: 'Kệ D1 - Tầng 2',
      GiaBia: 240000,
      MoTa: 'Hành trình tiến hóa của Homo sapiens từ cách mạng nhận thức đến kỷ nguyên công nghệ sinh học.',
      NgayTao: addDays(today, -80) + 'T15:30:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-008',
      ISBN: '978-604-1-20118-5',
      TenSach: 'Vũ trụ trong vỏ hạt dẻ',
      TacGia: 'Stephen Hawking',
      TheLoai: 'Khoa học tự nhiên',
      NhaXuatBan: 'NXB Trẻ',
      NamXuatBan: 2020,
      ViTriKe: 'Kệ D2 - Tầng 3',
      GiaBia: 165000,
      MoTa: 'Khám phá vật lý lượng tử, hố đen, thuyết tương đối rộng và bản chất của thời gian.',
      NgayTao: addDays(today, -65) + 'T10:25:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-009',
      ISBN: '978-1-491-95035-7',
      TenSach: 'Building Microservices — Kiến trúc hệ thống phân mảnh',
      TacGia: 'Sam Newman',
      TheLoai: 'Công nghệ thông tin',
      NhaXuatBan: "O'Reilly Media",
      NamXuatBan: 2022,
      ViTriKe: 'Kệ A3 - Tầng 2',
      GiaBia: 460000,
      MoTa: 'Thiết kế, triển khai và giám sát hệ thống microservices linh hoạt và ổn định.',
      NgayTao: addDays(today, -45) + 'T09:00:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-010',
      ISBN: '978-604-1-18902-7',
      TenSach: 'Phi lý trí (Predictably Irrational)',
      TacGia: 'Dan Ariely',
      TheLoai: 'Tâm lý - Kinh tế',
      NhaXuatBan: 'NXB Lao Động',
      NamXuatBan: 2021,
      ViTriKe: 'Kệ B3 - Tầng 2',
      GiaBia: 185000,
      MoTa: 'Kinh tế học hành vi lý giải những lực đẩy vô hình chi phối quyết định tiêu dùng và lựa chọn của con người.',
      NgayTao: addDays(today, -40) + 'T10:15:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-011',
      ISBN: '978-604-2-27110-2',
      TenSach: 'Nghệ thuật tư duy rành mạch (The Art of Thinking Clearly)',
      TacGia: 'Rolf Dobelli',
      TheLoai: 'Tâm lý - Kinh tế',
      NhaXuatBan: 'NXB Thế Giới',
      NamXuatBan: 2022,
      ViTriKe: 'Kệ B3 - Tầng 3',
      GiaBia: 175000,
      MoTa: 'Tổng hợp 99 sai lầm nhận thức phổ biến trong kinh tế, đầu tư và cuộc sống hàng ngày.',
      NgayTao: addDays(today, -38) + 'T11:00:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-012',
      ISBN: '978-604-58-8741-4',
      TenSach: 'Kinh tế học vi mô (Microeconomics)',
      TacGia: 'Robert S. Pindyck & Daniel L. Rubinfeld',
      TheLoai: 'Kinh tế',
      NhaXuatBan: 'NXB Kinh tế TP.HCM',
      NamXuatBan: 2022,
      ViTriKe: 'Kệ B1 - Tầng 2',
      GiaBia: 310000,
      MoTa: 'Giáo trình kinh tế học vi mô phân tích hành vi người tiêu dùng, doanh nghiệp, cấu trúc thị trường và cân bằng cạnh tranh.',
      NgayTao: addDays(today, -35) + 'T08:40:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-013',
      ISBN: '978-604-3-38120-5',
      TenSach: 'Quốc gia khởi nghiệp (Start-up Nation)',
      TacGia: 'Dan Senor & Saul Singer',
      TheLoai: 'Kinh tế',
      NhaXuatBan: 'NXB Tri Thức',
      NamXuatBan: 2021,
      ViTriKe: 'Kệ B2 - Tầng 1',
      GiaBia: 195000,
      MoTa: 'Câu chuyện phát triển hệ sinh thái đổi mới sáng tạo và kinh tế công nghệ cao của Israel.',
      NgayTao: addDays(today, -32) + 'T13:20:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-014',
      ISBN: '978-604-1-16230-3',
      TenSach: 'Tắt đèn',
      TacGia: 'Ngô Tất Tố',
      TheLoai: 'Văn học Việt Nam',
      NhaXuatBan: 'NXB Văn Học',
      NamXuatBan: 2020,
      ViTriKe: 'Kệ C2 - Tầng 1',
      GiaBia: 85000,
      MoTa: 'Tiểu thuyết hiện thực xuất sắc phản ánh thân phận người nông dân Việt Nam trước Cách mạng qua hình tượng chị Dậu.',
      NgayTao: addDays(today, -30) + 'T09:10:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-015',
      ISBN: '978-604-2-29845-1',
      TenSach: 'Dế Mèn phiêu lưu ký',
      TacGia: 'Tô Hoài',
      TheLoai: 'Văn học Việt Nam',
      NhaXuatBan: 'NXB Kim Đồng',
      NamXuatBan: 2023,
      ViTriKe: 'Kệ C2 - Tầng 2',
      GiaBia: 110000,
      MoTa: 'Tác phẩm văn học thiếu nhi kinh điển Việt Nam về hành trình trưởng thành và tình bạn của chú Dế Mèn.',
      NgayTao: addDays(today, -28) + 'T10:00:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-016',
      ISBN: '978-604-3-40512-3',
      TenSach: 'Súng, Vi trùng và Thép (Guns, Germs, and Steel)',
      TacGia: 'Jared Diamond',
      TheLoai: 'Lịch sử - Khoa học',
      NhaXuatBan: 'NXB Tri Thức',
      NamXuatBan: 2021,
      ViTriKe: 'Kệ D1 - Tầng 2',
      GiaBia: 260000,
      MoTa: 'Nghiên cứu lịch sử địa lý và sinh thái lý giải vì sao các nền văn minh phát triển với tốc độ khác nhau.',
      NgayTao: addDays(today, -25) + 'T14:00:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-017',
      ISBN: '978-604-2-31044-3',
      TenSach: 'Homo Deus — Lược sử tương lai',
      TacGia: 'Yuval Noah Harari',
      TheLoai: 'Lịch sử - Khoa học',
      NhaXuatBan: 'NXB Thế Giới',
      NamXuatBan: 2022,
      ViTriKe: 'Kệ D1 - Tầng 3',
      GiaBia: 250000,
      MoTa: 'Khảo sát tương lai nhân loại trong kỷ nguyên trí tuệ nhân tạo, thuật toán dữ liệu lớn và công nghệ sinh học.',
      NgayTao: addDays(today, -22) + 'T15:10:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-018',
      ISBN: '978-604-1-19401-4',
      TenSach: 'Lược sử thời gian (A Brief History of Time)',
      TacGia: 'Stephen Hawking',
      TheLoai: 'Khoa học tự nhiên',
      NhaXuatBan: 'NXB Trẻ',
      NamXuatBan: 2021,
      ViTriKe: 'Kệ D2 - Tầng 2',
      GiaBia: 155000,
      MoTa: 'Giải thích đại chúng về vụ nổ lớn Big Bang, lỗ đen, mũi tên thời gian và lý thuyết thống nhất vật lý.',
      NgayTao: addDays(today, -20) + 'T09:30:00',
      DaXoa: false,
    },
    {
      MaDauSach: 'DS-019',
      ISBN: '978-604-2-28910-7',
      TenSach: 'Vũ trụ (Cosmos)',
      TacGia: 'Carl Sagan',
      TheLoai: 'Khoa học tự nhiên',
      NhaXuatBan: 'NXB Thế Giới',
      NamXuatBan: 2022,
      ViTriKe: 'Kệ D2 - Tầng 3',
      GiaBia: 270000,
      MoTa: 'Hành trình khám phá thiên văn học, sự sống ngoài Trái Đất và lịch sử tiến hóa của tri thức khoa học.',
      NgayTao: addDays(today, -18) + 'T11:45:00',
      DaXoa: false,
    },
  ];

  const BanSaoSach: BanSaoSach[] = [
    // DS-001 (4 bản)
    { MaBanSao: 'BS-00101', MaDauSach: 'DS-001', NgayNhapKho: addDays(today, -180), TrangThai: 'DANG_MUON', TinhTrangVatLy: 'Tốt, bìa cứng' },
    { MaBanSao: 'BS-00102', MaDauSach: 'DS-001', NgayNhapKho: addDays(today, -180), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 98%' },
    { MaBanSao: 'BS-00103', MaDauSach: 'DS-001', NgayNhapKho: addDays(today, -120), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    { MaBanSao: 'BS-00104', MaDauSach: 'DS-001', NgayNhapKho: addDays(today, -90), TrangThai: 'HU_HONG', TinhTrangVatLy: 'Bong gáy, cần dán lại' },
    // DS-002 (3 bản)
    { MaBanSao: 'BS-00201', MaDauSach: 'DS-002', NgayNhapKho: addDays(today, -160), TrangThai: 'DANG_MUON', TinhTrangVatLy: 'Tốt' },
    { MaBanSao: 'BS-00202', MaDauSach: 'DS-002', NgayNhapKho: addDays(today, -160), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 95%' },
    { MaBanSao: 'BS-00203', MaDauSach: 'DS-002', NgayNhapKho: addDays(today, -100), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    // DS-003 (4 bản)
    { MaBanSao: 'BS-00301', MaDauSach: 'DS-003', NgayNhapKho: addDays(today, -140), TrangThai: 'DANG_MUON', TinhTrangVatLy: 'Bình thường' },
    { MaBanSao: 'BS-00302', MaDauSach: 'DS-003', NgayNhapKho: addDays(today, -140), TrangThai: 'DANG_MUON', TinhTrangVatLy: 'Sờn mép nhẹ' },
    { MaBanSao: 'BS-00303', MaDauSach: 'DS-003', NgayNhapKho: addDays(today, -140), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 95%' },
    { MaBanSao: 'BS-00304', MaDauSach: 'DS-003', NgayNhapKho: addDays(today, -70), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    // DS-004 (3 bản)
    { MaBanSao: 'BS-00401', MaDauSach: 'DS-004', NgayNhapKho: addDays(today, -120), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 95%' },
    { MaBanSao: 'BS-00402', MaDauSach: 'DS-004', NgayNhapKho: addDays(today, -120), TrangThai: 'DANG_MUON', TinhTrangVatLy: 'Tốt' },
    { MaBanSao: 'BS-00403', MaDauSach: 'DS-004', NgayNhapKho: addDays(today, -80), TrangThai: 'THAT_LAC', TinhTrangVatLy: 'Độc giả làm mất chưa bồi hoàn' },
    // DS-005 (3 bản)
    { MaBanSao: 'BS-00501', MaDauSach: 'DS-005', NgayNhapKho: addDays(today, -110), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Tốt' },
    { MaBanSao: 'BS-00502', MaDauSach: 'DS-005', NgayNhapKho: addDays(today, -110), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Tốt' },
    { MaBanSao: 'BS-00503', MaDauSach: 'DS-005', NgayNhapKho: addDays(today, -110), TrangThai: 'THANH_LY', TinhTrangVatLy: 'Ấn bản cũ đã thanh lý' },
    // DS-006 (3 bản)
    { MaBanSao: 'BS-00601', MaDauSach: 'DS-006', NgayNhapKho: addDays(today, -95), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 90%' },
    { MaBanSao: 'BS-00602', MaDauSach: 'DS-006', NgayNhapKho: addDays(today, -95), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 95%' },
    { MaBanSao: 'BS-00603', MaDauSach: 'DS-006', NgayNhapKho: addDays(today, -60), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    // DS-007 (3 bản)
    { MaBanSao: 'BS-00701', MaDauSach: 'DS-007', NgayNhapKho: addDays(today, -80), TrangThai: 'DANG_MUON', TinhTrangVatLy: 'Tốt' },
    { MaBanSao: 'BS-00702', MaDauSach: 'DS-007', NgayNhapKho: addDays(today, -80), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 98%' },
    { MaBanSao: 'BS-00703', MaDauSach: 'DS-007', NgayNhapKho: addDays(today, -50), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    // DS-008 (2 bản)
    { MaBanSao: 'BS-00801', MaDauSach: 'DS-008', NgayNhapKho: addDays(today, -65), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 95%' },
    { MaBanSao: 'BS-00802', MaDauSach: 'DS-008', NgayNhapKho: addDays(today, -65), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 98%' },
    // DS-009 (3 bản)
    { MaBanSao: 'BS-00901', MaDauSach: 'DS-009', NgayNhapKho: addDays(today, -45), TrangThai: 'DANG_MUON', TinhTrangVatLy: 'Mới 100%' },
    { MaBanSao: 'BS-00902', MaDauSach: 'DS-009', NgayNhapKho: addDays(today, -45), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    { MaBanSao: 'BS-00903', MaDauSach: 'DS-009', NgayNhapKho: addDays(today, -30), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    // DS-010 (2 bản)
    { MaBanSao: 'BS-01001', MaDauSach: 'DS-010', NgayNhapKho: addDays(today, -40), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    { MaBanSao: 'BS-01002', MaDauSach: 'DS-010', NgayNhapKho: addDays(today, -40), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 98%' },
    // DS-011 (2 bản)
    { MaBanSao: 'BS-01101', MaDauSach: 'DS-011', NgayNhapKho: addDays(today, -38), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    { MaBanSao: 'BS-01102', MaDauSach: 'DS-011', NgayNhapKho: addDays(today, -38), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 95%' },
    // DS-012 (2 bản)
    { MaBanSao: 'BS-01201', MaDauSach: 'DS-012', NgayNhapKho: addDays(today, -35), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    { MaBanSao: 'BS-01202', MaDauSach: 'DS-012', NgayNhapKho: addDays(today, -35), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    // DS-013 (2 bản)
    { MaBanSao: 'BS-01301', MaDauSach: 'DS-013', NgayNhapKho: addDays(today, -32), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 98%' },
    { MaBanSao: 'BS-01302', MaDauSach: 'DS-013', NgayNhapKho: addDays(today, -32), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    // DS-014 (2 bản)
    { MaBanSao: 'BS-01401', MaDauSach: 'DS-014', NgayNhapKho: addDays(today, -30), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 95%' },
    { MaBanSao: 'BS-01402', MaDauSach: 'DS-014', NgayNhapKho: addDays(today, -30), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    // DS-015 (3 bản)
    { MaBanSao: 'BS-01501', MaDauSach: 'DS-015', NgayNhapKho: addDays(today, -28), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%, bản bìa cứng' },
    { MaBanSao: 'BS-01502', MaDauSach: 'DS-015', NgayNhapKho: addDays(today, -28), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    { MaBanSao: 'BS-01503', MaDauSach: 'DS-015', NgayNhapKho: addDays(today, -20), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    // DS-016 (2 bản)
    { MaBanSao: 'BS-01601', MaDauSach: 'DS-016', NgayNhapKho: addDays(today, -25), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 98%' },
    { MaBanSao: 'BS-01602', MaDauSach: 'DS-016', NgayNhapKho: addDays(today, -25), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    // DS-017 (2 bản)
    { MaBanSao: 'BS-01701', MaDauSach: 'DS-017', NgayNhapKho: addDays(today, -22), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    { MaBanSao: 'BS-01702', MaDauSach: 'DS-017', NgayNhapKho: addDays(today, -22), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 98%' },
    // DS-018 (2 bản)
    { MaBanSao: 'BS-01801', MaDauSach: 'DS-018', NgayNhapKho: addDays(today, -20), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    { MaBanSao: 'BS-01802', MaDauSach: 'DS-018', NgayNhapKho: addDays(today, -20), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 95%' },
    // DS-019 (2 bản)
    { MaBanSao: 'BS-01901', MaDauSach: 'DS-019', NgayNhapKho: addDays(today, -18), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
    { MaBanSao: 'BS-01902', MaDauSach: 'DS-019', NgayNhapKho: addDays(today, -18), TrangThai: 'SAN_SANG', TinhTrangVatLy: 'Mới 100%' },
  ];

  const DocGia: DocGia[] = [
    {
      MaDocGia: 'DG-2024001',
      HoTen: 'Nguyễn Minh Anh',
      NgaySinh: '2004-05-14',
      SoDienThoai: '0912345678',
      Email: 'minhanh.nguyen@sv.edu.vn',
      DiaChi: 'Ký túc xá Khu A, Thủ Đức',
      LoaiDocGia: 'SINH_VIEN',
      NgayCapThe: addDays(today, -300),
      NgayHetHan: addDays(today, 365),
      TrangThaiThe: 'HOAT_DONG',
    },
    {
      MaDocGia: 'DG-2024002',
      HoTen: 'TS. Trần Quốc Bảo',
      NgaySinh: '1982-11-02',
      SoDienThoai: '0987654321',
      Email: 'bao.tq@gv.edu.vn',
      DiaChi: 'Khoa Công nghệ Thông tin',
      LoaiDocGia: 'GIANG_VIEN',
      NgayCapThe: addDays(today, -400),
      NgayHetHan: addDays(today, 500),
      TrangThaiThe: 'HOAT_DONG',
    },
    {
      MaDocGia: 'DG-2024003',
      HoTen: 'Lê Hoàng Phúc',
      NgaySinh: '2003-08-21',
      SoDienThoai: '0938112233',
      Email: 'phuc.le@sv.edu.vn',
      DiaChi: 'Quận 3, TP.HCM',
      LoaiDocGia: 'SINH_VIEN',
      NgayCapThe: addDays(today, -250),
      NgayHetHan: addDays(today, 180),
      TrangThaiThe: 'HOAT_DONG',
    },
    {
      MaDocGia: 'DG-2024004',
      HoTen: 'Phạm Thảo Vy',
      NgaySinh: '2005-02-19',
      SoDienThoai: '0909445566',
      Email: 'thaovy.pham@sv.edu.vn',
      DiaChi: 'Bình Thạnh, TP.HCM',
      LoaiDocGia: 'SINH_VIEN',
      NgayCapThe: addDays(today, -200),
      NgayHetHan: addDays(today, 200),
      TrangThaiThe: 'HOAT_DONG',
    },
    {
      MaDocGia: 'DG-2024005',
      HoTen: 'Hoàng Văn Đức',
      NgaySinh: '1996-09-10',
      SoDienThoai: '0977889900',
      Email: 'duc.hoang@gmail.com',
      DiaChi: 'Quận 1, TP.HCM',
      LoaiDocGia: 'KHACH',
      NgayCapThe: addDays(today, -150),
      NgayHetHan: addDays(today, 90),
      TrangThaiThe: 'BI_KHOA',
    },
    {
      MaDocGia: 'DG-2024006',
      HoTen: 'Đặng Ngọc Linh',
      NgaySinh: '2004-12-03',
      SoDienThoai: '0944332211',
      Email: 'linh.dang@sv.edu.vn',
      DiaChi: 'Phú Nhuận, TP.HCM',
      LoaiDocGia: 'SINH_VIEN',
      NgayCapThe: addDays(today, -390),
      NgayHetHan: addDays(today, -10),
      TrangThaiThe: 'HET_HAN',
    },
  ];

  const PhieuMuonTra: PhieuMuonTra[] = [
    {
      MaPhieu: `PM-${today.replace(/-/g, '')}-0001`,
      MaDocGia: 'DG-2024001',
      NgayMuon: addDays(today, -22) + 'T09:15:00',
      NguoiLapPhieu: 'Thủ thư Lan Hương',
      TrangThaiPhieu: 'TRA_MOT_PHAN',
      GhiChu: 'Mượn tài liệu đồ án chuyên ngành',
    },
    {
      MaPhieu: `PM-${today.replace(/-/g, '')}-0002`,
      MaDocGia: 'DG-2024002',
      NgayMuon: addDays(today, -10) + 'T14:00:00',
      NguoiLapPhieu: 'Thủ thư Lan Hương',
      TrangThaiPhieu: 'DANG_MUON',
      GhiChu: 'Tài liệu tham khảo giảng dạy học kỳ 1',
    },
    {
      MaPhieu: `PM-${today.replace(/-/g, '')}-0003`,
      MaDocGia: 'DG-2024003',
      NgayMuon: addDays(today, -12) + 'T10:30:00',
      NguoiLapPhieu: 'Thủ thư Minh Tuấn',
      TrangThaiPhieu: 'DANG_MUON',
      GhiChu: null,
    },
    {
      MaPhieu: `PM-${today.replace(/-/g, '')}-0004`,
      MaDocGia: 'DG-2024004',
      NgayMuon: addDays(today, -19) + 'T15:45:00',
      NguoiLapPhieu: 'Thủ thư Minh Tuấn',
      TrangThaiPhieu: 'DA_HOAN_THANH',
      GhiChu: null,
    },
    {
      MaPhieu: `PM-${today.replace(/-/g, '')}-0005`,
      MaDocGia: 'DG-2024005',
      NgayMuon: addDays(today, -28) + 'T11:20:00',
      NguoiLapPhieu: 'Thủ thư Lan Hương',
      TrangThaiPhieu: 'DA_HOAN_THANH',
      GhiChu: 'Làm mất sách BS-00403, chờ đóng đền bù',
    },
  ];

  const ChiTietMuonTra: ChiTietMuonTra[] = [
    // PM-0001: DG-2024001 mượn 2 cuốn, đã trả 1 cuốn đúng hạn, 1 cuốn ĐANG QUÁ HẠN 8 ngày
    {
      MaChiTiet: 1,
      MaPhieu: PhieuMuonTra[0].MaPhieu,
      MaBanSao: 'BS-00101',
      NgayHenTra: addDays(today, -8),
      SoLanGiaHan: 0,
      NgayTraThucTe: null,
      TinhTrangKhiTra: null,
      TienPhat: 0,
      DaDongPhat: false,
    },
    {
      MaChiTiet: 2,
      MaPhieu: PhieuMuonTra[0].MaPhieu,
      MaBanSao: 'BS-00303',
      NgayHenTra: addDays(today, -8),
      SoLanGiaHan: 0,
      NgayTraThucTe: addDays(today, -10) + 'T16:10:00',
      TinhTrangKhiTra: 'BINH_THUONG',
      TienPhat: 0,
      DaDongPhat: false,
    },
    // PM-0002: DG-2024002 (Giảng viên) đang mượn 3 cuốn, chưa đến hạn
    {
      MaChiTiet: 3,
      MaPhieu: PhieuMuonTra[1].MaPhieu,
      MaBanSao: 'BS-00201',
      NgayHenTra: addDays(today, 20),
      SoLanGiaHan: 0,
      NgayTraThucTe: null,
      TinhTrangKhiTra: null,
      TienPhat: 0,
      DaDongPhat: false,
    },
    {
      MaChiTiet: 4,
      MaPhieu: PhieuMuonTra[1].MaPhieu,
      MaBanSao: 'BS-00301',
      NgayHenTra: addDays(today, 20),
      SoLanGiaHan: 1,
      NgayTraThucTe: null,
      TinhTrangKhiTra: null,
      TienPhat: 0,
      DaDongPhat: false,
    },
    {
      MaChiTiet: 5,
      MaPhieu: PhieuMuonTra[1].MaPhieu,
      MaBanSao: 'BS-00901',
      NgayHenTra: addDays(today, 2), // Sắp đến hạn (2 ngày nữa)
      SoLanGiaHan: 0,
      NgayTraThucTe: null,
      TinhTrangKhiTra: null,
      TienPhat: 0,
      DaDongPhat: false,
    },
    // PM-0003: DG-2024003 đang mượn 3 cuốn, 1 cuốn sắp đến hạn (1 ngày nữa)
    {
      MaChiTiet: 6,
      MaPhieu: PhieuMuonTra[2].MaPhieu,
      MaBanSao: 'BS-00302',
      NgayHenTra: addDays(today, 2),
      SoLanGiaHan: 0,
      NgayTraThucTe: null,
      TinhTrangKhiTra: null,
      TienPhat: 0,
      DaDongPhat: false,
    },
    {
      MaChiTiet: 7,
      MaPhieu: PhieuMuonTra[2].MaPhieu,
      MaBanSao: 'BS-00402',
      NgayHenTra: addDays(today, 1),
      SoLanGiaHan: 1,
      NgayTraThucTe: null,
      TinhTrangKhiTra: null,
      TienPhat: 0,
      DaDongPhat: false,
    },
    {
      MaChiTiet: 8,
      MaPhieu: PhieuMuonTra[2].MaPhieu,
      MaBanSao: 'BS-00701',
      NgayHenTra: addDays(today, 5),
      SoLanGiaHan: 0,
      NgayTraThucTe: null,
      TinhTrangKhiTra: null,
      TienPhat: 0,
      DaDongPhat: false,
    },
    // PM-0004: DG-2024004 đã hoàn thành trả trễ 2 ngày và đã đóng phạt
    {
      MaChiTiet: 9,
      MaPhieu: PhieuMuonTra[3].MaPhieu,
      MaBanSao: 'BS-00601',
      NgayHenTra: addDays(today, -5),
      SoLanGiaHan: 0,
      NgayTraThucTe: addDays(today, -3) + 'T14:20:00',
      TinhTrangKhiTra: 'BINH_THUONG',
      TienPhat: 10000,
      DaDongPhat: true,
    },
    // PM-0005: DG-2024005 làm mất sách BS-00403, chưa đóng phạt
    {
      MaChiTiet: 10,
      MaPhieu: PhieuMuonTra[4].MaPhieu,
      MaBanSao: 'BS-00403',
      NgayHenTra: addDays(today, -21),
      SoLanGiaHan: 0,
      NgayTraThucTe: addDays(today, -15) + 'T10:00:00',
      TinhTrangKhiTra: 'LAM_MAT',
      TienPhat: 210000,
      DaDongPhat: false,
    },
  ];

  const NhacNho: NhacNhoRecord[] = [
    {
      id: 'NN-001',
      MaDocGia: 'DG-2024001',
      HoTen: 'Nguyễn Minh Anh',
      Kenh: 'EMAIL',
      NoiDung: 'Nhắc trả sách BS-00101 (Clean Code) đã quá hạn trả.',
      ThoiGianGui: addDays(today, -2) + 'T08:00:00',
    },
  ];

  const KiemKe: KiemKeRecord[] = [];

  return {
    DauSach,
    BanSaoSach,
    DocGia,
    PhieuMuonTra,
    ChiTietMuonTra,
    NhacNho,
    KiemKe,
  };
}

export function loadDb(): LibraryDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedDatabase();
    saveDb(seed);
    return seed;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw) as LibraryDatabase;
}

export function saveDb(db: LibraryDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = DB_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

export function resetDbToSeed(): LibraryDatabase {
  const seed = createSeedDatabase();
  saveDb(seed);
  return seed;
}

export function enrichLoanItem(
  ct: ChiTietMuonTra,
  db: LibraryDatabase,
  todayStr: string
): LoanItemEnriched {
  const phieu = db.PhieuMuonTra.find((p) => p.MaPhieu === ct.MaPhieu)!;
  const docGia = db.DocGia.find((d) => d.MaDocGia === phieu.MaDocGia)!;
  const banSao = db.BanSaoSach.find((b) => b.MaBanSao === ct.MaBanSao)!;
  const dauSach = db.DauSach.find((ds) => ds.MaDauSach === banSao.MaDauSach)!;

  const isReturned = ct.NgayTraThucTe !== null;
  const compareDate = isReturned ? ct.NgayTraThucTe!.slice(0, 10) : todayStr;
  const overdueDays = Math.max(0, diffDays(ct.NgayHenTra, compareDate));
  const expectedFine = isReturned
    ? ct.TienPhat
    : overdueDays * BUSINESS_RULES.FINE_PER_DAY;

  let coTheGiaHan = true;
  let lyDoKhongGiaHan: string | undefined;

  if (isReturned) {
    coTheGiaHan = false;
    lyDoKhongGiaHan = 'Sách đã được trả';
  } else if (docGia.TrangThaiThe !== 'HOAT_DONG' || docGia.NgayHetHan < todayStr) {
    coTheGiaHan = false;
    lyDoKhongGiaHan = 'Thẻ độc giả bị khóa hoặc đã hết hạn (BR-01)';
  } else if (overdueDays > 0) {
    coTheGiaHan = false;
    lyDoKhongGiaHan = `Sách đã quá hạn ${overdueDays} ngày (BR-06)`;
  } else if (ct.SoLanGiaHan >= BUSINESS_RULES.MAX_RENEWALS) {
    coTheGiaHan = false;
    lyDoKhongGiaHan = `Đã đạt tối đa ${BUSINESS_RULES.MAX_RENEWALS} lần gia hạn (BR-06)`;
  }

  return {
    ...ct,
    MaDocGia: docGia.MaDocGia,
    HoTenDocGia: docGia.HoTen,
    LoaiDocGia: docGia.LoaiDocGia,
    SoDienThoai: docGia.SoDienThoai,
    Email: docGia.Email,
    NgayMuon: phieu.NgayMuon,
    TrangThaiPhieu: phieu.TrangThaiPhieu,
    MaDauSach: dauSach.MaDauSach,
    TenSach: dauSach.TenSach,
    TacGia: dauSach.TacGia,
    GiaBia: dauSach.GiaBia,
    ViTriKe: dauSach.ViTriKe,
    SoNgayQuaHan: overdueDays,
    PhatDuKienNeuTraHomNay: expectedFine,
    CoTheGiaHan: coTheGiaHan,
    LyDoKhongGiaHan: lyDoKhongGiaHan,
  };
}

export function evaluatePatronEligibility(
  docGia: DocGia,
  db: LibraryDatabase,
  todayStr: string
): PatronEligibility {
  const rule = BUSINESS_RULES.LOAN_LIMITS[docGia.LoaiDocGia];
  const patronLoans = db.PhieuMuonTra.filter(
    (p) => p.MaDocGia === docGia.MaDocGia
  ).map((p) => p.MaPhieu);

  const patronItems = db.ChiTietMuonTra.filter((ct) =>
    patronLoans.includes(ct.MaPhieu)
  );

  const activeItems = patronItems.filter((ct) => ct.NgayTraThucTe === null);
  const overdueItems = activeItems.filter((ct) => ct.NgayHenTra < todayStr);
  const unpaidFine = patronItems
    .filter((ct) => ct.TienPhat > 0 && !ct.DaDongPhat)
    .reduce((sum, ct) => sum + ct.TienPhat, 0);

  const theHetHan = docGia.NgayHetHan < todayStr || docGia.TrangThaiThe === 'HET_HAN';
  const lyDoTuChoi: string[] = [];

  if (docGia.TrangThaiThe === 'BI_KHOA') {
    lyDoTuChoi.push('BR-01: Thẻ độc giả hiện đang bị khóa.');
  }
  if (theHetHan) {
    lyDoTuChoi.push(`BR-01: Thẻ độc giả đã hết hạn từ ngày ${docGia.NgayHetHan}.`);
  }
  if (overdueItems.length > 0) {
    lyDoTuChoi.push(
      `BR-02: Độc giả đang giữ ${overdueItems.length} cuốn sách quá hạn trả.`
    );
  }
  if (unpaidFine > 0) {
    lyDoTuChoi.push(
      `BR-02: Độc giả còn nợ ${unpaidFine.toLocaleString('vi-VN')} đ tiền phạt chưa thanh toán.`
    );
  }
  if (activeItems.length >= rule.maxBooks) {
    lyDoTuChoi.push(
      `BR-03: Đã đạt hạn mức mượn tối đa (${activeItems.length}/${rule.maxBooks} cuốn).`
    );
  }

  return {
    hopLe: lyDoTuChoi.length === 0,
    lyDoTuChoi,
    dangMuonCount: activeItems.length,
    hanMucToiDa: rule.maxBooks,
    soNgayMuonMacDinh: rule.loanDays,
    soSachQuaHan: overdueItems.length,
    tongPhatChuaDong: unpaidFine,
    theHetHan,
  };
}

export function getTitlesWithStats(db: LibraryDatabase, includeCopies = false): DauSachWithStats[] {
  const copyByTitle = new Map<string, BanSaoSach[]>();
  for (const copy of db.BanSaoSach) {
    const arr = copyByTitle.get(copy.MaDauSach) || [];
    arr.push(copy);
    copyByTitle.set(copy.MaDauSach, arr);
  }

  const borrowCountByCopy = new Map<string, number>();
  for (const ct of db.ChiTietMuonTra) {
    borrowCountByCopy.set(
      ct.MaBanSao,
      (borrowCountByCopy.get(ct.MaBanSao) || 0) + 1
    );
  }

  return db.DauSach.filter((ds) => !ds.DaXoa).map((ds) => {
    const copies = copyByTitle.get(ds.MaDauSach) || [];
    let sanSang = 0;
    let dangMuon = 0;
    let huHong = 0;
    let thatLac = 0;
    let luotMuon = 0;

    for (const c of copies) {
      if (c.TrangThai === 'SAN_SANG') sanSang++;
      else if (c.TrangThai === 'DANG_MUON') dangMuon++;
      else if (c.TrangThai === 'HU_HONG') huHong++;
      else if (c.TrangThai === 'THAT_LAC') thatLac++;
      luotMuon += borrowCountByCopy.get(c.MaBanSao) || 0;
    }

    return {
      ...ds,
      TongBanSao: copies.length,
      SoBanSanSang: sanSang,
      SoBanDangMuon: dangMuon,
      SoBanHuHong: huHong,
      SoBanThatLac: thatLac,
      LuotMuon: luotMuon,
      ...(includeCopies ? { BanSaoList: copies } : {}),
    };
  });
}

export function getPatronsEnriched(db: LibraryDatabase): PatronEnriched[] {
  const todayStr = getTodayStr();
  return db.DocGia.map((dg) => {
    const eligibility = evaluatePatronEligibility(dg, db, todayStr);
    const slipIds = db.PhieuMuonTra.filter((p) => p.MaDocGia === dg.MaDocGia).map(
      (p) => p.MaPhieu
    );
    const lichSuMuon = db.ChiTietMuonTra.filter((ct) =>
      slipIds.includes(ct.MaPhieu)
    )
      .map((ct) => enrichLoanItem(ct, db, todayStr))
      .sort((a, b) => b.MaChiTiet - a.MaChiTiet);

    return {
      ...dg,
      eligibility,
      lichSuMuon,
      tongLuotMuon: lichSuMuon.length,
    };
  });
}

export function getSlipsEnriched(db: LibraryDatabase): PhieuMuonEnriched[] {
  const todayStr = getTodayStr();
  return db.PhieuMuonTra.map((p) => {
    const dg = db.DocGia.find((d) => d.MaDocGia === p.MaDocGia)!;
    const items = db.ChiTietMuonTra.filter((ct) => ct.MaPhieu === p.MaPhieu).map(
      (ct) => enrichLoanItem(ct, db, todayStr)
    );
    const tongTienPhat = items.reduce((s, i) => s + i.TienPhat, 0);
    const tienPhatChuaDong = items
      .filter((i) => !i.DaDongPhat)
      .reduce((s, i) => s + i.TienPhat, 0);

    return {
      ...p,
      HoTenDocGia: dg.HoTen,
      LoaiDocGia: dg.LoaiDocGia,
      ChiTiet: items,
      TongTienPhat: tongTienPhat,
      TienPhatChuaDong: tienPhatChuaDong,
    };
  }).sort((a, b) => b.NgayMuon.localeCompare(a.NgayMuon));
}

export function buildDashboardReport(db: LibraryDatabase): DashboardReport {
  const todayStr = getTodayStr();
  const titles = getTitlesWithStats(db, false);
  const activeTitles = db.DauSach.filter((d) => !d.DaXoa);

  const banSaoSanSang = db.BanSaoSach.filter((b) => b.TrangThai === 'SAN_SANG').length;
  const banSaoDangMuon = db.BanSaoSach.filter((b) => b.TrangThai === 'DANG_MUON').length;
  const banSaoHuHong = db.BanSaoSach.filter((b) => b.TrangThai === 'HU_HONG').length;
  const banSaoThatLac = db.BanSaoSach.filter((b) => b.TrangThai === 'THAT_LAC').length;
  const banSaoThanhLy = db.BanSaoSach.filter((b) => b.TrangThai === 'THANH_LY').length;

  const enrichedItems = db.ChiTietMuonTra.map((ct) =>
    enrichLoanItem(ct, db, todayStr)
  );
  const activeLoans = enrichedItems.filter((i) => i.NgayTraThucTe === null);

  const canhBaoQuaHanVaSapDenHan = activeLoans
    .filter((item) => {
      const daysUntilDue = diffDays(todayStr, item.NgayHenTra);
      return daysUntilDue <= 3; // quá hạn (âm) hoặc còn <= 3 ngày
    })
    .sort((a, b) => a.NgayHenTra.localeCompare(b.NgayHenTra));

  const luotQuaHan = activeLoans.filter((i) => i.SoNgayQuaHan > 0).length;
  const luotSapDenHan = activeLoans.filter(
    (i) => i.SoNgayQuaHan === 0 && diffDays(todayStr, i.NgayHenTra) <= 3
  ).length;

  const doanhThuPhatDaThu = db.ChiTietMuonTra.filter((c) => c.DaDongPhat).reduce(
    (s, c) => s + c.TienPhat,
    0
  );
  const tienPhatChuaThu = db.ChiTietMuonTra.filter(
    (c) => c.TienPhat > 0 && !c.DaDongPhat
  ).reduce((s, c) => s + c.TienPhat, 0);

  const topDauSach = [...titles]
    .sort((a, b) => b.LuotMuon - a.LuotMuon)
    .slice(0, 6)
    .map((t) => ({
      MaDauSach: t.MaDauSach,
      TenSach: t.TenSach,
      TacGia: t.TacGia,
      TheLoai: t.TheLoai,
      LuotMuon: t.LuotMuon,
      SoBanSanSang: t.SoBanSanSang,
      TongBanSao: t.TongBanSao,
    }));

  const groups: LoaiDocGia[] = ['SINH_VIEN', 'GIANG_VIEN', 'KHACH'];
  const thongKeTheoNhomDocGia = groups.map((loai) => {
    const patronsInGroup = db.DocGia.filter((d) => d.LoaiDocGia === loai);
    const patronIds = new Set(patronsInGroup.map((p) => p.MaDocGia));
    const groupLoans = enrichedItems.filter((i) => patronIds.has(i.MaDocGia));
    return {
      LoaiDocGia: loai,
      Label: BUSINESS_RULES.LOAN_LIMITS[loai].label,
      SoDocGia: patronsInGroup.length,
      LuotMuon: groupLoans.length,
      DangMuon: groupLoans.filter((i) => i.NgayTraThucTe === null).length,
    };
  });

  return {
    tongDauSach: activeTitles.length,
    tongBanSao: db.BanSaoSach.length,
    banSaoSanSang,
    banSaoDangMuon,
    banSaoHuHong,
    banSaoThatLac,
    banSaoThanhLy,
    tongDocGia: db.DocGia.length,
    docGiaBiKhoa: db.DocGia.filter((d) => d.TrangThaiThe === 'BI_KHOA').length,
    phieuDangMo: db.PhieuMuonTra.filter((p) => p.TrangThaiPhieu !== 'DA_HOAN_THANH').length,
    luotQuaHan,
    luotSapDenHan,
    doanhThuPhatDaThu,
    tienPhatChuaThu,
    topDauSach,
    thongKeTheoNhomDocGia,
    canhBaoQuaHanVaSapDenHan,
    lichSuNhacNho: [...db.NhacNho].reverse(),
  };
}

export function generateNextCopyCode(db: LibraryDatabase, maDauSach: string): string {
  const numPart = maDauSach.replace(/\D/g, '').padStart(3, '0');
  const existing = db.BanSaoSach.filter((b) => b.MaDauSach === maDauSach);
  let seq = existing.length + 1;
  let candidate = `BS-${numPart}${String(seq).padStart(2, '0')}`;
  const existingCodes = new Set(db.BanSaoSach.map((b) => b.MaBanSao));
  while (existingCodes.has(candidate)) {
    seq++;
    candidate = `BS-${numPart}${String(seq).padStart(2, '0')}`;
  }
  return candidate;
}

export function recalculateSlipStatus(
  db: LibraryDatabase,
  maPhieu: string
): void {
  const slip = db.PhieuMuonTra.find((p) => p.MaPhieu === maPhieu);
  if (!slip) return;
  const items = db.ChiTietMuonTra.filter((ct) => ct.MaPhieu === maPhieu);
  const returnedCount = items.filter((ct) => ct.NgayTraThucTe !== null).length;
  if (returnedCount === 0) {
    slip.TrangThaiPhieu = 'DANG_MUON';
  } else if (returnedCount < items.length) {
    slip.TrangThaiPhieu = 'TRA_MOT_PHAN';
  } else {
    slip.TrangThaiPhieu = 'DA_HOAN_THANH';
  }
}

export function calculateReturnFine(
  ngayHenTra: string,
  ngayTraStr: string,
  tinhTrang: TinhTrangKhiTra,
  giaBia: number
): { overdueDays: number; overdueFine: number; conditionFine: number; totalFine: number } {
  const overdueDays = Math.max(0, diffDays(ngayHenTra, ngayTraStr));
  const overdueFine = overdueDays * BUSINESS_RULES.FINE_PER_DAY;
  let conditionFine = 0;
  if (tinhTrang === 'HU_HONG') {
    conditionFine = Math.round(giaBia * BUSINESS_RULES.DAMAGE_FINE_RATE);
  } else if (tinhTrang === 'LAM_MAT') {
    conditionFine = Math.round(giaBia * BUSINESS_RULES.LOST_FINE_RATE);
  }
  return {
    overdueDays,
    overdueFine,
    conditionFine,
    totalFine: overdueFine + conditionFine,
  };
}

export function mapReturnConditionToCopyStatus(
  tinhTrang: TinhTrangKhiTra
): TrangThaiBanSao {
  if (tinhTrang === 'BINH_THUONG') return 'SAN_SANG';
  if (tinhTrang === 'HU_HONG') return 'HU_HONG';
  return 'THAT_LAC';
}
