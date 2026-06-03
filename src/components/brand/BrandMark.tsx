/**
 * ShakerSplit brand mark, inlined as JSX for tree-shakability and theming.
 * Three rounded bands using brand gradients (food → workout → alcohol).
 * Pass `withBackground` to render the dark rounded square; omit for transparent overlays.
 */
type BrandMarkProps = {
  className?: string;
  withBackground?: boolean;
  /** ARIA label override; default 'ShakerSplit' */
  title?: string;
};

export function BrandMark({ className, withBackground = false, title = 'ShakerSplit' }: BrandMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="bm-green" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#66BB6A" />
          <stop offset="100%" stopColor="#388E3C" />
        </linearGradient>
        <linearGradient id="bm-orange" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFB74D" />
          <stop offset="100%" stopColor="#F57C00" />
        </linearGradient>
        <linearGradient id="bm-purple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#BA68C8" />
          <stop offset="100%" stopColor="#7B1FA2" />
        </linearGradient>
        {withBackground && (
          <linearGradient id="bm-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        )}
      </defs>
      {withBackground && <rect width="512" height="512" rx="112" fill="url(#bm-bg)" />}
      <rect x="120" y="112" width="304" height="80" rx="40" fill="url(#bm-green)" />
      <rect x="88" y="216" width="336" height="80" rx="40" fill="url(#bm-orange)" />
      <rect x="88" y="320" width="304" height="80" rx="40" fill="url(#bm-purple)" />
    </svg>
  );
}

/**
 * Mark + wordmark, horizontal layout. Use in headers, footers, login branding panel.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <BrandMark className="h-7 w-7" withBackground />
      <span className="text-lg font-extrabold tracking-tight">
        Shaker<span className="text-food">Split</span>
      </span>
    </div>
  );
}
