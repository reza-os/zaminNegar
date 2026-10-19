import * as React from 'react';

type Props = {
  children: React.ReactNode;
  name: string;
  fallback: React.ReactNode;
};

type State = { hasError: boolean };

/** Isolate third-party and lazy-loaded sections so a failure cannot blank the entire SPA. */
export default class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep the real diagnostic visible in DevTools, without exposing it to customers.
    console.error(`[${this.props.name}] Failed to render:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
