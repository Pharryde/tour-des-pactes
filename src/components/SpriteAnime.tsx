import { useEffect, useState } from 'react';
import type { DefinitionAnimation } from '../utils/animations';

interface Props {
    definition: DefinitionAnimation;
    miroir?: boolean;
}

const DUREE_FRAME_MS = 90;

export function SpriteAnime({ definition, miroir = false }: Props) {
    const debut = definition.frameDebut ?? 0;
    const fin = definition.frameFin ?? definition.frames - 1;
    const [frame, setFrame] = useState(debut);

    useEffect(() => {
        const id = setInterval(() => {
            setFrame(f => {
                if (f + 1 > fin) {
                    if (definition.bouclage) return debut;
                    clearInterval(id);
                    return fin;
                }
                return f + 1;
            });
        }, DUREE_FRAME_MS);
        return () => clearInterval(id);
    }, [definition.fichier, definition.frames, definition.bouclage, debut, fin]);

    return (
        <div
            className="sprite-anime"
            style={{
                '--sprite-fichier': `url(${definition.fichier})`,
                '--sprite-frames': definition.frames,
                '--sprite-largeur-frame': `${definition.largeurFrame}px`,
                '--sprite-hauteur-frame': `${definition.hauteurFrame}px`,
                '--sprite-frame-index': frame,
                transform: miroir ? 'scaleX(-1)' : undefined,
            } as React.CSSProperties}
        />
    );
}
