/** New Lease leaf mark, redrawn from References/NameandImageAssets.png. The midrib is cut out so it reads on any background. */
export function Leaf({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={className}>
      <defs>
        <mask id="leaf-rib">
          <rect width="64" height="64" fill="white" />
          <path d="M9 55C20 39 33 26 50 14" stroke="black" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </mask>
      </defs>
      <path d="M7 57C4 33 20 9 59 5c-1 30-19 51-52 52z" fill="currentColor" mask="url(#leaf-rib)" />
    </svg>
  );
}
