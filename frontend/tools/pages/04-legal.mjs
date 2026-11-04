import { coord, studioDonnees as st, todo, remplacer, confirmer } from '../layout.mjs';

const entete = (h1) => `
    <section class="lb-section pb-4"><div class="container"><div class="row"><div class="col-lg-8"><h1>${h1}</h1>
    <p>${confirmer('texte juridique à faire valider avant mise en ligne')}</p></div></div></div></section>`;

const mentions = `${entete('Mentions légales')}
    <section class="lb-section pt-3"><div class="container"><div class="row"><div class="col-lg-8">
      <h2>Éditeur du site</h2>
      <p>My Beauty Aura<br>Forme juridique : ${todo('forme juridique')}<br>SIRET : ${st.siret ? st.siret : todo('numéro SIRET (14 chiffres)')}<br>Adresse : ${coord.adresse}<br>Contact : ${coord.email}, ${coord.telephone}</p>
      <h2 class="mt-5">Responsable de la publication</h2>
      <p>${st.responsable}</p>
      <h2 class="mt-5">Hébergeur</h2>
      <p>${st.hebergeur}. ${todo('adresse et contact de l’hébergeur (voir ses mentions légales officielles)')}</p>
      <h2 class="mt-5">Assurance</h2>
      <p>Responsabilité civile professionnelle : ${todo('assureur et numéro de contrat')}</p>
      <h2 class="mt-5">Propriété intellectuelle</h2>
      <p>Les contenus du site sont protégés. Toute reproduction sans accord préalable est interdite.</p>
    </div></div></div></section>`;

const confidentialite = `${entete('Politique de confidentialité')}
    <section class="lb-section pt-3"><div class="container"><div class="row"><div class="col-lg-8">
      <h2>Responsable du traitement</h2>
      <p>My Beauty Aura, représenté par ${st.responsable}. Contact : ${coord.email}.</p>
      <h2 class="mt-5">Données collectées et finalités</h2>
      <p>Nom, e-mail, téléphone et informations utiles au soin (par exemple allergies déclarées), uniquement pour répondre à vos demandes et gérer vos rendez-vous.</p>
      <h2 class="mt-5">Durée de conservation</h2>
      <p>${todo('durée de conservation')}</p>
      <h2 class="mt-5">Vos droits</h2>
      <p>Vous pouvez demander l'accès, la rectification ou la suppression de vos données en écrivant à ${todo('e-mail de contact')}. Vous pouvez aussi saisir la CNIL.</p>
      <h2 class="mt-5">Cookies et mesure d'audience</h2>
      <p>Ce site ne dépose aucun cookie. Votre choix concernant les contenus tiers (carte) est mémorisé dans le stockage de votre navigateur, sans être transmis. Vous pouvez le modifier à tout moment avec « Gérer mes choix » en bas de page.</p>
      <p>La fréquentation est mesurée avec un outil sans cookie (Plausible) : pages vues et provenance, sans profil individuel. ${todo('confirmer l’outil retenu et son hébergement')}</p>
      <p>Aucun contenu tiers (carte, réseaux sociaux) n'est chargé avant votre accord.</p>
    </div></div></div></section>`;

const cgv = `${entete('CGV et politique d’annulation')}
    <section class="lb-section pt-3"><div class="container"><div class="row"><div class="col-lg-8">
      <h2>Réservation</h2>
      <p>Toute demande de rendez-vous en ligne est une demande « à confirmer » : le rendez-vous n'est confirmé qu'après validation par la praticienne.</p>
      <h2 class="mt-5">Annulation et retard</h2>
      <p>Annulation gratuite jusqu'à 24 h avant le rendez-vous. ${confirmer('conditions au-delà de ce délai et en cas de retard')}</p>
      <h2 class="mt-5">Tarifs et paiement</h2>
      <p>Les tarifs sont ceux affichés sur la page <a href="/tarifs.html">Tarifs</a>. Moyens de paiement : ${todo('moyens de paiement')}</p>
      <h2 class="mt-5">Santé et contre-indications</h2>
      <p>La cliente informe la praticienne de toute allergie, grossesse, traitement ou sensibilité oculaire avant le soin.</p>
      <h2 class="mt-5">Médiation</h2>
      <p>${todo('médiateur de la consommation')}</p>
    </div></div></div></section>`;

const erreur = `
    <section class="lb-section"><div class="container"><div class="row"><div class="col-lg-7">
      <h1>Page introuvable</h1>
      <p class="lb-intro">Cette page n'existe pas ou a été déplacée.</p>
      <p class="d-flex flex-wrap gap-3 mt-4">
        <a class="btn lb-btn lb-btn--primaire" href="/">Retour à l'accueil</a>
        <a class="btn lb-btn lb-btn--contour" href="/prestations/">Voir les prestations</a>
      </p>
    </div></div></div></section>`;

const reservation = `
    <section class="lb-section"><div class="container"><div class="row"><div class="col-lg-8">
      <h1>Réserver</h1>
      <p class="lb-intro">Choisissez votre soin, une date et un créneau en moins d'une minute. Votre demande est ensuite à confirmer par la praticienne.</p>
      <div class="lb-squelette lb-squelette--page" aria-hidden="true"><span></span><span></span><span></span></div>
      <div id="booking-app" v-cloak></div>
      <noscript><p>La réservation en ligne demande JavaScript. <a href="/contact.html">Contactez le studio</a> pour fixer un rendez-vous.</p></noscript>
    </div></div></div></section>`;

const horsLigne = `
    <section class="lb-section"><div class="container"><div class="row"><div class="col-lg-7">
      <h1>Vous êtes hors ligne</h1>
      <p class="lb-intro">Cette page n'est pas disponible sans connexion. Les pages déjà visitées restent consultables.</p>
      <p>La demande de rendez-vous demande une connexion : réessayez dès que votre réseau est revenu.</p>
      <p><a class="btn lb-btn lb-btn--primaire" href="/">Retour à l'accueil</a></p>
    </div></div></div></section>`;

export default [
  { chemin: '/mentions-legales.html', titre: 'Mentions légales | My Beauty Aura', description: 'Mentions légales du site My Beauty Aura.', corps: mentions },
  { chemin: '/politique-confidentialite.html', titre: 'Politique de confidentialité | My Beauty Aura', description: 'Données collectées, finalités, durée de conservation et droits des utilisateurs.', corps: confidentialite },
  { chemin: '/cgv-annulation.html', titre: 'CGV et annulation | My Beauty Aura', description: 'Conditions générales de vente et politique d’annulation du studio.', corps: cgv },
  { chemin: '/offline.html', titre: 'Hors ligne | My Beauty Aura', description: 'Page affichée lorsque la connexion est indisponible.', corps: horsLigne, robots: 'noindex' },
  { chemin: '/404.html', titre: 'Page introuvable | My Beauty Aura', description: 'Cette page est introuvable.', corps: erreur, robots: 'noindex' },
  { chemin: '/reservation.html', titre: 'Réserver en ligne | My Beauty Aura', description: 'Réservez votre soin des cils ou des sourcils en ligne : choisissez la prestation, la date et le créneau.', corps: reservation, reservation: true, scripts: ['/assets/js/app/booking-page.js'] }
];
