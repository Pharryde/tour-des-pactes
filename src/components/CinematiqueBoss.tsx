interface Props {
    titre: string;
    imageSrc: string;
    onContinuer: () => void;
}

export function CinematiqueBoss({ titre, imageSrc, onContinuer }: Props) {
    return (
        <div className="ecran" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#11111b', color: '#cdd6f4', padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: '#f38ba8', fontSize: '2em', marginBottom: '30px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                {titre}
            </h1>
            
            <div style={{ width: '100%', maxWidth: '800px', height: '400px', backgroundColor: '#181825', border: '2px solid #313244', borderRadius: '12px', overflow: 'hidden', marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <img 
                    src={imageSrc} 
                    alt={titre} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => { 
                        e.currentTarget.style.display = 'none'; 
                        const parent = e.currentTarget.parentElement;
                        if (parent && !parent.querySelector('.error-msg')) {
                            const span = document.createElement('span');
                            span.className = 'error-msg';
                            span.style.color = '#6c7086';
                            span.innerHTML = `(Image introuvable : Placez <b>${imageSrc.split('/').pop()}</b> dans le dossier public/images/)`;
                            parent.appendChild(span);
                        }
                    }} 
                />
            </div>

            <button 
                onClick={onContinuer}
                className="btn-action"
                style={{ padding: '15px 40px', fontSize: '1.2em', backgroundColor: '#f38ba8', color: '#11111b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
                ⚔️ Entrer dans l'Arène
            </button>
        </div>
    );
}