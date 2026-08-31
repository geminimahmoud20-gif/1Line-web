export function PropertyCardSkeleton() {
  return (
    <div className="property-card-skeleton">
      <div className="skeleton-media shimmer" />
      <div className="skeleton-body">
        <div className="skeleton-line line-title shimmer" />
        <div className="skeleton-line line-location shimmer" />
        <div className="skeleton-specs-grid">
          <div className="skeleton-spec-box shimmer" />
          <div className="skeleton-spec-box shimmer" />
          <div className="skeleton-spec-box shimmer" />
        </div>
        <div className="skeleton-footer">
          <div className="skeleton-line line-price shimmer" />
          <div className="skeleton-btn shimmer" />
        </div>
      </div>
    </div>
  );
}

export function PropertyListSkeleton({ count = 4 }) {
  return (
    <div className="properties-grid-4">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}
