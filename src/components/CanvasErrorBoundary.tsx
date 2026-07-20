import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="text-sm font-medium text-destructive">Canvas Error</div>
          <pre className="max-w-md whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {this.state.errorMessage}
          </pre>
          <button
            className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90"
            onClick={this.handleReset}
          >
            Reset
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
