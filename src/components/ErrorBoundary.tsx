import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[140px] p-6 text-center rounded-2xl bg-[var(--surface-container-high)] text-[var(--fg)] border border-[var(--outline)]/20">
          <p className="text-sm font-medium mb-3 opacity-90">Произошла ошибка при отображении виджета</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-1.5 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-semibold hover:opacity-90 transition active:scale-95"
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
