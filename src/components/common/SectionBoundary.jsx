import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { ErrorState } from '../ui';
import { reportError } from '../../utils/errorReporter';

/**
 * Catches a crash inside one part of a page (a CRM tab, a report) so the rest keeps working: the menu, the other tabs
 * and what was typed elsewhere stay. Shows a short message with «جرّب تاني» in place of that part only, and reports it
 * (CRM → النظام → أخطاء الموقع). A new `resetKey` (another tab opened) clears it. A file missing after a deploy is not
 * handled here: it goes up to the page's ErrorBoundary, which reloads the page.
 */
export default class SectionBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (ErrorBoundary.isStaleChunk(error)) return;
    console.error('SectionBoundary caught an error:', error);
    reportError('crash', { message: `[${this.props.name || 'section'}] ${error?.message || String(error || '')}`, stack: `${error?.stack || ''}\n--- component stack ---${info?.componentStack || ''}` });
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (ErrorBoundary.isStaleChunk(error)) throw error; // the page-level boundary reloads for a new deploy
    const isAr = this.props.isAr !== false;
    return (
      <ErrorState
        title={isAr ? 'الجزء ده حصل فيه مشكلة' : 'This part ran into a problem'}
        description={isAr ? 'باقي الصفحة شغّال. جرّب تاني، ولو فضلت المشكلة بلّغ الدعم (اتسجّلت تلقائيًا في أخطاء الموقع).' : 'The rest of the page still works. Try again; it was reported automatically.'}
        retryLabel={isAr ? 'جرّب تاني' : 'Try again'}
        onRetry={() => this.setState({ error: null })}
      />
    );
  }
}
