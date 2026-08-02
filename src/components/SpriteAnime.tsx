import { useEffect, useState } from 'react';
import type { DefinitionAnimation } from '../utils/animations';

interface Props {
    definition: DefinitionAnimation;
    miroir?: boolean;
}

const DUREE_FRAME_MS = 90;

export function SpriteAnime({ definition, miroir = false }: Props) {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setFrame(f => {
                if (f + 1 >= definition.frames) {
                    if (definition.bouclage) return 0;
                    clearInterval(id);
                    return definition.frames - 1;
                }
                return f + 1;
            });
        }, DUREE_FRAME_MS);
        return () => clearInterval(id);
    }, [definition.fichier, definition.frames, definition.bouclage]);

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
