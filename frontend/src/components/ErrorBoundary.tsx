import { Component, ReactNode } from "react";

// If any screen fails to render, show a way out instead of a blank page.
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  componentDidCatch(error: unknown) {
    console.error("AutoFlow screen error:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-[50vh] place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-3xl font-bold">This screen hit a problem</h1>
          <p className="mt-2 text-mute">Reloading usually fixes it. Your data is safe.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex h-11 items-center rounded-full bg-pink px-6 font-semibold text-ink-950">
            Reload
          </button>
        </div>
      </div>
    );
  }
}
