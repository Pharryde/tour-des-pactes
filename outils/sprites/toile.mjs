// outils/sprites/toile.mjs
// Boîte à outils de dessin pixel pour les générateurs de feuilles de sprites de ce dossier :
// une toile RGBA en mémoire, quelques primitives géométriques, une passe de contour automatique
// et un encodeur PNG. Aucune dépendance npm — `zlib` vient de Node, et le format PNG se réduit
// à trois blocs (IHDR/IDAT/IEND) ; ajouter une bibliothèque d'images pour ça exposerait le projet
// à la corruption de `node_modules` documentée dans CLAUDE.md pour un gain nul.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// --- Toile ---------------------------------------------------------------------------------

export function creerToile(largeur, hauteur) {
    return { largeur, hauteur, donnees: new Uint8Array(largeur * hauteur * 4) };
}

export function copierToile(toile) {
    return { largeur: toile.largeur, hauteur: toile.hauteur, donnees: Uint8Array.from(toile.donnees) };
}

export function lire(toile, x, y) {
    if (x < 0 || y < 0 || x >= toile.largeur || y >= toile.hauteur) return [0, 0, 0, 0];
    const i = (y * toile.largeur + x) * 4;
    return [toile.donnees[i], toile.donnees[i + 1], toile.donnees[i + 2], toile.donnees[i + 3]];
}

// Composition « source-over » : indispensable pour les halos et les particules, qui sont posés
// en semi-transparent par-dessus le corps déjà dessiné.
export function poser(toile, x, y, couleur) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= toile.largeur || y >= toile.hauteur) return;
    const i = (y * toile.largeur + x) * 4;
    const [r, v, b, a = 255] = couleur;
    if (a <= 0) return;
    if (a >= 255) {
        toile.donnees[i] = r; toile.donnees[i + 1] = v; toile.donnees[i + 2] = b; toile.donnees[i + 3] = 255;
        return;
    }
    const as = a / 255, ad = toile.donnees[i + 3] / 255;
    const af = as + ad * (1 - as);
    if (af <= 0) return;
    toile.donnees[i] = Math.round((r * as + toile.donnees[i] * ad * (1 - as)) / af);
    toile.donnees[i + 1] = Math.round((v * as + toile.donnees[i + 1] * ad * (1 - as)) / af);
    toile.donnees[i + 2] = Math.round((b * as + toile.donnees[i + 2] * ad * (1 - as)) / af);
    toile.donnees[i + 3] = Math.round(af * 255);
}

export function effacer(toile, x, y) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= toile.largeur || y >= toile.hauteur) return;
    const i = (y * toile.largeur + x) * 4;
    toile.donnees[i] = 0; toile.donnees[i + 1] = 0; toile.donnees[i + 2] = 0; toile.donnees[i + 3] = 0;
}

// --- Primitives ----------------------------------------------------------------------------

export function rectangle(toile, x, y, largeur, hauteur, couleur) {
    for (let dy = 0; dy < hauteur; dy++) for (let dx = 0; dx < largeur; dx++) poser(toile, x + dx, y + dy, couleur);
}

// Remplissage par balayage de lignes, échantillonné au CENTRE du pixel (x+0.5, y+0.5) : sans ça
// les polygones à arêtes obliques gagnent ou perdent une colonne selon l'arrondi, et deux formes
// censées être jointives laissent une fente d'un pixel.
export function polygone(toile, points, couleur) {
    const ys = points.map(p => p[1]);
    const yDebut = Math.max(0, Math.floor(Math.min(...ys)));
    const yFin = Math.min(toile.hauteur - 1, Math.ceil(Math.max(...ys)));
    for (let y = yDebut; y <= yFin; y++) {
        const centre = y + 0.5;
        const croisements = [];
        for (let i = 0; i < points.length; i++) {
            const [x1, y1] = points[i];
            const [x2, y2] = points[(i + 1) % points.length];
            if ((y1 <= centre && y2 > centre) || (y2 <= centre && y1 > centre)) {
                croisements.push(x1 + ((centre - y1) / (y2 - y1)) * (x2 - x1));
            }
        }
        croisements.sort((a, b) => a - b);
        for (let i = 0; i + 1 < croisements.length; i += 2) {
            const xDebut = Math.ceil(croisements[i] - 0.5);
            const xFin = Math.ceil(croisements[i + 1] - 0.5) - 1;
            for (let x = xDebut; x <= xFin; x++) poser(toile, x, y, couleur);
        }
    }
}

export function losange(toile, cx, cy, rayonX, rayonY, couleur) {
    polygone(toile, [[cx, cy - rayonY], [cx + rayonX, cy], [cx, cy + rayonY], [cx - rayonX, cy]], couleur);
}

export function disque(toile, cx, cy, rayon, couleur) {
    for (let y = Math.floor(cy - rayon); y <= Math.ceil(cy + rayon); y++) {
        for (let x = Math.floor(cx - rayon); x <= Math.ceil(cx + rayon); x++) {
            const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
            if (dx * dx + dy * dy <= rayon * rayon) poser(toile, x, y, couleur);
        }
    }
}

export function ligne(toile, x1, y1, x2, y2, couleur, epaisseur = 1) {
    const pas = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) || 1;
    for (let i = 0; i <= pas; i++) {
        const x = x1 + ((x2 - x1) * i) / pas;
        const y = y1 + ((y2 - y1) * i) / pas;
        if (epaisseur <= 1) poser(toile, x, y, couleur);
        else disque(toile, x + 0.5, y + 0.5, epaisseur / 2, couleur);
    }
}

// --- Passes globales -----------------------------------------------------------------------

// Cerne la silhouette d'un liseré sombre. C'est cette passe qui donne au sprite le même « air »
// que les packs existants (champignon, chevalier) : dessiner les formes en aplats puis cerner le
// tout, plutôt que de tracer les contours à la main forme par forme.
export function contourer(toile, couleur, seuilAlpha = 24) {
    const cible = copierToile(toile);
    for (let y = 0; y < toile.hauteur; y++) {
        for (let x = 0; x < toile.largeur; x++) {
            if (lire(toile, x, y)[3] > seuilAlpha) continue;
            const voisinPlein =
                lire(toile, x - 1, y)[3] > seuilAlpha || lire(toile, x + 1, y)[3] > seuilAlpha ||
                lire(toile, x, y - 1)[3] > seuilAlpha || lire(toile, x, y + 1)[3] > seuilAlpha;
            if (voisinPlein) poser(cible, x, y, couleur);
        }
    }
    toile.donnees.set(cible.donnees);
}

// Éclaire les pixels situés sur un bord de la silhouette (celui qui « regarde » la source de
// lumière, donnée par dx/dy). Sans ce liseré, un sprite bleu sombre cerné de bleu nuit se fond
// dans le fond sombre de l'arène : c'est lui qui détache la forme, bien plus que le contour.
export function liserer(toile, couleur, dx, dy, force = 1) {
    const source = copierToile(toile);
    for (let y = 0; y < toile.hauteur; y++) {
        for (let x = 0; x < toile.largeur; x++) {
            if (lire(source, x, y)[3] < 250) continue;
            if (lire(source, x + dx, y + dy)[3] >= 250) continue;
            const [r, v, b] = lire(source, x, y);
            poser(toile, x, y, [
                Math.round(r + (couleur[0] - r) * force),
                Math.round(v + (couleur[1] - v) * force),
                Math.round(b + (couleur[2] - b) * force),
                255,
            ]);
        }
    }
}

// Teinte les pixels déjà opaques sans toucher à la silhouette (flash blanc du coup encaissé).
export function teinter(toile, couleur, force) {
    for (let i = 0; i < toile.donnees.length; i += 4) {
        if (toile.donnees[i + 3] === 0) continue;
        toile.donnees[i] = Math.round(toile.donnees[i] + (couleur[0] - toile.donnees[i]) * force);
        toile.donnees[i + 1] = Math.round(toile.donnees[i + 1] + (couleur[1] - toile.donnees[i + 1]) * force);
        toile.donnees[i + 2] = Math.round(toile.donnees[i + 2] + (couleur[2] - toile.donnees[i + 2]) * force);
    }
}

export function attenuer(toile, facteur) {
    for (let i = 3; i < toile.donnees.length; i += 4) toile.donnees[i] = Math.round(toile.donnees[i] * facteur);
}

export function composer(destination, source, dx = 0, dy = 0, alpha = 1) {
    for (let y = 0; y < source.hauteur; y++) {
        for (let x = 0; x < source.largeur; x++) {
            const px = lire(source, x, y);
            if (px[3] === 0) continue;
            poser(destination, x + dx, y + dy, [px[0], px[1], px[2], px[3] * alpha]);
        }
    }
}

// Liste des pixels opaques, sous forme [x, y, r, v, b, a] : sert aux effets qui manipulent la
// matière déjà dessinée (éclatement à la mort, dissolution de l'esquive).
export function extrairePixels(toile) {
    const pixels = [];
    for (let y = 0; y < toile.hauteur; y++) {
        for (let x = 0; x < toile.largeur; x++) {
            const px = lire(toile, x, y);
            if (px[3] > 0) pixels.push([x, y, px[0], px[1], px[2], px[3]]);
        }
    }
    return pixels;
}

// --- Aléatoire reproductible ---------------------------------------------------------------

// Générateur à graine (mulberry32) : deux exécutions du script doivent produire des PNG
// identiques, sinon chaque régénération fait du bruit dans git sans qu'aucun dessin n'ait changé.
export function hasard(graine) {
    let etat = graine >>> 0;
    return () => {
        etat = (etat + 0x6d2b79f5) >>> 0;
        let t = Math.imul(etat ^ (etat >>> 15), 1 | etat);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// --- Feuille de sprites et PNG --------------------------------------------------------------

export function assembler(frames) {
    const feuille = creerToile(frames[0].largeur * frames.length, frames[0].hauteur);
    frames.forEach((frame, i) => composer(feuille, frame, i * frame.largeur, 0));
    return feuille;
}

export function agrandir(toile, facteur) {
    const grande = creerToile(toile.largeur * facteur, toile.hauteur * facteur);
    for (let y = 0; y < toile.hauteur; y++) {
        for (let x = 0; x < toile.largeur; x++) {
            const px = lire(toile, x, y);
            if (px[3] === 0) continue;
            rectangle(grande, x * facteur, y * facteur, facteur, facteur, px);
        }
    }
    return grande;
}

const TABLE_CRC = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(octets) {
    let c = 0xffffffff;
    for (const o of octets) c = TABLE_CRC[(c ^ o) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function bloc(type, donnees) {
    const corps = Buffer.concat([Buffer.from(type, 'latin1'), Buffer.from(donnees)]);
    const longueur = Buffer.alloc(4);
    longueur.writeUInt32BE(donnees.length, 0);
    const somme = Buffer.alloc(4);
    somme.writeUInt32BE(crc32(corps), 0);
    return Buffer.concat([longueur, corps, somme]);
}

export function ecrirePng(chemin, toile) {
    const entete = Buffer.alloc(13);
    entete.writeUInt32BE(toile.largeur, 0);
    entete.writeUInt32BE(toile.hauteur, 4);
    entete[8] = 8;   // 8 bits par canal
    entete[9] = 6;   // RVBA
    // Une ligne PNG = un octet de filtre (0 = aucun) suivi des pixels bruts.
    const brut = Buffer.alloc(toile.hauteur * (1 + toile.largeur * 4));
    for (let y = 0; y < toile.hauteur; y++) {
        const depart = y * (1 + toile.largeur * 4);
        brut[depart] = 0;
        Buffer.from(toile.donnees.buffer, y * toile.largeur * 4, toile.largeur * 4).copy(brut, depart + 1);
    }
    const png = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        bloc('IHDR', entete),
        bloc('IDAT', deflateSync(brut, { level: 9 })),
        bloc('IEND', Buffer.alloc(0)),
    ]);
    mkdirSync(dirname(chemin), { recursive: true });
    writeFileSync(chemin, png);
    return png.length;
}
