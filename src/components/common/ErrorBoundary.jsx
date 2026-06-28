import { Component } from 'react';

/**
 * Catches render-time errors anywhere in the tree below it. Without this,
 * an uncaught error during render (e.g. calling .toLowerCase() on a
 * non-string value from an API response with an undocumented schema)
 * unmounts the entire React tree and leaves a blank white page with no
 * indication of what happened. This shows a recoverable message instead
 * and logs the real error to the console for debugging.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Render error caught by ErrorBoundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.wrap}>
          <div style={styles.card}>
            <h2 style={styles.title}>Something went wrong on this page</h2>
            <p style={styles.text}>
              This usually means the data returned by the API didn't match what the page expected.
              Try going back or reloading — if it keeps happening, this page needs a fix.
            </p>
            {this.state.error && (
              <pre style={styles.pre}>{String(this.state.error?.message ?? this.state.error)}</pre>
            )}
            <div style={styles.actions}>
              <button style={styles.btn} onClick={this.handleReset}>Try again</button>
              <button style={styles.btnSecondary} onClick={() => { window.location.href = '/dashboard'; }}>
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles = {
  wrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' },
  card: { maxWidth: 520, textAlign: 'center', background: 'var(--color-bg-card, #fff)', border: '1px solid var(--color-border, #e2e2e2)', borderRadius: 12, padding: '2rem' },
  title: { margin: '0 0 0.75rem', fontSize: '1.1rem' },
  text: { margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-text-muted, #666)' },
  pre: { textAlign: 'left', fontSize: '0.75rem', background: 'rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: 8, overflowX: 'auto', marginBottom: '1rem' },
  actions: { display: 'flex', gap: '0.75rem', justifyContent: 'center' },
  btn: { padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: 'var(--color-primary, #2563eb)', color: '#fff', cursor: 'pointer' },
  btnSecondary: { padding: '0.5rem 1.25rem', borderRadius: 8, border: '1px solid var(--color-border, #e2e2e2)', background: 'transparent', cursor: 'pointer' },
};
