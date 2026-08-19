// src/components/SuccesCelebration.tsx
// Feu d'artifice célébrant UN succès fraîchement décroché, à la sortie d'un combat. Les succès
// s'acquittent un par un : les décrocher en bloc (fin d'étage, fin de run) en afficherait sinon
// cinq d'un coup, et aucun ne serait lu.
//
// ⚠️ Overlay et non `Ecran` à part : le combat vient de se terminer et le flux d'écrans continue
// derrière (Zone de Repos, arrachage de Pacte, écran de fin…). Le détourner ferait perdre cette
// suite, alors que la célébration n'est qu'une couche par-dessus.
import { SUCCES_PAR_ID } from '../utils/succes';

interface Props {
    id: string;
    // Nombre de succès encore en file, celui-ci compris : sans ce repère, on ne sait pas si le
    // bouton conclut ou s'il en reste quatre derrière.
    restants: number;
    onContinuer: () => void;
}

// Position et teinte de chaque gerbe. Codées en dur plutôt que tirées au hasard : une explosion
// reproductible se règle à l'œil, et le rendu ne change pas d'un affichage à l'autre.
const GERBES = [
    { x: '18%', y: '26%', teinte: '#f9e2af', delai: '0s' },
    { x: '80%', y: '20%', teinte: '#f38ba8', delai: '0.35s' },
    { x: '32%', y: '72%', teinte: '#a6e3a1', delai: '0.7s' },
    { x: '68%', y: '66%', teinte: '#89b4fa', delai: '1.05s' },
    { x: '50%', y: '12%', teinte: '#cba6f7', delai: '1.4s' },
];

// Une gerbe = 12 éclats partant du même point. L'angle est porté par une variable CSS, l'animation
// se charge de la distance : douze règles distinctes seraient illisibles pour le même résultat.
const ECLATS_PAR_GERBE = 12;

export function SuccesCelebration({ id, restants, onContinuer }: Props) {
    const succes = SUCCES_PAR_ID[id];
    if (!succes) return null;

    return (
        <div className="succes-celebration" role="dialog" aria-modal="true">
            <div className="succes-feu-artifice" aria-hidden="true">
                {GERBES.map((gerbe, i) => (
                    <div
                        key={i}
                        className="succes-gerbe"
                        style={{ left: gerbe.x, top: gerbe.y, animationDelay: gerbe.delai }}
                    >
                        {Array.from({ length: ECLATS_PAR_GERBE }, (_, j) => (
                            <span
                                key={j}
                                className="succes-eclat"
                                style={{
                                    '--angle': `${(360 / ECLATS_PAR_GERBE) * j}deg`,
                                    backgroundColor: gerbe.teinte,
                                    animationDelay: gerbe.delai,
                                } as React.CSSProperties}
                            />
                        ))}
                    </div>
                ))}
            </div>

            <div className="succes-celebration-carte">
                <span className="succes-celebration-bandeau">🏅 Succès débloqué</span>
                <h2 className="succes-celebration-titre">{succes.titre}</h2>
                <p className="succes-celebration-desc">{succes.description}</p>

                {restants > 1 && (
                    <span className="succes-celebration-restants">
                        + {restants - 1} autre{restants > 2 ? 's' : ''} à découvrir
                    </span>
                )}

                <button className="btn-menu btn-jouer" onClick={onContinuer}>
                    {restants > 1 ? 'Suivant' : 'Continuer'}
                </button>
            </div>
        </div>
    );
}
