import { useMemo } from 'react';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';

/**
 * 🌟 1LINE LUXURY PROPTECH PAGINATION COMPONENT
 * Provides high-contrast, responsive page switching with smooth scroll.
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems = 0,
  pageSize = 9,
  isAr = true,
  showInfo = true,
  scrollToId = null
}) {
  // Compute start and end items for the info text
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate pagination window: e.g. [1, 2, 3, '...', 10]
  const pageNumbers = useMemo(() => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // Always include page 1
    pages.push(1);

    const leftBoundary = Math.max(2, currentPage - 1);
    const rightBoundary = Math.min(totalPages - 1, currentPage + 1);

    if (leftBoundary > 2) {
      pages.push('ellipsis-left');
    }

    for (let i = leftBoundary; i <= rightBoundary; i++) {
      pages.push(i);
    }

    if (rightBoundary < totalPages - 1) {
      pages.push('ellipsis-right');
    }

    // Always include last page
    pages.push(totalPages);

    return pages;
  }, [currentPage, totalPages]);

  // After the hook: hooks must run on every render
  if (totalPages <= 1) return null;

  const handleSelectPage = (pageNum) => {
    if (pageNum === currentPage || pageNum < 1 || pageNum > totalPages) return;
    onPageChange?.(pageNum);

    if (scrollToId) {
      const el = document.getElementById(scrollToId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    // Fallback smooth scroll to top of catalog
    window.scrollTo({ top: 320, behavior: 'smooth' });
  };

  return (
    <nav className="luxury-pagination-wrapper" aria-label={isAr ? 'ترقيم الصفحات' : 'Pagination'}>
      {showInfo && totalItems > 0 && (
        <div className="pagination-info-strip">
          <span>
            {isAr
              ? `عرض ${startItem.toLocaleString('en-US')} – ${endItem.toLocaleString('en-US')} من أصل ${totalItems.toLocaleString('en-US')} عقاراً`
              : `Showing ${startItem.toLocaleString('en-US')} – ${endItem.toLocaleString('en-US')} of ${totalItems.toLocaleString('en-US')} listings`}
          </span>
          <span className="pagination-page-pill">
            {isAr ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
          </span>
        </div>
      )}

      <div className="pagination-controls-row">
        {/* Previous Button */}
        <button
          type="button"
          className="pagination-btn pagination-nav-btn prev-btn"
          disabled={currentPage <= 1}
          onClick={() => handleSelectPage(currentPage - 1)}
          aria-label={isAr ? 'الصفحة السابقة' : 'Previous page'}
        >
          {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          <span>{isAr ? 'السابق' : 'Prev'}</span>
        </button>

        {/* Page Numbers */}
        <div className="pagination-numbers-group">
          {pageNumbers.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis" aria-hidden="true">
                  •••
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                className={`pagination-btn pagination-num-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => handleSelectPage(p)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={isAr ? `صفحة ${p}` : `Page ${p}`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          className="pagination-btn pagination-nav-btn next-btn"
          disabled={currentPage >= totalPages}
          onClick={() => handleSelectPage(currentPage + 1)}
          aria-label={isAr ? 'الصفحة التالية' : 'Next page'}
        >
          <span>{isAr ? 'التالي' : 'Next'}</span>
          {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
    </nav>
  );
}
