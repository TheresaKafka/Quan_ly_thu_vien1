import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  CARD_STATUS_LABELS,
  COPY_STATUS_LABELS,
  SLIP_STATUS_LABELS,
  TrangThaiBanSao,
  TrangThaiPhieu,
  TrangThaiThe,
} from '../types/library';

export const CopyStatusText: React.FC<{ status: TrangThaiBanSao }> = ({ status }) => {
  const map: Record<TrangThaiBanSao, { color: string; Icon: React.ElementType }> = {
    SAN_SANG: { color: 'text-emerald-400', Icon: CheckCircle2 },
    DANG_MUON: { color: 'text-sky-400', Icon: BookOpen },
    HU_HONG: { color: 'text-amber-400', Icon: AlertTriangle },
    THAT_LAC: { color: 'text-rose-400', Icon: XCircle },
    THANH_LY: { color: 'text-slate-400', Icon: Trash2 },
  };
  const { color, Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{COPY_STATUS_LABELS[status]}</span>
    </span>
  );
};

export const CardStatusText: React.FC<{ status: TrangThaiThe; lightSurface?: boolean }> = ({
  status,
  lightSurface = false,
}) => {
  const map: Record<TrangThaiThe, { dark: string; light: string; Icon: React.ElementType }> = {
    HOAT_DONG: { dark: 'text-emerald-400', light: 'text-emerald-700', Icon: CheckCircle2 },
    BI_KHOA: { dark: 'text-rose-400', light: 'text-red-700', Icon: Lock },
    HET_HAN: { dark: 'text-amber-400', light: 'text-amber-700', Icon: Clock },
  };
  const { dark, light, Icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${
        lightSurface ? light : dark
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{CARD_STATUS_LABELS[status]}</span>
    </span>
  );
};

export const SlipStatusText: React.FC<{ status: TrangThaiPhieu; lightSurface?: boolean }> = ({
  status,
  lightSurface = false,
}) => {
  const map: Record<TrangThaiPhieu, { dark: string; light: string; Icon: React.ElementType }> = {
    DANG_MUON: { dark: 'text-sky-400', light: 'text-blue-700', Icon: BookOpen },
    TRA_MOT_PHAN: { dark: 'text-amber-400', light: 'text-amber-700', Icon: Clock },
    DA_HOAN_THANH: { dark: 'text-emerald-400', light: 'text-emerald-700', Icon: CheckCircle2 },
  };
  const { dark, light, Icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${
        lightSurface ? light : dark
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{SLIP_STATUS_LABELS[status]}</span>
    </span>
  );
};
