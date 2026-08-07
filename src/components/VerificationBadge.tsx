import React from 'react';

interface VerificationBadgeProps {
  className?: string;
  size?: number;
  title?: string;
}

/**
 * Custom Blue Verification Badge Component
 * Matches the official Facebook / Meta / Twitter scalloped blue starburst badge with white checkmark.
 */
export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  className = "w-4 h-4 inline-block shrink-0 align-middle ml-1",
  size,
  title = "Premium Verified Member (ভেরিফাইড প্রিমিয়াম মেম্বার)"
}) => {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`inline-block shrink-0 ${className}`}
      style={style}
      title={title}
    >
      {/* 12-point Scalloped Starburst Badge Background */}
      <path
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.688.438-1.531.156-3.281-.969-4.406s-2.875-1.406-4.406-.969C14.25 2.172 12.875 1.3 11.297 1.3s-2.953.875-3.688 2.148c-1.531-.438-3.281-.156-4.406.969s-1.406 2.875-.969 4.406C1 9.547.125 10.922.125 12.5s.875 2.953 2.109 3.688c-.438 1.531-.156 3.281.969 4.406s2.875 1.406 4.406.969c.734 1.273 2.109 2.148 3.688 2.148s2.953-.875 3.688-2.148c1.531.438 3.281.156 4.406-.969s1.406-2.875.969-4.406c1.273-.735 2.148-2.11 2.148-3.688z"
        fill="#1D9BF0"
      />
      {/* White Checkmark */}
      <path
        d="M9.86 16.02L5.8 11.96l1.41-1.41 2.65 2.65 6.94-6.94 1.41 1.41-8.35 8.35z"
        fill="#FFFFFF"
      />
    </svg>
  );
};
