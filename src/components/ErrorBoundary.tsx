import { Component, type ErrorInfo, type ReactNode } from 'react'

type State = { error: Error | null }

/** Shows a readable message instead of a blank page if the app crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Continua Lab crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return <StartupError message={this.state.error.message} />
  }
}

export function StartupError({ message }: { message: string }) {
  return (
    <div className="px-[4%] py-24">
      <p className="text-[11px] uppercase tracking-[0.16em] text-cherry">● The studio couldn't open</p>
      <h1 className="mt-4 font-display text-[clamp(36px,6vw,72px)] font-normal leading-none">
        Something is missing<span className="text-cherry">.</span>
      </h1>
      <p className="mt-6 max-w-[60ch] text-[17px] leading-relaxed">{message}</p>
    </div>
  )
}
