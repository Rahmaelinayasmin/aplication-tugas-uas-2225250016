export function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="#BDEBD6" />
      <rect x="9" y="9" width="30" height="30" rx="8" fill="#fff" />
      <circle cx="17" cy="17" r="3" fill="#2E3440" />
      <circle cx="31" cy="31" r="3" fill="#2E3440" />
      <circle cx="24" cy="24" r="3" fill="#E8863A" />
    </svg>
  );
}
