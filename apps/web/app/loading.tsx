export default function Loading() {
  return (
    <div
      aria-label="Yükleniyor"
      role="status"
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2px solid var(--line)',
          borderTopColor: 'var(--bronze)',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          div[role="status"] > div { animation-duration: 2.4s; }
        }
      `}</style>
    </div>
  );
}
