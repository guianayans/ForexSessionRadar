import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Erro inesperado no frontend.'
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro de renderizacao capturado no ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-2xl rounded-xl border border-danger/60 bg-black/60 p-4 text-sm text-slate-100">
            <h2 className="mb-2 text-base font-semibold text-danger">Falha no frontend</h2>
            <p className="mb-2">Ocorreu um erro de runtime na interface.</p>
            <pre className="overflow-auto rounded bg-black/50 p-2 text-xs text-danger">{this.state.errorMessage}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
