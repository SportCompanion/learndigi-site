// Envoi de la newsletter « L'IA du courtier » via Brevo, depuis learndigi.fr.
//
// Pourquoi cette fonction existe : la routine Claude qui rédige la newsletter
// chaque lundi tourne dans un environnement cloud qui refuse toute connexion
// sortante vers api.brevo.com. Depuis juin 2026, elle écrivait donc un mail
// que personne ne recevait. Elle dépose maintenant le contenu dans le dépôt du
// site (dossier newsletters/), et c'est cette fonction, hébergée chez Vercel,
// qui parle à Brevo.
//
// Deux façons de la déclencher :
//   - le cron Vercel du lundi (voir vercel.json), une heure après la routine ;
//   - un appel à la main, pour envoyer sans attendre lundi :
//       curl -X POST https://learndigi.fr/api/newsletter \
//            -H "Authorization: Bearer $CRON_SECRET"
//
// Elle ne peut pas envoyer deux fois la même édition : une campagne Brevo qui
// porte déjà le nom de l'édition n'est jamais recréée. Et le cron n'envoie
// qu'une édition datée de la semaine : un fichier oublié ne repart pas.
//
// Variables d'environnement attendues (réglages du projet Vercel) :
//   BREVO_API_KEY   clé API Brevo, jamais dans le code ni dans un prompt
//   CRON_SECRET     Vercel l'envoie lui-même sur les appels du cron ; le même
//                   secret sert pour les appels manuels
//   BREVO_LIST_ID   facultatif, liste destinataire (3 par défaut)
//
// Paramètres :
//   ?dry=1     montre ce qui partirait sans rien créer chez Brevo
//   ?force=1   ignore le contrôle de fraîcheur (jamais celui du doublon)
//
// Écrit en CommonJS volontairement : le site n'a pas de package.json, et c'est
// la forme que l'exécution Node de Vercel accepte sans configuration.

const { readFile } = require('node:fs/promises');
const path = require('node:path');

const BREVO = 'https://api.brevo.com/v3';
const EXPEDITEUR = { name: 'Learndigi Formation', email: 'contact@learndigi.fr' };
const FRAICHEUR_JOURS = 8;

function reponse(res, code, corps) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(code).json(corps);
}

function autorise(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const entete = req.headers['authorization'] || '';
  return entete === `Bearer ${secret}`;
}

async function lireEdition() {
  const dossier = path.join(process.cwd(), 'newsletters');
  const meta = JSON.parse(await readFile(path.join(dossier, 'latest.json'), 'utf8'));
  for (const champ of ['date', 'fichier', 'objet', 'apercu', 'nom']) {
    if (!meta[champ]) throw new Error(`latest.json : champ « ${champ} » manquant`);
  }
  // Le nom de fichier vient d'un JSON écrit par un agent : on interdit tout
  // chemin qui sortirait du dossier.
  if (!/^[\w.-]+\.html$/.test(meta.fichier)) throw new Error('latest.json : nom de fichier refusé');
  const html = await readFile(path.join(dossier, meta.fichier), 'utf8');
  return { meta, html };
}

// Renvoie null si l'édition peut partir, sinon la raison du refus.
// Une édition datée d'un lundi à venir ne doit pas partir le samedi qui
// précède, même si elle est déjà écrite : le cron du lundi s'en chargera.
function motifRefus(date) {
  const d = new Date(date + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return `date « ${date} » illisible dans latest.json`;
  const age = (Date.now() - d.getTime()) / 86400000;
  if (age < -1) return `l'édition est datée du ${date}, dans ${Math.ceil(-age)} jour(s) : le cron du lundi l'enverra`;
  if (age > FRAICHEUR_JOURS) return `l'édition du ${date} a plus de ${FRAICHEUR_JOURS} jours`;
  return null;
}

async function brevo(cle, methode, chemin, corps) {
  const r = await fetch(BREVO + chemin, {
    method: methode,
    headers: { 'api-key': cle, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await r.text();
  let json = null;
  try { json = texte ? JSON.parse(texte) : null; } catch (e) { /* réponse vide ou non JSON */ }
  if (!r.ok) {
    const detail = (json && (json.message || json.code)) || texte || r.statusText;
    throw new Error(`Brevo ${methode} ${chemin} → ${r.status} : ${detail}`);
  }
  return json;
}

async function campagneExistante(cle, nom) {
  const liste = await brevo(cle, 'GET', '/emailCampaigns?limit=100&sort=desc');
  return ((liste && liste.campaigns) || []).find(c => c.name === nom) || null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return reponse(res, 405, { erreur: 'méthode refusée' });
  }
  if (!autorise(req)) return reponse(res, 401, { erreur: 'secret absent ou incorrect' });

  const cle = process.env.BREVO_API_KEY;
  if (!cle) return reponse(res, 500, { erreur: 'BREVO_API_KEY non configurée dans Vercel' });
  const listeId = Number(process.env.BREVO_LIST_ID || 3);

  const url = new URL(req.url, 'https://learndigi.fr');
  const dry = url.searchParams.get('dry') === '1';
  const force = url.searchParams.get('force') === '1';

  let edition;
  try { edition = await lireEdition(); }
  catch (e) { return reponse(res, 500, { erreur: 'édition illisible', detail: e.message }); }
  const { meta, html } = edition;

  const refus = force ? null : motifRefus(meta.date);
  if (refus) {
    return reponse(res, 200, {
      statut: 'ignoree',
      raison: refus + ' (ajoutez ?force=1 pour passer outre)',
    });
  }

  try {
    const deja = await campagneExistante(cle, meta.nom);
    if (deja) {
      return reponse(res, 200, {
        statut: 'deja_envoyee',
        campagne: deja.id,
        statutBrevo: deja.status,
        nom: meta.nom,
      });
    }

    const charge = {
      name: meta.nom,
      subject: meta.objet,
      preHeader: meta.apercu,
      sender: EXPEDITEUR,
      replyTo: EXPEDITEUR.email,
      type: 'classic',
      htmlContent: html,
      recipients: { listIds: [listeId] },
    };

    if (dry) {
      return reponse(res, 200, {
        statut: 'simulation',
        nom: meta.nom, objet: meta.objet, apercu: meta.apercu,
        liste: listeId, tailleHtml: html.length, date: meta.date,
      });
    }

    const creee = await brevo(cle, 'POST', '/emailCampaigns', charge);
    const id = creee && creee.id;
    if (!id) throw new Error('Brevo n\'a pas renvoyé d\'identifiant de campagne');
    await brevo(cle, 'POST', `/emailCampaigns/${id}/sendNow`);

    return reponse(res, 200, {
      statut: 'envoyee',
      campagne: id,
      nom: meta.nom,
      objet: meta.objet,
      liste: listeId,
      date: meta.date,
    });
  } catch (e) {
    return reponse(res, 502, { erreur: 'échec Brevo', detail: e.message, nom: meta.nom });
  }
};
