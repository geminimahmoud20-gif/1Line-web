import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    const msg = error?.message || String(error || '');
    if (
      msg.includes('preload CSS') || 
      msg.includes('dynamically imported module') || 
      msg.includes('Loading chunk') ||
      msg.includes('Failed to fetch')
    ) {
      const reloadKey = '1line_chunk_reload_attempt';
      const lastAttempt = sessionStorage.getItem(reloadKey);
      if (!lastAttempt || (Date.now() - Number(lastAttempt)) > 15000) {
        sessionStorage.setItem(reloadKey, String(Date.now()));
        window.location.reload();
        return;
      }
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleResetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            color: '#ef4444'
          }}>
            <AlertTriangle size={32} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0 0 8px 0', color: '#ffffff' }}>
            حدث خطأ غير متوقع أثناء عرض البيانات
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: '0 0 24px 0', lineHeight: 1.6 }}>
            تم عزل الخطأ لمنع تعطل النظام. يمكنك إعادة تحميل الصفحة للعودة للعمل بكفاءة تامة.
          </p>

          {this.state.error && (
            <div style={{
              margin: '0 0 24px 0',
              padding: '14px 18px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '10px',
              color: '#f87171',
              fontSize: '0.8rem',
              maxWidth: '850px',
              width: '90%',
              textAlign: 'left',
              direction: 'ltr',
              overflowX: 'auto',
              fontFamily: 'monospace'
            }}>
              <strong>{this.state.error.toString()}</strong>
              {this.state.error.stack && (
                <pre style={{ marginTop: '8px', fontSize: '0.72rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                  {this.state.error.stack}
                </pre>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} />
              <span>إعادة تحميل الصفحة</span>
            </button>

            <button
              type="button"
              onClick={this.handleGoHome}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '10px 22px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Home size={15} />
              <span>العودة للرئيسية</span>
            </button>

            <button
              type="button"
              onClick={this.handleResetAndReload}
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '10px 22px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
              title="مسح الذاكرة المحلية وإعادة ضبط بيانات الجلسة"
            >
              <span>إعادة ضبط ومسح الذاكرة المؤقتة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
