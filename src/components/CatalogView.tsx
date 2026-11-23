import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Loader2,
  MapPin,
  Network,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  COPY_STATUS_LABELS,
  DauSachWithStats,
  KiemKeRecord,
  RelatedBookRecommendation,
  SearchFacets,
  SearchMode,
  SearchResponse,
  SearchResultTitle,
  TrangThaiBanSao,
} from '../types/library';
import { formatCurrency, formatDateTimeVi, formatDateVi } from '../utils/format';
import { BarcodeSvg } from './BarcodeSvg';
import { CopyStatusText } from './StatusText';

interface CatalogViewProps {
  titles: DauSachWithStats[];
  categories: string[];
  years: number[];
  audits: KiemKeRecord[];
  onCreateTitle: (payload: {
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
  }) => Promise<void>;
  onUpdateTitle: (
    maDauSach: string,
    payload: Partial<DauSachWithStats>
  ) => Promise<void>;
  onDeleteTitle: (maDauSach: string) => Promise<void>;
  onAddCopies: (
    maDauSach: string,
    soLuong: number,
    tinhTrangVatLy: string
  ) => Promise<void>;
  onUpdateCopy: (
    maBanSao: string,
    payload: { TrangThai?: TrangThaiBanSao; TinhTrangVatLy?: string }
  ) => Promise<void>;
  onRunAudit: (payload: {
    scannedCodes: string[];
    nguoiKiemKe: string;
    markMissingAsLost: boolean;
  }) => Promise<{
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
  }>;
}

const SAMPLE_QUERIES: Record<SearchMode, Array<{ label: string; q: string }>> = {
  traditional: [
    { label: 'Clean Code', q: 'Clean Code' },
    { label: 'Vũ Trọng Phụng', q: 'Vũ Trọng Phụng' },
    { label: 'BS-00102', q: 'BS-00102' },
  ],
  fuzzy: [
    { label: 'giao trinh csdl (không dấu + viết tắt)', q: 'giao trinh csdl' },
    { label: 'Kahnemann (sai chính tả)', q: 'Kahnemann' },
    { label: 'Microservis (gõ sai)', q: 'Microservis' },
  ],
  semantic: [
    { label: 'kiến trúc hệ thống chịu tải lớn', q: 'tài liệu thiết kế hệ thống chịu tải lớn' },
    { label: 'tâm lý ra quyết định', q: 'sách phân tích tâm lý và sai lầm khi ra quyết định' },
    { label: 'tiểu thuyết trào phúng Việt Nam', q: 'tiểu thuyết châm biếm xã hội Việt Nam' },
  ],
};

export const CatalogView: React.FC<CatalogViewProps> = ({
  titles,
  categories,
  audits,
  onCreateTitle,
  onUpdateTitle,
  onDeleteTitle,
  onAddCopies,
  onUpdateCopy,
  onRunAudit,
}) => {
  const [subView, setSubView] = useState<'opac' | 'audit'>('opac');

  const [searchMode, setSearchMode] = useState<SearchMode>('traditional');
  const [query, setQuery] = useState('');
  const [submittedSemanticQuery, setSubmittedSemanticQuery] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [shelfFilter, setShelfFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [searchResults, setSearchResults] = useState<SearchResultTitle[]>(titles);
  const [facets, setFacets] = useState<SearchFacets | null>(null);
  const [expandedTerms, setExpandedTerms] = useState<string[]>([]);
  const [searchDurationMs, setSearchDurationMs] = useState<number | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Slide-over Inspector Drawer for Copies + Related Discovery
  const [selectedTitleId, setSelectedTitleId] = useState<string | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<RelatedBookRecommendation[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [addCopyCount, setAddCopyCount] = useState(1);
  const [addCopyCondition, setAddCopyCondition] = useState('Mới 100%');
  const [copyActionLoading, setCopyActionLoading] = useState(false);

  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<DauSachWithStats | null>(null);
  const [formState, setFormState] = useState({
    ISBN: '',
    TenSach: '',
    TacGia: '',
    TheLoai: 'Công nghệ thông tin',
    NhaXuatBan: '',
    NamXuatBan: 2024,
    ViTriKe: '',
    GiaBia: 150000,
    MoTa: '',
    SoLuongBanSao: 2,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DauSachWithStats | null>(null);

  const [auditInput, setAuditInput] = useState('');
  const [auditInspector, setAuditInspector] = useState('Thủ thư Lan Hương');
  const [markMissingAsLost, setMarkMissingAsLost] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<{
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
  } | null>(null);

  const runSearch = useCallback(
    async (
      activeQuery: string,
      mode: SearchMode,
      cat: string,
      shelf: string,
      yr: string,
      availOnly: boolean
    ) => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams({
          q: activeQuery,
          mode,
          theLoai: cat,
          viTriKe: shelf,
          nam: yr,
          chiConSach: String(availOnly),
        });
        const res = await fetch(`/api/titles/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Không thể thực hiện tìm kiếm.');
        }
        const typed = data as SearchResponse;
        setSearchResults(typed.titles);
        setFacets(typed.facets);
        setExpandedTerms(typed.expandedTerms || []);
        setSearchDurationMs(typed.durationMs);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Lỗi tìm kiếm.');
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const activeQ = searchMode === 'semantic' ? submittedSemanticQuery : query;
    const timer = setTimeout(() => {
      runSearch(
        activeQ,
        searchMode,
        categoryFilter,
        shelfFilter,
        yearFilter,
        onlyAvailable
      );
    }, searchMode === 'semantic' ? 0 : 150);
    return () => clearTimeout(timer);
  }, [
    query,
    submittedSemanticQuery,
    searchMode,
    categoryFilter,
    shelfFilter,
    yearFilter,
    onlyAvailable,
    titles,
    runSearch,
  ]);

  useEffect(() => {
    if (!selectedTitleId) {
      setRelatedBooks([]);
      return;
    }
    setRelatedLoading(true);
    fetch(`/api/titles/${selectedTitleId}/related`)
      .then((r) => r.json())
      .then((d) => setRelatedBooks(d.recommendations || []))
      .catch(() => setRelatedBooks([]))
      .finally(() => setRelatedLoading(false));
  }, [selectedTitleId, titles]);

  const selectedTitle = useMemo(
    () =>
      searchResults.find((t) => t.MaDauSach === selectedTitleId) ||
      titles.find((t) => t.MaDauSach === selectedTitleId) ||
      null,
    [searchResults, titles, selectedTitleId]
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchMode === 'semantic') {
      setSubmittedSemanticQuery(query);
    } else {
      runSearch(query, searchMode, categoryFilter, shelfFilter, yearFilter, onlyAvailable);
    }
  };

  const handleApplySampleQuery = (sampleQ: string) => {
    setQuery(sampleQ);
    if (searchMode === 'semantic') {
      setSubmittedSemanticQuery(sampleQ);
    }
  };

  const handleResetFacets = () => {
    setCategoryFilter('ALL');
    setShelfFilter('ALL');
    setYearFilter('ALL');
    setOnlyAvailable(false);
  };

  const openCreateModal = () => {
    setEditingTitle(null);
    setFormState({
      ISBN: '',
      TenSach: '',
      TacGia: '',
      TheLoai: categories[0] || 'Công nghệ thông tin',
      NhaXuatBan: '',
      NamXuatBan: new Date().getFullYear(),
      ViTriKe: 'Kệ A1 - Tầng 1',
      GiaBia: 180000,
      MoTa: '',
      SoLuongBanSao: 2,
    });
    setFormError(null);
    setTitleModalOpen(true);
  };

  const openEditModal = (t: DauSachWithStats) => {
    setEditingTitle(t);
    setFormState({
      ISBN: t.ISBN || '',
      TenSach: t.TenSach,
      TacGia: t.TacGia,
      TheLoai: t.TheLoai,
      NhaXuatBan: t.NhaXuatBan || '',
      NamXuatBan: t.NamXuatBan,
      ViTriKe: t.ViTriKe || '',
      GiaBia: t.GiaBia,
      MoTa: t.MoTa || '',
      SoLuongBanSao: 0,
    });
    setFormError(null);
    setTitleModalOpen(true);
  };

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);
    try {
      if (editingTitle) {
        await onUpdateTitle(editingTitle.MaDauSach, {
          ISBN: formState.ISBN || null,
          TenSach: formState.TenSach,
          TacGia: formState.TacGia,
          TheLoai: formState.TheLoai,
          NhaXuatBan: formState.NhaXuatBan || null,
          NamXuatBan: Number(formState.NamXuatBan),
          ViTriKe: formState.ViTriKe || null,
          GiaBia: Number(formState.GiaBia),
          MoTa: formState.MoTa,
        });
      } else {
        await onCreateTitle({
          ...formState,
          NamXuatBan: Number(formState.NamXuatBan),
          GiaBia: Number(formState.GiaBia),
          SoLuongBanSao: Number(formState.SoLuongBanSao),
        });
      }
      setTitleModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không thể lưu đầu sách.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleAddCopiesSubmit = async () => {
    if (!selectedTitle) return;
    setCopyActionLoading(true);
    try {
      await onAddCopies(selectedTitle.MaDauSach, addCopyCount, addCopyCondition);
      setAddCopyCount(1);
    } finally {
      setCopyActionLoading(false);
    }
  };

  const handlePrefillExpectedBarcodes = (omitCount = 0) => {
    const expected: string[] = [];
    for (const t of titles) {
      for (const c of t.BanSaoList || []) {
        if (c.TrangThai === 'SAN_SANG') {
          expected.push(c.MaBanSao);
        }
      }
    }
    const sample =
      omitCount > 0 ? expected.slice(0, Math.max(0, expected.length - omitCount)) : expected;
    setAuditInput(sample.join('\n'));
  };

  const handleRunAuditSubmit = async () => {
    setAuditLoading(true);
    try {
      const codes = auditInput
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await onRunAudit({
        scannedCodes: codes,
        nguoiKiemKe: auditInspector,
        markMissingAsLost,
      });
      setAuditResult(res);
    } finally {
      setAuditLoading(false);
    }
  };

  const hasActiveFacets =
    categoryFilter !== 'ALL' ||
    shelfFilter !== 'ALL' ||
    yearFilter !== 'ALL' ||
    onlyAvailable;

  return (
    <div className="space-y-5">
      {/* Sub-navigation + Primary Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center p-1 bg-[#121826] rounded-lg border border-slate-800">
          <button
            onClick={() => setSubView('opac')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subView === 'opac'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Danh mục Đầu sách & Tra cứu đa phương án
          </button>
          <button
            onClick={() => setSubView('audit')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subView === 'audit'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Kiểm kê kho mã vạch (FR-1.3)
          </button>
        </div>

        {subView === 'opac' && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm đầu sách mới</span>
          </button>
        )}
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: MULTI-METHOD SEARCH + FACETS + SLIDE-OVER COPY DRAWER       */}
      {/* =================================================================== */}
      {subView === 'opac' && (
        <div className="space-y-5">
          {/* Search Control Deck */}
          <div className="bg-[#121826] border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center p-1 bg-[#0B0F19] rounded-md border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode('traditional');
                    setSearchError(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    searchMode === 'traditional'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Truyền thống (Khớp chính xác)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode('fuzzy');
                    setSearchError(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    searchMode === 'fuzzy'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Phương án 1: Mờ & Không dấu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode('semantic');
                    setSearchError(null);
                    if (query.trim()) setSubmittedSemanticQuery(query);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                    searchMode === 'semantic'
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Phương án 2: Ngữ nghĩa AI</span>
                </button>
              </div>

              <div className="text-xs text-slate-400 font-mono tabular-nums">
                {searchLoading ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang truy vấn...</span>
                  </span>
                ) : (
                  <span>
                    {searchResults.length} kết quả
                    {searchDurationMs !== null ? ` · ${searchDurationMs}ms` : ''}
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    searchMode === 'traditional'
                      ? 'Tìm chính xác theo Tên sách, Tác giả, ISBN, Mã bản sao...'
                      : searchMode === 'fuzzy'
                      ? 'Gõ không dấu, sai chính tả hoặc viết tắt (vd: giao trinh csdl, Kahnemann)...'
                      : 'Mô tả chủ đề hoặc nội dung cần tìm (vd: kiến trúc hệ thống chịu tải cao)...'
                  }
                  className="w-full pl-9 pr-9 py-2.5 text-sm bg-[#0B0F19] text-slate-100 placeholder:text-slate-500 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSubmittedSemanticQuery('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                    title="Xóa từ khóa"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchMode === 'semantic' && (
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  Tìm ngữ nghĩa
                </button>
              )}
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2.5 text-slate-400">
                <span>Thử nhanh:</span>
                {SAMPLE_QUERIES[searchMode].map((sample) => (
                  <button
                    key={sample.q}
                    type="button"
                    onClick={() => handleApplySampleQuery(sample.q)}
                    className="text-emerald-400 hover:text-emerald-300 hover:underline font-medium"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
              {searchMode === 'fuzzy' && expandedTerms.length > 0 && (
                <div className="text-slate-400 font-mono">
                  Đồng nghĩa: {expandedTerms.join(', ')}
                </div>
              )}
            </div>

            {searchError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-md text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Facet Rail (Option 4) */}
            <aside className="lg:col-span-3 bg-[#121826] border border-slate-800 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="text-xs font-semibold text-white">
                  Lát cắt động (Phương án 4)
                </h3>
                {hasActiveFacets && (
                  <button
                    onClick={handleResetFacets}
                    className="text-xs text-emerald-400 hover:underline font-medium"
                  >
                    Đặt lại
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-400">Tình trạng lưu hành</div>
                <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer py-1">
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                      className="rounded border-slate-700 bg-[#0B0F19] text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Còn sách sẵn sàng</span>
                  </span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {facets?.availability.available ?? 0}
                  </span>
                </label>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-xs font-medium text-slate-400">Thể loại</div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setCategoryFilter('ALL')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded transition-colors ${
                      categoryFilter === 'ALL'
                        ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <span>Tất cả thể loại</span>
                  </button>
                  {(facets?.categories || []).map((b) => (
                    <button
                      key={b.value}
                      onClick={() =>
                        setCategoryFilter(categoryFilter === b.value ? 'ALL' : b.value)
                      }
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded transition-colors ${
                        categoryFilter === b.value
                          ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="truncate text-left">{b.value}</span>
                      <span className="font-mono text-slate-400 tabular-nums ml-2">
                        {b.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-xs font-medium text-slate-400">Vị trí kệ</div>
                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  <button
                    onClick={() => setShelfFilter('ALL')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded transition-colors ${
                      shelfFilter === 'ALL'
                        ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <span>Mọi vị trí kệ</span>
                  </button>
                  {(facets?.shelves || []).map((b) => (
                    <button
                      key={b.value}
                      onClick={() =>
                        setShelfFilter(shelfFilter === b.value ? 'ALL' : b.value)
                      }
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded transition-colors ${
                        shelfFilter === b.value
                          ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="truncate text-left">{b.value}</span>
                      <span className="font-mono text-slate-400 tabular-nums ml-2">
                        {b.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-xs font-medium text-slate-400">Năm xuất bản</div>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-700 rounded bg-[#0B0F19] text-slate-200 tabular-nums"
                >
                  <option value="ALL">Mọi năm xuất bản</option>
                  {(facets?.years || []).map((b) => (
                    <option key={b.value} value={b.value}>
                      Năm {b.value} ({b.count})
                    </option>
                  ))}
                </select>
              </div>
            </aside>

            {/* Full 9-col Results Table */}
            <div className="lg:col-span-9 bg-[#121826] border border-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#0F1522] text-xs text-slate-400">
                      <th className="text-left px-5 py-2.5 font-medium">Đầu sách & Tác giả</th>
                      <th className="text-left px-3 py-2.5 font-medium">Thể loại / Kệ</th>
                      <th className="text-right px-3 py-2.5 font-medium">Giá bìa</th>
                      <th className="text-right px-3 py-2.5 font-medium">Bản sao sẵn</th>
                      <th className="text-right px-5 py-2.5 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 tabular-nums">
                    {searchResults.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                          Không tìm thấy đầu sách phù hợp. Hãy thử chuyển sang Phương án 1 (Tìm
                          kiếm mờ) hoặc Phương án 2 (Ngữ nghĩa AI).
                        </td>
                      </tr>
                    ) : (
                      searchResults.map((t) => {
                        const isActive = t.MaDauSach === selectedTitleId;
                        return (
                          <tr
                            key={t.MaDauSach}
                            onClick={() => setSelectedTitleId(t.MaDauSach)}
                            className={`cursor-pointer transition-colors ${
                              isActive ? 'bg-emerald-500/10' : 'hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="px-5 py-3">
                              <div className="font-semibold text-white leading-snug">
                                {t.TenSach}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {t.TacGia} · {t.NamXuatBan} ·{' '}
                                <span className="font-mono text-slate-300">{t.MaDauSach}</span>
                                {t.ISBN ? ` · ISBN ${t.ISBN}` : ''}
                              </div>
                              {t.searchMeta && t.searchMeta.reasons.length > 0 && query.trim() && (
                                <div className="text-[11px] text-emerald-400 font-medium mt-1">
                                  {t.searchMeta.reasons.join(' · ')}
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-3 text-xs">
                              <div className="text-slate-200 font-medium">{t.TheLoai}</div>
                              <div className="text-slate-400 inline-flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                <span>{t.ViTriKe || 'Chưa xếp kệ'}</span>
                              </div>
                            </td>

                            <td className="px-3 py-3 text-right font-mono text-xs text-slate-300 whitespace-nowrap">
                              {formatCurrency(t.GiaBia)}
                            </td>

                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              <span
                                className={`text-xs font-semibold font-mono ${
                                  t.SoBanSanSang > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {t.SoBanSanSang}/{t.TongBanSao} sẵn sàng
                              </span>
                              <div className="text-[11px] text-slate-500">
                                {t.SoBanDangMuon} đang mượn
                              </div>
                            </td>

                            <td
                              className="px-5 py-3 text-right whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => setSelectedTitleId(t.MaDauSach)}
                                  className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded hover:bg-emerald-500/20"
                                >
                                  Bản sao
                                </button>
                                <button
                                  onClick={() => openEditModal(t)}
                                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                                  title="Chỉnh sửa đầu sách"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(t)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10"
                                  title="Xóa mềm đầu sách"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Inspector Drawer for Copies + Related Discovery */}
      {selectedTitle && subView === 'opac' && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setSelectedTitleId(null)}
          />
          <aside className="relative w-full max-w-lg bg-[#121826] border-l border-slate-800 h-full overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono text-emerald-400">
                  {selectedTitle.MaDauSach} · {selectedTitle.ViTriKe || 'Kho chung'}
                </div>
                <h3 className="font-display text-lg font-bold text-white mt-1 leading-snug">
                  {selectedTitle.TenSach}
                </h3>
                <div className="text-xs text-slate-400 mt-1">
                  {selectedTitle.TacGia} · {selectedTitle.NhaXuatBan || 'NXB'} ({selectedTitle.NamXuatBan})
                </div>
                {selectedTitle.MoTa && (
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{selectedTitle.MoTa}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedTitleId(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                title="Đóng ngăn chi tiết"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add physical copies */}
            <div className="bg-[#0B0F19] border border-slate-800 rounded-md p-3.5 space-y-2.5">
              <div className="text-xs font-semibold text-slate-200">
                Nhập thêm bản sao vật lý (Tự sinh mã vạch)
              </div>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={addCopyCount}
                  onChange={(e) => setAddCopyCount(Number(e.target.value))}
                  className="col-span-3 px-2.5 py-1.5 text-xs font-mono border border-slate-700 rounded bg-[#121826] text-white"
                />
                <input
                  type="text"
                  value={addCopyCondition}
                  onChange={(e) => setAddCopyCondition(e.target.value)}
                  placeholder="Tình trạng"
                  className="col-span-5 px-2.5 py-1.5 text-xs border border-slate-700 rounded bg-[#121826] text-white"
                />
                <button
                  onClick={handleAddCopiesSubmit}
                  disabled={copyActionLoading}
                  className="col-span-4 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap"
                >
                  + Nhập kho
                </button>
              </div>
            </div>

            {/* Physical copies list */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Danh sách bản sao trong kho ({selectedTitle.BanSaoList?.length || 0})
              </div>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-md bg-[#0B0F19]">
                {(selectedTitle.BanSaoList || []).map((copy) => (
                  <div
                    key={copy.MaBanSao}
                    className="p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BarcodeSvg code={copy.MaBanSao} height={22} showText={false} />
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-semibold text-white">
                          {copy.MaBanSao}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {formatDateVi(copy.NgayNhapKho)} · {copy.TinhTrangVatLy}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <CopyStatusText status={copy.TrangThai} />
                      {copy.TrangThai !== 'DANG_MUON' && (
                        <select
                          value={copy.TrangThai}
                          onChange={(e) =>
                            onUpdateCopy(copy.MaBanSao, {
                              TrangThai: e.target.value as TrangThaiBanSao,
                            })
                          }
                          className="text-[11px] border border-slate-700 rounded px-1.5 py-0.5 bg-[#121826] text-slate-200"
                        >
                          {(
                            ['SAN_SANG', 'HU_HONG', 'THAT_LAC', 'THANH_LY'] as TrangThaiBanSao[]
                          ).map((st) => (
                            <option key={st} value={st}>
                              {COPY_STATUS_LABELS[st]}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Co-Borrowing Discovery (Option 4) */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Network className="w-3.5 h-3.5 text-emerald-400" />
                <span>Khám phá liên kết & Cùng kệ (Phương án 4)</span>
              </div>
              {relatedLoading ? (
                <div className="text-xs text-slate-400 py-2">Đang phân tích đồ thị mượn...</div>
              ) : relatedBooks.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">
                  Chưa có dữ liệu liên kết đồng mượn cho đầu sách này.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-md bg-[#0B0F19]">
                  {relatedBooks.map((rec) => (
                    <button
                      key={rec.MaDauSach}
                      onClick={() => setSelectedTitleId(rec.MaDauSach)}
                      className="w-full text-left p-3 hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-100 truncate">
                          {rec.TenSach}
                        </div>
                        <div className="text-[11px] text-emerald-400 mt-0.5">
                          {rec.relationLabel} · Còn {rec.SoBanSanSang}/{rec.TongBanSao} bản
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: KIỂM KÊ KHO ĐỊNH KỲ (FR-1.3)                                */}
      {/* =================================================================== */}
      {subView === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-[#121826] border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Quét mã vạch kiểm kê thực tế trên kệ
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Đối chiếu mã bản sao thực tế với trạng thái Sẵn sàng trong CSDL
                </p>
              </div>
              <Barcode className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePrefillExpectedBarcodes(0)}
                className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#192233] border border-slate-700 rounded hover:bg-slate-800"
              >
                Nạp đủ toàn bộ sách Sẵn sàng
              </button>
              <button
                type="button"
                onClick={() => handlePrefillExpectedBarcodes(2)}
                className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded hover:bg-amber-500/20"
              >
                Mô phỏng thiếu 2 cuốn trên kệ
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Danh sách mã vạch bản sao đã quét (mỗi mã một dòng):
              </label>
              <textarea
                rows={8}
                value={auditInput}
                onChange={(e) => setAuditInput(e.target.value)}
                placeholder={'BS-00102\nBS-00103\nBS-00202'}
                className="w-full px-3 py-2 text-xs font-mono bg-[#0B0F19] text-slate-100 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Nhân sự kiểm kê
                </label>
                <input
                  type="text"
                  value={auditInspector}
                  onChange={(e) => setAuditInspector(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B0F19] text-slate-100 border border-slate-700 rounded-md"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 pt-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markMissingAsLost}
                  onChange={(e) => setMarkMissingAsLost(e.target.checked)}
                  className="rounded border-slate-700 bg-[#0B0F19] text-rose-500"
                />
                <span>Tự động gắn cờ &quot;Thất lạc&quot; cho bản sao thiếu</span>
              </label>
            </div>

            <button
              onClick={handleRunAuditSubmit}
              disabled={auditLoading || !auditInput.trim()}
              className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{auditLoading ? 'Đang đối chiếu kho...' : 'Thực hiện đối chiếu kiểm kê'}</span>
            </button>
          </div>

          <div className="lg:col-span-6 space-y-4">
            {auditResult && (
              <div className="bg-[#121826] border border-slate-800 rounded-lg p-5 space-y-4">
                <h3 className="text-base font-semibold text-white">Kết quả đối chiếu kiểm kê</h3>

                <div className="grid grid-cols-3 gap-3 text-center tabular-nums">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md">
                    <div className="text-lg font-bold text-emerald-400">
                      {auditResult.matched.length}/{auditResult.expectedCount}
                    </div>
                    <div className="text-[11px] text-emerald-300">Khớp trên kệ</div>
                  </div>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-md">
                    <div className="text-lg font-bold text-rose-400">
                      {auditResult.missingFromShelf.length}
                    </div>
                    <div className="text-[11px] text-rose-300">Thiếu / Chênh lệch</div>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                    <div className="text-lg font-bold text-amber-400">
                      {auditResult.statusMismatch.length}
                    </div>
                    <div className="text-[11px] text-amber-300">Sai trạng thái CSDL</div>
                  </div>
                </div>

                {auditResult.missingFromShelf.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        Bản sao thiếu khi quét (
                        {auditResult.markedAsLost
                          ? 'Đã chuyển sang Thất lạc'
                          : 'Chưa đổi trạng thái'}
                        ):
                      </span>
                    </div>
                    <div className="border border-rose-500/30 rounded-md divide-y divide-rose-500/20 text-xs bg-[#0B0F19]">
                      {auditResult.missingFromShelf.map((m) => (
                        <div key={m.MaBanSao} className="px-3 py-2 flex justify-between gap-2">
                          <span className="font-mono font-semibold text-rose-300">
                            {m.MaBanSao}
                          </span>
                          <span className="text-slate-200 truncate flex-1">{m.TenSach}</span>
                          <span className="text-slate-400 shrink-0">{m.ViTriKe}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kho thực tế khớp hoàn toàn với dữ liệu hệ thống.</span>
                  </div>
                )}

                {auditResult.unknownCodes.length > 0 && (
                  <div className="text-xs text-slate-400">
                    Mã lạ không thuộc CSDL: {auditResult.unknownCodes.join(', ')}
                  </div>
                )}
              </div>
            )}

            <div className="bg-[#121826] border border-slate-800 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-white mb-3">
                Lịch sử các đợt kiểm kê ({audits.length})
              </h3>
              {audits.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  Chưa có biên bản kiểm kê nào được lưu.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 text-xs tabular-nums">
                  {audits.map((a) => (
                    <div key={a.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-mono font-semibold text-slate-100">
                          {a.id} · {formatDateTimeVi(a.NgayKiemKe)}
                        </div>
                        <div className="text-slate-400">{a.NguoiKiemKe}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-medium">Khớp {a.SoKhop}</span> ·{' '}
                        <span
                          className={
                            a.SoThieu > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'
                          }
                        >
                          Thiếu {a.SoThieu}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Title Modal */}
      {titleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingTitle
                  ? `Cập nhật đầu sách ${editingTitle.MaDauSach}`
                  : 'Thêm đầu sách mới'}
              </h3>
              <button
                onClick={() => setTitleModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTitle} className="space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-300 mb-1">Tên sách *</label>
                <input
                  required
                  type="text"
                  value={formState.TenSach}
                  onChange={(e) => setFormState({ ...formState, TenSach: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Tác giả *</label>
                  <input
                    required
                    type="text"
                    value={formState.TacGia}
                    onChange={(e) => setFormState({ ...formState, TacGia: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Thể loại *</label>
                  <input
                    required
                    type="text"
                    value={formState.TheLoai}
                    onChange={(e) => setFormState({ ...formState, TheLoai: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">ISBN</label>
                  <input
                    type="text"
                    value={formState.ISBN}
                    onChange={(e) => setFormState({ ...formState, ISBN: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Năm XB *</label>
                  <input
                    required
                    type="number"
                    min={1901}
                    value={formState.NamXuatBan}
                    onChange={(e) =>
                      setFormState({ ...formState, NamXuatBan: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Giá bìa (VNĐ) *</label>
                  <input
                    required
                    type="number"
                    min={0}
                    step={1000}
                    value={formState.GiaBia}
                    onChange={(e) =>
                      setFormState({ ...formState, GiaBia: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Nhà xuất bản</label>
                  <input
                    type="text"
                    value={formState.NhaXuatBan}
                    onChange={(e) =>
                      setFormState({ ...formState, NhaXuatBan: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Vị trí kệ</label>
                  <input
                    type="text"
                    value={formState.ViTriKe}
                    onChange={(e) => setFormState({ ...formState, ViTriKe: e.target.value })}
                    placeholder="Ví dụ: Kệ A2 - Tầng 3"
                    className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md"
                  />
                </div>
              </div>

              {!editingTitle && (
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Số lượng bản sao nhập kho ban đầu (tự sinh mã vạch)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={formState.SoLuongBanSao}
                    onChange={(e) =>
                      setFormState({ ...formState, SoLuongBanSao: Number(e.target.value) })
                    }
                    className="w-32 px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-300 mb-1">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  value={formState.MoTa}
                  onChange={(e) => setFormState({ ...formState, MoTa: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0B0F19] text-white border border-slate-700 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTitleModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 bg-[#192233] border border-slate-700 rounded-md hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-50"
                >
                  {formSaving ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Soft Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-slate-700 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Xác nhận xóa mềm đầu sách</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc muốn ẩn đầu sách{' '}
              <span className="font-semibold text-white">{deleteTarget.TenSach}</span> (
              {deleteTarget.MaDauSach}) khỏi danh mục lưu hành? Lịch sử mượn trả cũ vẫn được bảo
              toàn.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-[#192233] border border-slate-700 rounded-md hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await onDeleteTitle(deleteTarget.MaDauSach);
                  if (selectedTitleId === deleteTarget.MaDauSach) setSelectedTitleId(null);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-500"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
