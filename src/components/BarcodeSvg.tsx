import React from 'react';

interface BarcodeSvgProps {
  code: string;
  height?: number;
  showText?: boolean;
  className?: string;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  code,
  height = 32,
  showText = true,
  className = '',
}) => {
  const bars: Array<{ x: number; w: number }> = [];
  let cursor = 2;

  bars.push({ x: cursor, w: 2 });
  cursor += 3;
  bars.push({ x: cursor, w: 1 });
  cursor += 3;

  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const w1 = (charCode % 3) + 1;
    const g1 = ((charCode >> 2) % 2) + 1;
    const w2 = ((charCode >> 3) % 2) + 1;
    const g2 = ((charCode >> 4) % 2) + 1;
    bars.push({ x: cursor, w: w1 });
    cursor += w1 + g1;
    bars.push({ x: cursor, w: w2 });
    cursor += w2 + g2;
  }

  bars.push({ x: cursor, w: 2 });
  cursor += 3;
  bars.push({ x: cursor, w: 2 });
  cursor += 4;

  return (
    <div
      className={`inline-flex flex-col items-center bg-white px-2 py-1.5 rounded border border-slate-200 ${className}`}
    >
      <svg
        width={cursor}
        height={height}
        viewBox={`0 0 ${cursor} ${height}`}
        className="text-slate-900"
        aria-label={`Mã vạch ${code}`}
      >
        {bars.map((b, idx) => (
          <rect
            key={idx}
            x={b.x}
            y={0}
            width={b.w}
            height={height}
            fill="currentColor"
          />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[11px] tracking-wider text-slate-800 mt-1 tabular-nums">
          {code}
        </span>
      )}
    </div>
  );
};
