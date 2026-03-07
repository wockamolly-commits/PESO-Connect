import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback({ error: this.state.error, retry: this.handleRetry })
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
                        <p className="text-slate-500 text-sm mb-6">
                            An unexpected error occurred. Please try again or return to the home page.
                        </p>
                        {this.state.error && (
                            <p className="text-xs text-red-400 bg-red-50 rounded-lg p-3 mb-6 font-mono break-all">
                                {this.state.error.message}
                            </p>
                        )}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-medium text-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <a
                                href="/"
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm"
                            >
                                <Home className="w-4 h-4" />
                                Home
                            </a>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
