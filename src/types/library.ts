export type TrangThaiBanSao =
  | 'SAN_SANG'
  | 'DANG_MUON'
  | 'HU_HONG'
  | 'THAT_LAC'
  | 'THANH_LY';

export type LoaiDocGia = 'SINH_VIEN' | 'GIANG_VIEN' | 'KHACH';

export type TrangThaiThe = 'HOAT_DONG' | 'BI_KHOA' | 'HET_HAN';

export type TrangThaiPhieu = 'DANG_MUON' | 'TRA_MOT_PHAN' | 'DA_HOAN_THANH';

export type TinhTrangKhiTra = 'BINH_THUONG' | 'HU_HONG' | 'LAM_MAT';

export interface DauSach {
  MaDauSach: string;
  ISBN: string | null;
  TenSach: string;
  TacGia: string;
  TheLoai: string;
  NhaXuatBan: string | null;
  NamXuatBan: number;
  ViTriKe: string | null;
  GiaBia: number;
  MoTa?: string;
  NgayTao: string;
  DaXoa: boolean;
}

export interface BanSaoSach {
  MaBanSao: string;
  MaDauSach: string;
  NgayNhapKho: string;
  TrangThai: TrangThaiBanSao;
  TinhTrangVatLy: string;
}

export interface DocGia {
  MaDocGia: string;
  HoTen: string;
  NgaySinh: string | null;
  SoDienThoai: string;
  Email: string | null;
  DiaChi?: string;
  LoaiDocGia: LoaiDocGia;
  NgayCapThe: string;
  NgayHetHan: string;
  TrangThaiThe: TrangThaiThe;
}

export interface PhieuMuonTra {
  MaPhieu: string;
  MaDocGia: string;
  NgayMuon: string;
  NguoiLapPhieu: string;
  TrangThaiPhieu: TrangThaiPhieu;
  GhiChu: string | null;
}

export interface ChiTietMuonTra {
  MaChiTiet: number;
  MaPhieu: string;
  MaBanSao: string;
  NgayHenTra: string;
  SoLanGiaHan: number;
  NgayTraThucTe: string | null;
  TinhTrangKhiTra: TinhTrangKhiTra | null;
  TienPhat: number;
  DaDongPhat: boolean;
}

export interface NhacNhoRecord {
  id: string;
  MaDocGia: string;
  HoTen: string;
  Kenh: 'EMAIL' | 'SMS';
  NoiDung: string;
  ThoiGianGui: string;
}

export interface KiemKeRecord {
  id: string;
  NgayKiemKe: string;
  NguoiKiemKe: string;
  TongQuet: number;
  SoKhop: number;
  SoThieu: number;
  SoLechTrangThai: number;
  ChiTietThieu: string[];
}

export interface LibraryDatabase {
  DauSach: DauSach[];
  BanSaoSach: BanSaoSach[];
  DocGia: DocGia[];
  PhieuMuonTra: PhieuMuonTra[];
  ChiTietMuonTra: ChiTietMuonTra[];
  NhacNho: NhacNhoRecord[];
  KiemKe: KiemKeRecord[];
}

export interface DauSachWithStats extends DauSach {
  TongBanSao: number;
  SoBanSanSang: number;
  SoBanDangMuon: number;
  SoBanHuHong: number;
  SoBanThatLac: number;
  LuotMuon: number;
  BanSaoList?: BanSaoSach[];
}

export interface LoanItemEnriched extends ChiTietMuonTra {
  MaDocGia: string;
  HoTenDocGia: string;
  LoaiDocGia: LoaiDocGia;
  SoDienThoai: string;
  Email: string | null;
  NgayMuon: string;
  TrangThaiPhieu: TrangThaiPhieu;
  MaDauSach: string;
  TenSach: string;
  TacGia: string;
  GiaBia: number;
  ViTriKe: string | null;
  SoNgayQuaHan: number;
  PhatDuKienNeuTraHomNay: number;
  CoTheGiaHan: boolean;
  LyDoKhongGiaHan?: string;
}

export interface PhieuMuonEnriched extends PhieuMuonTra {
  HoTenDocGia: string;
  LoaiDocGia: LoaiDocGia;
  ChiTiet: LoanItemEnriched[];
  TongTienPhat: number;
  TienPhatChuaDong: number;
}

export interface PatronEligibility {
  hopLe: boolean;
  lyDoTuChoi: string[];
  dangMuonCount: number;
  hanMucToiDa: number;
  soNgayMuonMacDinh: number;
  soSachQuaHan: number;
  tongPhatChuaDong: number;
  theHetHan: boolean;
}

export interface PatronEnriched extends DocGia {
  eligibility: PatronEligibility;
  lichSuMuon: LoanItemEnriched[];
  tongLuotMuon: number;
}

export interface DashboardReport {
  tongDauSach: number;
  tongBanSao: number;
  banSaoSanSang: number;
  banSaoDangMuon: number;
  banSaoHuHong: number;
  banSaoThatLac: number;
  banSaoThanhLy: number;
  tongDocGia: number;
  docGiaBiKhoa: number;
  phieuDangMo: number;
  luotQuaHan: number;
  luotSapDenHan: number;
  doanhThuPhatDaThu: number;
  tienPhatChuaThu: number;
  topDauSach: Array<{
    MaDauSach: string;
    TenSach: string;
    TacGia: string;
    TheLoai: string;
    LuotMuon: number;
    SoBanSanSang: number;
    TongBanSao: number;
  }>;
  thongKeTheoNhomDocGia: Array<{
    LoaiDocGia: LoaiDocGia;
    Label: string;
    SoDocGia: number;
    LuotMuon: number;
    DangMuon: number;
  }>;
  canhBaoQuaHanVaSapDenHan: LoanItemEnriched[];
  lichSuNhacNho: NhacNhoRecord[];
}

export const BUSINESS_RULES = {
  FINE_PER_DAY: 5000,
  DAMAGE_FINE_RATE: 0.5,
  LOST_FINE_RATE: 1.0,
  MAX_RENEWALS: 2,
  RENEWAL_DAYS: 7,
  LOAN_LIMITS: {
    SINH_VIEN: { maxBooks: 5, loanDays: 14, label: 'Sinh viên' },
    GIANG_VIEN: { maxBooks: 10, loanDays: 30, label: 'Giảng viên' },
    KHACH: { maxBooks: 3, loanDays: 7, label: 'Khách' },
  } as Record<LoaiDocGia, { maxBooks: number; loanDays: number; label: string }>,
};

export const COPY_STATUS_LABELS: Record<TrangThaiBanSao, string> = {
  SAN_SANG: 'Sẵn sàng',
  DANG_MUON: 'Đang mượn',
  HU_HONG: 'Hư hỏng',
  THAT_LAC: 'Thất lạc',
  THANH_LY: 'Thanh lý',
};

export const CARD_STATUS_LABELS: Record<TrangThaiThe, string> = {
  HOAT_DONG: 'Hoạt động',
  BI_KHOA: 'Bị khóa',
  HET_HAN: 'Hết hạn',
};

export const SLIP_STATUS_LABELS: Record<TrangThaiPhieu, string> = {
  DANG_MUON: 'Đang mượn',
  TRA_MOT_PHAN: 'Trả một phần',
  DA_HOAN_THANH: 'Đã hoàn thành',
};

export const RETURN_CONDITION_LABELS: Record<TinhTrangKhiTra, string> = {
  BINH_THUONG: 'Bình thường',
  HU_HONG: 'Hư hỏng',
  LAM_MAT: 'Làm mất',
};

export type SearchMode = 'traditional' | 'fuzzy' | 'semantic';

export interface SearchMatchMeta {
  score: number;
  semanticScore?: number;
  reasons: string[];
}

export interface SearchResultTitle extends DauSachWithStats {
  searchMeta?: SearchMatchMeta;
}

export interface FacetBucket {
  value: string;
  count: number;
}

export interface SearchFacets {
  categories: FacetBucket[];
  shelves: FacetBucket[];
  years: FacetBucket[];
  availability: {
    available: number;
    unavailable: number;
  };
}

export interface SearchResponse {
  mode: SearchMode;
  query: string;
  expandedTerms?: string[];
  titles: SearchResultTitle[];
  facets: SearchFacets;
  totalBeforeFacets: number;
  durationMs: number;
}

export interface RelatedBookRecommendation {
  MaDauSach: string;
  TenSach: string;
  TacGia: string;
  TheLoai: string;
  ViTriKe: string | null;
  SoBanSanSang: number;
  TongBanSao: number;
  relationType: 'CO_BORROWED' | 'SAME_PATRON' | 'SAME_SHELF' | 'SAME_CATEGORY';
  relationLabel: string;
  weight: number;
}
