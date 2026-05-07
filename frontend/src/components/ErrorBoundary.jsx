import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
          <h2>Something went wrong.</h2>
          <p>We apologize for the inconvenience. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '20px' }}
          >
            Reload Page
          </button>
          {import.meta.env.DEV && (
            <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px', textAlign: 'left', background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo?.componentStack}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
