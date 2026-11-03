import { Component, type ReactNode } from 'react';
import { LoadingScreen } from './LoadingScreen';

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <LoadingScreen error="A interface não pôde ser carregada." onRetry={() => location.reload()} /> : this.props.children;
  }
}
