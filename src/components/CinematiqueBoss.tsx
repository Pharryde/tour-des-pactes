interface Props {
    titre: string;
    imageSrc: string;
    onContinuer: () => void;
}

export function CinematiqueBoss({ titre, imageSrc, onContinuer }: Props) {
    return (
        <div className="ecran cinematique-ecran">
            <h1 className="cinematique-titre">{titre}</h1>

            <div className="cinematique-image-frame">
                <img
                    src={imageSrc}
                    alt={titre}
                    className="cinematique-image"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent && !parent.querySelector('.cinematique-erreur-image')) {
                            const span = document.createElement('span');
                            span.className = 'cinematique-erreur-image';
                            span.innerHTML = `(Image introuvable : Placez <b>${imageSrc.split('/').pop()}</b> dans le dossier public/images/)`;
                            parent.appendChild(span);
                        }
                    }}
                />
            </div>

            <button
                onClick={onContinuer}
                className="btn-cinematique"
            >
                ⚔️ Entrer dans l'Arène
            </button>
        </div>
    );
}
