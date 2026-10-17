import { Component, type ErrorInfo, type ReactNode } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary a capturé une erreur :', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            backgroundColor: 'var(--knit-surface)',
            color: 'var(--knit-text)',
            gap: 16,
            textAlign: 'center',
            height: '100%',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            <DuotoneIcon name="close" size={24} />
          </div>

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              {this.props.fallbackTitle || 'Une erreur est survenue dans cette vue'}
            </h3>
            <p
              style={{
                fontSize: 12,
                color: 'var(--knit-text-muted)',
                maxWidth: 420,
                fontFamily: 'var(--knit-font-mono)',
                backgroundColor: 'var(--knit-bg)',
                padding: '8px 12px',
                borderRadius: 'var(--knit-radius-sm)',
                border: '1px solid var(--knit-border)',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.message || 'Erreur inattendue'}
            </p>
          </div>

          <button
            onClick={this.handleReset}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--knit-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--knit-radius-sm)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <DuotoneIcon name="sync" size={13} />
            <span>Réessayer</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
