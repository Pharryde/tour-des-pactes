import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        errorMsg: ''
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMsg: error.message };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Erreur critique capturée par ErrorBoundary:", error, errorInfo);
    }

    private handleHardReset = () => {
        // Purge totale des sauvegardes en cas de corruption irrécupérable
        Object.keys(window.localStorage).forEach(key => {
            if (key.startsWith('tdp_')) {
                window.localStorage.removeItem(key);
            }
        });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="crash-ecran">
                    <h1 className="crash-titre">⚠️ Crash Système</h1>
                    <p className="crash-message">Une erreur critique s'est produite dans l'interface.</p>

                    <div className="crash-details">
                        {this.state.errorMsg}
                    </div>

                    <button onClick={this.handleHardReset} className="btn-crash-reset">
                        🔄 Effacer les sauvegardes et redémarrer
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
