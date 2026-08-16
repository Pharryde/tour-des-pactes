// outils/sprites/souffleImmobile.mjs
// Génère les feuilles de sprites du Gardien de l'Étage du Froid — « Le Souffle Immobile ».
// Sortie : public/sprites/souffle-immobile/*.png, au format imposé par SpriteAnime (80x64 par
// frame, RVBA, frames alignées horizontalement, personnage centré en x et posé sur le bas du
// cadre comme le champignon — voir animationsMonstre.ts).
//
//   node outils/sprites/souffleImmobile.mjs            (écrit les feuilles)
//   node outils/sprites/souffleImmobile.mjs --apercu   (+ planches zoomées dans le dossier temp)
//
// Anatomie : un golem de glace TRAPU — dos voûté en carapace, tête basse projetée en avant, longs
// bras dont les poings touchent le sol, jambes courtes. La masse est en bas et la silhouette est
// plus large que haute ; un colosse dessiné élancé se lit comme un spectre, pas comme un mur.
// Il regarde vers la GAUCHE (l'ennemi occupe la droite de l'arène, cf. CLAUDE.md).
//
// Le dessin est procédural : chaque partie est un polygone en aplat peint sur sa propre couche,
// cernée, puis empilée d'arrière en avant.
import {
    creerToile, copierToile, poser, polygone, disque, ligne, rectangle,
    contourer, liserer, teinter, composer, extrairePixels, hasard, assembler, agrandir, ecrirePng,
} from './toile.mjs';
import { fileURLToPath } from 'node:url';

const LARGEUR = 80;
const HAUTEUR = 64;
const SOL = 62;
const DOSSIER = fileURLToPath(new URL('../../public/sprites/souffle-immobile/', import.meta.url));

// Palette de glace vive : cyan saturé plutôt que bleu acier. Le contour n'est pas noir mais bleu
// nuit — un noir pur sur une créature de glace fait tache à côté de son propre halo.
const P = {
    contour: [8, 26, 46, 255],
    creux: [14, 46, 78, 255],
    ombre: [26, 92, 142, 255],
    base: [45, 150, 205, 255],
    clair: [95, 205, 240, 255],
    vive: [160, 235, 252, 255],
    neige: [232, 251, 255, 255],
    lueur: [140, 250, 255, 255],
};

const dec = (points, dx, dy) => points.map(([x, y]) => [x + dx, y + dy]);

// --- Silhouette --------------------------------------------------------------------------------
// Les jambes sont ancrées au sol et ne suivent PAS `dyHaut` : c'est le buste qui respire, se
// cabre et s'écrase. Une créature dont les pieds montent et descendent avec le torse flotte.

// Jambes séparées par un vrai vide, et pattes avant plantées bien plus à gauche : la lecture du
// golem tient à l'alternance plein/vide bras · air · jambe · air · jambe · air · bras. Sans cet
// air, tout le bas du corps fusionne en une seule masse et la créature n'a plus de membres.
const CUISSE_AVANT = [[34, 45], [41, 45], [40, 57], [35, 57]];
const PIED_AVANT = [[32, 56], [42, 56], [42, SOL], [33, SOL]];
const CUISSE_ARRIERE = [[46, 44], [52, 44], [51, 55], [47, 55]];
const PIED_ARRIERE = [[45, 54], [54, 54], [54, 60], [46, 60]];

// Torse étroit et ventre HAUT : c'est ce qui creuse le vide entre lui et les bras.
const TORSE = [[33, 33], [49, 32], [51, 42], [47, 47], [36, 47], [32, 42]];
const TORSE_CLAIR = [[33, 33], [40, 33], [39, 47], [36, 47], [32, 42]];
const TORSE_OMBRE = [[46, 32], [49, 32], [51, 42], [47, 47], [45, 42]];

// Carapace : l'arc qui fait tout le caractère du golem. Elle passe DERRIÈRE le torse, seul son
// sommet dépasse — c'est ce qui donne le dos voûté.
const CARAPACE = [[29, 33], [33, 22], [42, 17], [51, 21], [57, 31], [54, 42], [48, 37], [40, 31], [32, 35]];
const CARAPACE_CLAIR = [[29, 33], [33, 22], [42, 17], [45, 20], [37, 27], [32, 35]];
const CARAPACE_OMBRE = [[51, 21], [57, 31], [54, 42], [48, 37], [48, 26]];

// Tête portée BAS et très en avant, dégagée de l'épaule : accrochée plus haut, le bras avant lui
// passe en travers du visage et la créature perd son point de lecture principal.
const TETE = [[14, 34], [20, 26], [29, 26], [32, 32], [30, 39], [20, 40]];
const TETE_CLAIR = [[14, 34], [20, 26], [25, 26], [24, 35], [17, 37]];
const MACHOIRE = [[14, 35], [23, 34], [22, 39], [16, 38]];
const CORNE = [[26, 27], [29, 19], [38, 14], [40, 17], [32, 23], [28, 29]];

const EPAULE_AVANT = [36, 36];
const EPAULE_ARRIERE = [50, 36];
const BRAS_ARRIERE_REPOS = { coude: [59, 44], poing: [60, 54] };
const BRAS_AVANT_REPOS = { coude: [25, 45], poing: [21, 56] };

// Poing massif : le bout d'un bras de golem n'est pas une main mais un bloc. Les coins sont
// rognés pour éviter le carré parfait, qui se lit comme un décor et non comme une partie du corps.
function poing(c, x, y, couleurBase, couleurClair) {
    polygone(c, [[x - 5, y - 3], [x - 2, y - 6], [x + 3, y - 5], [x + 6, y], [x + 5, y + 5], [x - 3, y + 6], [x - 6, y + 2]], couleurBase);
    polygone(c, [[x - 5, y - 3], [x - 2, y - 6], [x + 1, y - 5], [x, y + 1], [x - 6, y + 1]], couleurClair);
}

// L'avant-bras est nettement plus épais que le haut du bras : cet écart de largeur suffit à faire
// lire un coude, là où un membre d'épaisseur constante n'est qu'un tuyau.
function dessinerBras(c, epaule, coude, main, teintes) {
    ligne(c, epaule[0], epaule[1], coude[0], coude[1], teintes.base, 5);
    ligne(c, coude[0], coude[1], main[0], main[1], teintes.base, 8);
    // Bande claire sur l'avant-bras : segmente le membre, comme les plaques de la référence.
    ligne(c, coude[0] - 2, coude[1], main[0] - 2, main[1], teintes.clair, 3);
    poing(c, main[0], main[1], teintes.base, teintes.clair);
}

function dessinerCorps(toile, o = {}) {
    const dx = o.dx ?? 0;
    const dyH = o.dyHaut ?? 0;
    const bas = (points) => dec(points, dx, 0);
    const haut = (points) => dec(points, dx, dyH);
    const pt = ([x, y]) => [x + dx, y + dyH];

    // Le bras avant est peint PLUS CLAIR que le torse et le bras arrière plus sombre : à silhouettes
    // qui se touchent, seul l'écart de valeur dit encore où finit un membre.
    const sombre = { base: P.creux, clair: P.ombre };
    const clair = { base: P.clair, clair: P.vive };

    // 1. Jambe arrière et bras arrière : plan éloigné, en teintes sombres.
    composer(toile, couche((c) => {
        polygone(c, bas(CUISSE_ARRIERE), P.ombre);
        polygone(c, bas(PIED_ARRIERE), P.ombre);
    }));
    const brasArriere = o.brasArriere ?? BRAS_ARRIERE_REPOS;
    composer(toile, couche((c) => dessinerBras(c, pt(EPAULE_ARRIERE), pt(brasArriere.coude), pt(brasArriere.poing), sombre)));

    // 2. Carapace.
    composer(toile, couche((c) => {
        polygone(c, haut(CARAPACE), P.base);
        polygone(c, haut(CARAPACE_CLAIR), P.clair);
        polygone(c, haut(CARAPACE_OMBRE), P.ombre);
        // Nervures : trois arêtes qui suivent l'arc. Sans elles la carapace est une tache unie.
        for (const [x1, y1, x2, y2] of [[32, 26, 37, 31], [40, 19, 43, 30], [49, 22, 50, 33]]) {
            ligne(c, x1 + dx, y1 + dyH, x2 + dx, y2 + dyH, P.vive);
            ligne(c, x1 + 1 + dx, y1 + dyH, x2 + 1 + dx, y2 + dyH, P.creux);
        }
    }));

    // 3. Torse, avec le cœur gelé encastré entre les plaques.
    composer(toile, couche((c) => {
        polygone(c, haut(TORSE), P.base);
        polygone(c, haut(TORSE_CLAIR), P.clair);
        polygone(c, haut(TORSE_OMBRE), P.ombre);
        ligne(c, 34 + dx, 40 + dyH, 49 + dx, 39 + dyH, P.creux);
        ligne(c, 34 + dx, 41 + dyH, 49 + dx, 40 + dyH, P.vive);
    }));

    // 4. Jambe avant.
    composer(toile, couche((c) => {
        polygone(c, bas(CUISSE_AVANT), P.base);
        polygone(c, bas([[34, 45], [38, 45], [37, 57], [35, 57]]), P.clair);
        polygone(c, bas(PIED_AVANT), P.base);
        polygone(c, bas([[32, 56], [37, 56], [36, SOL], [33, SOL]]), P.clair);
    }));

    // 5. Tête, basse et projetée en avant.
    composer(toile, couche((c) => {
        polygone(c, haut(TETE), P.base);
        polygone(c, haut(TETE_CLAIR), P.clair);
        polygone(c, haut(MACHOIRE), P.creux);
        // Corne en teinte de base, pas claire : au même ton que le haut du crâne elle se soude à la
        // carapace derrière et le cou disparaît.
        polygone(c, haut(CORNE), P.base);
        polygone(c, haut([[26, 27], [29, 19], [34, 16], [30, 24]]), P.clair);
        // Orbite creusée : l'œil ne brille que s'il est posé dans du sombre.
        polygone(c, haut([[18, 29], [26, 29], [25, 33], [18, 33]]), P.creux);
    }));

    // 6. Bras avant : c'est lui qui porte toutes les poses.
    const brasAvant = o.bras ?? BRAS_AVANT_REPOS;
    composer(toile, couche((c) => dessinerBras(c, pt(EPAULE_AVANT), pt(brasAvant.coude), pt(brasAvant.poing), clair)));

    // 7. Lueurs, posées en dernier pour qu'aucun cerne ne les entoure.
    const lueur = o.lueur ?? 1;
    if (lueur > 0) {
        const [cx, cy] = pt([41, 39]);
        disque(toile, cx, cy, 4, [...P.lueur.slice(0, 3), 60 * lueur]);
        disque(toile, cx, cy, 2, [...P.lueur.slice(0, 3), 190 * lueur]);
    }
    if ((o.yeux ?? 1) > 0) {
        const a = 255 * (o.yeux ?? 1);
        const [ex, ey] = pt([19, 30]);
        rectangle(toile, ex, ey, 4, 2, [...P.lueur.slice(0, 3), a]);
        rectangle(toile, ex + 1, ey + 2, 2, 1, [...P.vive.slice(0, 3), a * 0.6]);
    }
}

// Chaque partie est peinte sur sa propre couche, cernée, puis empilée. C'est ce qui pose une ligne
// sombre LÀ OÙ deux parties se chevauchent (bras sur torse, tête sur carapace) : cernée en une
// seule passe, la créature redevient une tache bleue uniforme.
function couche(dessin) {
    const c = creerToile(LARGEUR, HAUTEUR);
    dessin(c);
    contourer(c, P.contour);
    return c;
}

// Liseré lumineux côté haut-gauche (source de lumière), puis contour : c'est cette paire qui
// détache la silhouette du fond sombre de l'arène.
function finaliser(corps) {
    liserer(corps, P.neige, -1, -1, 0.45);
    contourer(corps, P.contour);
}

// --- Décor et particules -------------------------------------------------------------------------

function brume(toile, phase, graine) {
    const rnd = hasard(graine);
    for (let i = 0; i < 16; i++) {
        const base = rnd();
        const largeur = 4 + Math.floor(rnd() * 8);
        const x = 16 + Math.floor(rnd() * 46);
        const y = 56 + Math.floor(rnd() * 7);
        const souffle = Math.sin((phase + base) * Math.PI * 2);
        rectangle(toile, x + Math.round(souffle * 2), y, largeur, 1, [...P.vive.slice(0, 3), 40 + 55 * (0.5 + 0.5 * souffle)]);
    }
}

function flocons(toile, phase, graine, densite = 10) {
    const rnd = hasard(graine);
    for (let i = 0; i < densite; i++) {
        const x0 = rnd() * LARGEUR;
        const y0 = rnd() * HAUTEUR;
        const vitesse = 0.4 + rnd() * 0.8;
        const x = (x0 + Math.sin((phase + i) * Math.PI * 2) * 3 + LARGEUR) % LARGEUR;
        const y = (y0 + phase * 18 * vitesse) % HAUTEUR;
        poser(toile, x, y, [...P.neige.slice(0, 3), 90 + rnd() * 90]);
    }
}

// Le contour se pose sur le corps SEUL : passer la brume et les flocons dans la même passe les
// cernerait aussi, et une particule d'un pixel deviendrait un petit bloc noir.
function frame(dessinCorps, dessinFond, dessinDevant) {
    const fond = creerToile(LARGEUR, HAUTEUR);
    if (dessinFond) dessinFond(fond);

    const corps = creerToile(LARGEUR, HAUTEUR);
    dessinCorps(corps);
    finaliser(corps);

    composer(fond, corps);
    if (dessinDevant) dessinDevant(fond);
    return fond;
}

// --- Animations ------------------------------------------------------------------------------

// Respiration : la carapace se soulève, les poings restent plantés. Un golem ne flotte pas, il
// pèse — d'où une amplitude d'un seul pixel et des appuis qui ne bougent jamais.
function animationRepos() {
    const nb = 8;
    return Array.from({ length: nb }, (_, i) => {
        const phase = i / nb;
        const dyHaut = Math.round(Math.sin(phase * Math.PI * 2) * 1.4) - 1;
        const pulse = 0.55 + 0.45 * Math.sin(phase * Math.PI * 2 + 1);
        return frame(
            (t) => dessinerCorps(t, { dyHaut, lueur: pulse }),
            (t) => brume(t, phase, 7),
            (t) => flocons(t, phase, 21, 8),
        );
    });
}

// L'attaque du Froid : le golem se ramasse, se cabre en levant son poing au-dessus de la tête,
// puis l'abat au sol — l'impact fait jaillir des pointes de glace vers la cible (à gauche).
function animationAttaque() {
    const poses = [
        { dyHaut: 2, bras: { coude: [26, 44], poing: [24, 55] }, pointes: 0 },
        { dyHaut: -4, bras: { coude: [26, 27], poing: [24, 17] }, charge: true, pointes: 0 },
        { dyHaut: 1, bras: { coude: [22, 41], poing: [17, 52] }, pointes: 0 },
        { dyHaut: 3, bras: { coude: [21, 45], poing: [15, 57] }, impact: true, pointes: 0.5 },
        { dyHaut: 2, bras: { coude: [21, 45], poing: [16, 56] }, pointes: 1 },
        { dyHaut: 0, bras: BRAS_AVANT_REPOS, pointes: 0.5 },
    ];
    return poses.map((pose, i) => frame(
        (t) => dessinerCorps(t, { ...pose, lueur: pose.pointes > 0 ? 1 : 0.7 }),
        (t) => brume(t, i / poses.length, 7),
        (t) => {
            // Orbe de givre au poing levé : dit que le coup se charge.
            if (pose.charge) {
                const [gx, gy] = pose.bras.poing;
                disque(t, gx, gy - 6, 6, [...P.lueur.slice(0, 3), 70]);
                disque(t, gx, gy - 6, 3.5, [...P.vive.slice(0, 3), 200]);
                disque(t, gx, gy - 6, 1.5, P.neige);
            }
            // Onde de choc au sol : sans elle, le poing s'arrête sans qu'on sente le poids.
            if (pose.impact) {
                rectangle(t, 6, SOL - 1, 26, 1, [...P.neige.slice(0, 3), 210]);
                rectangle(t, 3, SOL, 32, 1, [...P.vive.slice(0, 3), 140]);
            }
            if (pose.pointes > 0) pointesDeGlace(t, pose.pointes);
            flocons(t, i / poses.length, 21, 10);
        },
    ));
}

// Pointes surgissant du sol vers la cible (à gauche du cadre). Elles sont cernées à part : ce
// sont des objets distincts du Gardien, elles ont droit à leur propre silhouette.
function pointesDeGlace(toile, avancement) {
    const pointes = [{ x: 18, hauteur: 24 }, { x: 11, hauteur: 32 }, { x: 4, hauteur: 19 }];
    const couche = creerToile(LARGEUR, HAUTEUR);
    for (const p of pointes) {
        const h = Math.round(p.hauteur * avancement);
        if (h < 3) continue;
        const largeur = Math.max(2, Math.round(h / 5));
        polygone(couche, [[p.x, SOL], [p.x + largeur * 2, SOL], [p.x + largeur + 1, SOL - h]], P.base);
        polygone(couche, [[p.x, SOL], [p.x + largeur, SOL], [p.x + largeur + 1, SOL - h]], P.vive);
    }
    contourer(couche, P.contour);
    composer(toile, couche);
}

function animationCoup() {
    const poses = [
        { dx: 4, dyHaut: -2, flash: 0.85, lueur: 1.4 },
        { dx: 5, dyHaut: 1, flash: 0.45, lueur: 0.6 },
        { dx: 3, dyHaut: 2, flash: 0.15, lueur: 0.5 },
        { dx: 1, dyHaut: 0, flash: 0, lueur: 0.8 },
    ];
    return poses.map((pose, i) => {
        const corps = creerToile(LARGEUR, HAUTEUR);
        dessinerCorps(corps, { dx: pose.dx, dyHaut: pose.dyHaut, lueur: pose.lueur });
        if (i >= 1) fissures(corps, pose.dx, pose.dyHaut);
        finaliser(corps);
        if (pose.flash > 0) teinter(corps, P.neige, pose.flash);

        const toile = creerToile(LARGEUR, HAUTEUR);
        brume(toile, i / 4, 7);
        composer(toile, corps);
        eclatsProjetes(toile, i);
        return toile;
    });
}

function fissures(toile, dx, dy) {
    ligne(toile, 40 + dx, 35 + dy, 37 + dx, 44 + dy, P.creux);
    ligne(toile, 37 + dx, 44 + dy, 44 + dx, 48 + dy, P.creux);
    ligne(toile, 45 + dx, 22 + dy, 48 + dx, 32 + dy, P.creux);
    ligne(toile, 24 + dx, 31 + dy, 29 + dx, 37 + dy, P.creux);
}

function eclatsProjetes(toile, etape) {
    const rnd = hasard(404);
    for (let i = 0; i < 8; i++) {
        const angle = Math.PI * (0.15 + rnd() * 0.7);
        const distance = 4 + etape * (3 + rnd() * 4);
        const x = 38 - Math.cos(angle) * distance;
        const y = 40 - Math.sin(angle) * distance + etape * etape * 0.7;
        polygone(toile, [[x, y - 2], [x + 1, y], [x, y + 2], [x - 1, y]], [...P.vive.slice(0, 3), Math.max(0, 255 - etape * 55)]);
    }
}

// Mort : le golem se fend, puis se brise en morceaux qui retombent. Les éclats sont découpés dans
// la silhouette RÉELLE (partition de Voronoï sur les pixels déjà dessinés) — des débris génériques
// donneraient des morceaux qui n'ont jamais fait partie du corps.
function animationMort() {
    const nb = 12;
    const intact = creerToile(LARGEUR, HAUTEUR);
    dessinerCorps(intact, { lueur: 0.8 });
    fissures(intact, 0, 0);
    finaliser(intact);

    const pixels = extrairePixels(intact);
    const rnd = hasard(1607);
    const germes = Array.from({ length: 18 }, () => {
        const p = pixels[Math.floor(rnd() * pixels.length)];
        return { x: p[0], y: p[1], vx: 0, vy: 0 };
    });
    for (const g of germes) {
        g.vx = (g.x - 40) * 0.11 + (rnd() - 0.5) * 1.2;
        g.vy = -1.3 - rnd() * 1.5;
    }
    const morceaux = germes.map(() => []);
    for (const px of pixels) {
        let meilleur = 0, distanceMin = Infinity;
        germes.forEach((g, i) => {
            const d = (g.x - px[0]) ** 2 + (g.y - px[1]) ** 2;
            if (d < distanceMin) { distanceMin = d; meilleur = i; }
        });
        morceaux[meilleur].push(px);
    }

    return Array.from({ length: nb }, (_, i) => {
        const toile = creerToile(LARGEUR, HAUTEUR);
        if (i === 0) { composer(toile, intact); return toile; }
        if (i === 1) {
            const flash = copierToile(intact);
            teinter(flash, P.neige, 0.8);
            composer(toile, flash);
            return toile;
        }
        const temps = i - 1;
        const alpha = Math.max(0, 1 - temps / (nb - 2.5));
        germes.forEach((g, index) => {
            const ddx = g.vx * temps;
            const ddy = g.vy * temps + 0.34 * temps * temps;
            const rotation = Math.sin(index + temps * 0.5) * 0.6;
            for (const [x, y, r, v, b, a] of morceaux[index]) {
                const ox = x - g.x, oy = y - g.y;
                const px = g.x + ddx + ox * Math.cos(rotation) - oy * Math.sin(rotation);
                const py = Math.min(63, g.y + ddy + ox * Math.sin(rotation) + oy * Math.cos(rotation));
                poser(toile, px, py, [r, v, b, a * alpha]);
            }
        });
        brume(toile, temps / nb, 7);
        return toile;
    });
}

// Esquive : un pas d'esquive lourd vers l'arrière, avec rémanence. Une masse pareille ne bondit
// pas et ne se téléporte pas — c'est l'appui qui glisse, et la traînée de givre qui dit la vitesse.
function animationEsquive() {
    const decalages = [0, 3, 7, 10, 10, 7, 3, 0];
    return decalages.map((dx, i) => {
        const dxPrecedent = decalages[Math.max(0, i - 1)];
        const toile = creerToile(LARGEUR, HAUTEUR);
        brume(toile, i / decalages.length, 7);

        // Rémanence : le corps de la frame précédente, blanchi et transparent.
        if (dx !== dxPrecedent) {
            const fantome = creerToile(LARGEUR, HAUTEUR);
            dessinerCorps(fantome, { dx: dxPrecedent, dyHaut: 1 });
            finaliser(fantome);
            teinter(fantome, P.vive, 0.75);
            composer(toile, fantome, 0, 0, 0.3);
        }

        const corps = creerToile(LARGEUR, HAUTEUR);
        dessinerCorps(corps, { dx, dyHaut: dx > 0 ? 1 : 0, lueur: 1 });
        finaliser(corps);
        composer(toile, corps);

        // Poudreuse soulevée par l'appui.
        if (dx > 0) {
            const rnd = hasard(555);
            for (let k = 0; k < 18; k++) {
                const x = 18 + rnd() * 22 - dx * 0.5;
                const y = SOL - rnd() * 12 * (dx / 10);
                disque(toile, x, y, rnd() < 0.3 ? 1.4 : 0.7, [...P.vive.slice(0, 3), 150 * (dx / 10)]);
            }
        }
        return toile;
    });
}

// --- Sortie ---------------------------------------------------------------------------------

const FEUILLES = {
    'idle.png': animationRepos(),
    'attack.png': animationAttaque(),
    'hit.png': animationCoup(),
    'die.png': animationMort(),
    'dodge.png': animationEsquive(),
};

for (const [nom, frames] of Object.entries(FEUILLES)) {
    const feuille = assembler(frames);
    const octets = ecrirePng(DOSSIER + nom, feuille);
    console.log(`${nom.padEnd(11)} ${frames.length} frames  ${feuille.largeur}x${feuille.hauteur}  ${(octets / 1024).toFixed(1)} Ko`);
}

if (process.argv.includes('--apercu')) {
    const tempo = process.env.TEMP?.replace(/\\/g, '/') ?? '.';
    const surFond = (planche, damier) => {
        const fond = creerToile(planche.largeur, planche.hauteur);
        for (let y = 0; y < fond.hauteur; y++) {
            for (let x = 0; x < fond.largeur; x++) {
                const case_ = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
                poser(fond, x, y, damier && case_ ? [26, 30, 42, 255] : [34, 39, 54, 255]);
            }
        }
        composer(fond, planche);
        return fond;
    };
    for (const [nom, frames] of Object.entries(FEUILLES)) {
        ecrirePng(`${tempo}/apercu-${nom}`, surFond(agrandir(assembler(frames), 4), true));
    }
    ecrirePng(`${tempo}/apercu-gros-plan.png`, surFond(agrandir(animationRepos()[0], 8), false));
    // Planche à l'échelle RÉELLE du combat (--sprite-echelle: 2) : c'est le seul aperçu qui dit si
    // le sprite se lit en jeu. Un détail net à x8 peut n'être qu'un pixel gris à x2.
    ecrirePng(`${tempo}/apercu-echelle-jeu.png`, surFond(agrandir(assembler(animationRepos()), 2), false));
    console.log(`Aperçus écrits dans ${tempo}`);
}
