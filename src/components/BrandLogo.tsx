interface BrandLogoProps {
  className?: string;
  showMark?: boolean;
}

export function BrandLogo({ className = '', showMark = true }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      {showMark && (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <rect width="24" height="24" rx="6" fill="#7C3AED" />
          <path
            d="M12 5.5L17.5 17.5H14.8L13.55 14.6H10.45L9.2 17.5H6.5L12 5.5ZM11.2 12.6H12.8L12 10.6L11.2 12.6Z"
            fill="#FFFFFF"
          />
        </svg>
      )}
      <span className="font-display font-bold text-lg tracking-tight text-white">ARK AI</span>
    </span>
  );
}
