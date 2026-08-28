export function PageLoadingSkeleton({ variant = "workspace" }: { variant?: "workspace" | "returns" }) {
  return (
    <main className={variant === "returns" ? "gst-returns-page" : "gst-profile-page"} aria-busy="true">
      <div className={variant === "returns" ? "gst-returns-container" : "gst-profile-container"}>
        <div className={`gst-page-skeleton gst-page-skeleton--${variant}`}>
          <span className="sr-only">Loading page</span>
          <div className="gst-page-skeleton-breadcrumb" />
          <div className="gst-page-skeleton-title" />
          <div className="gst-page-skeleton-subtitle" />
          <section className="gst-page-skeleton-panel gst-page-skeleton-controls">
            <div />
            <div />
            <div />
            <div />
          </section>
          <section className="gst-page-skeleton-panel gst-page-skeleton-table">
            <div className="gst-page-skeleton-table-head"><span /><span /></div>
            {Array.from({ length: 5 }, (_, index) => <div className="gst-page-skeleton-row" key={index}><span /><span /><span /><span /></div>)}
          </section>
        </div>
      </div>
    </main>
  );
}
