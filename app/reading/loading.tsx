export default function ReadingLoading() {
  return (
    <main className="iserein-route-loading" aria-busy="true">
      <div className="iserein-loading-page">
        <p className="iserein-home-eyebrow" role="status">Opening your reading…</p>
        <div className="iserein-home-skeleton-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}
