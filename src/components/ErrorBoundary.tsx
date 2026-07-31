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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#11111b', color: '#cdd6f4', padding: '20px' }}>
                    <h1 style={{ color: '#f38ba8', fontSize: '2em', marginBottom: '10px' }}>⚠️ Crash Système</h1>
                    <p style={{ marginBottom: '20px', textAlign: 'center' }}>Une erreur critique s'est produite dans l'interface.</p>
                    
                    <div style={{ background: '#181825', border: '1px solid #313244', padding: '15px', borderRadius: '8px', marginBottom: '30px', color: '#f38ba8', fontFamily: 'monospace', maxWidth: '800px', wordWrap: 'break-word' }}>
                        {this.state.errorMsg}
                    </div>

                    <button 
                        onClick={this.handleHardReset}
                        style={{ padding: '15px 30px', fontSize: '1.2em', backgroundColor: '#f38ba8', color: '#11111b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        🔄 Effacer les sauvegardes et redémarrer
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}