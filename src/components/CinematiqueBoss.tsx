import { ImageCinematique } from './ImageCinematique';

interface Props {
    titre: string;
    // Illustrations candidates, de la plus spécifique à la plus générale (voir imagesCinematique).
    images: string[];
    onContinuer: () => void;
}

export function CinematiqueBoss({ titre, images, onContinuer }: Props) {
    return (
        <div className="ecran cinematique-ecran">
            {/* Le nom du Gardien porte DÉJÀ sa forme, préfixée par le moteur (« FORME FINALE: … ») :
                un sous-titre « Forme Finale » ne ferait que la redire deux lignes plus bas. */}
            <h1 className="cinematique-titre">{titre}</h1>

            <div className="cinematique-image-frame">
                <ImageCinematique candidates={images} alt={titre} className="cinematique-image" />
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
