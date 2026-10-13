import { todo, remplacer, confirmer } from '../layout.mjs';

const entete = (h1, intro) => `
    <section class="lb-section pb-4">
      <div class="container">
        <div class="row"><div class="col-lg-8">
          <h1>${h1}</h1>
          ${intro ? `<p class="lb-intro">${intro}</p>` : ''}
        </div></div>
      </div>
    </section>`;

const ligne = (cat, nom, duree, prix = todo('prix')) =>
  `<tr data-categorie="${cat}" v-show="visible('${cat}')"><th scope="row">${nom}</th><td>${duree}</td><td>${prix}</td></tr>`;

const tarifs = `
${entete('Tarifs', `Des prix clairs, avant la réservation. ${remplacer('liste et tarifs indicatifs, à remplacer par la grille réelle du studio')}`)}
    <section class="lb-section pt-3">
      <div class="container">
        <div id="tarifs-app">
          <div class="lb-filtres" role="group" aria-label="Filtrer par type de soin" v-cloak>
            <button v-for="f in filtres" :key="f.id" type="button" :aria-pressed="f.id === filtre" @click="choisir(f.id)">{{ f.nom }}</button>
          </div>
          <p class="visually-hidden" aria-live="polite" v-cloak>{{ message }}</p>
          <div class="table-responsive">
            <table class="lb-tarifs">
              <caption>Grille des soins</caption>
              <thead><tr><th scope="col">Soin</th><th scope="col">Durée</th><th scope="col">Prix</th></tr></thead>
              <tbody>
                ${ligne('extensions', 'Pose complète cil à cil', 'environ 2 h 30')}
                ${ligne('extensions', 'Pose volume', todo('durée'))}
                ${ligne('extensions', 'Retouche', 'environ 1 h 15')}
                ${ligne('extensions', 'Dépose', todo('durée'))}
                ${ligne('rehaussement', 'Rehaussement de cils', 'environ 1 h')}
                ${ligne('rehaussement', 'Rehaussement et teinture', todo('durée'))}
                ${ligne('sourcils', 'Restructuration des sourcils', 'environ 45 min')}
                ${ligne('sourcils', 'Teinture des sourcils', todo('durée'))}
                ${ligne('sourcils', 'Lissage des sourcils', todo('durée'))}
                ${ligne('sourcils', 'Épilation des sourcils', todo('durée'))}
              </tbody>
            </table>
          </div>
        </div>
        <p class="mt-4">Annulation gratuite jusqu'à 24 h avant le rendez-vous. <a href="/cgv-annulation.html">Voir les conditions</a>.</p>
        <p><a class="btn lb-btn lb-btn--primaire mt-3" href="/reservation.html">Réserver</a></p>
      </div>
    </section>`;

const aPropos = `
${entete('À propos', `${remplacer('présentation de la praticienne et de son parcours')}`)}
    <section class="lb-section pt-3">
      <div class="container">
        <div class="row g-5">
          <div class="col-lg-5">
            <h2>Parcours et formations</h2>
            <p>${todo('parcours, années d’expérience')}</p>
            <p>${todo('certifications et formations obtenues, à indiquer uniquement si justifiées')}</p>
          </div>
          <div class="col-lg-6 offset-lg-1">
            <h2>Protocole d'hygiène</h2>
            <ul class="lb-checklist">
              <li>${confirmer('matériel stérilisé ou à usage unique, à confirmer par la praticienne')}</li>
              <li>${confirmer('désinfection du poste entre chaque cliente')}</li>
              <li>${confirmer('questionnaire de première visite avant le premier soin')}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
    <section class="lb-section lb-section--sauge">
      <div class="container">
        <h2>Le lieu</h2>
        <p>${remplacer('description du studio et photos du lieu')}</p>
      </div>
    </section>`;

const QUESTIONS = [
  ['Combien de temps dure une pose d’extensions ?', `Une pose complète prend environ 2 h 30 et une retouche environ 1 h 15 ${confirmer('durées à valider')}.`],
  ['Combien de temps tiennent les extensions ?', `${confirmer('durée de tenue et rythme de retouche indiqués par la praticienne')}`],
  ['Quelle est la différence entre extensions et rehaussement ?', 'Les extensions ajoutent des cils synthétiques sur vos cils naturels. Le rehaussement donne une courbe à vos cils naturels, sans rien ajouter.'],
  ['Comment choisir la courbure ?', 'La courbure (C, CC, D ou L) change l’ouverture du regard. Vous pouvez comparer les options sur la page des extensions, puis la praticienne vous conseille sur place.'],
  ['Est-ce que le soin est douloureux ?', 'Le soin se fait yeux fermés, en position allongée. Prévenez la praticienne si vous ressentez une gêne.'],
  ['Je suis enceinte ou j’ai un traitement oculaire, puis-je réserver ?', 'Dans ce cas, contactez le studio avant de réserver afin de vérifier que le soin est adapté.'],
  ['Je suis allergique à la colle ou sensible des yeux, que faire ?', 'Merci de nous contacter avant de réserver. Le questionnaire de première visite permet aussi de le signaler.'],
  ['Puis-je porter des lentilles ?', `${confirmer('consigne de la praticienne')}`],
  ['Dois-je venir maquillée ?', 'Mieux vaut venir les yeux démaquillés. Cela facilite le soin.'],
  ['Comment entretenir mes cils après la pose ?', 'Consultez nos conseils après-soin : gestes des premières 48 heures, brossage et produits à éviter.'],
  ['Quelle est la politique d’annulation ?', 'L’annulation est gratuite jusqu’à 24 h avant le rendez-vous. Les conditions complètes figurent dans les CGV.'],
  ['Ma demande de rendez-vous est-elle confirmée tout de suite ?', 'Non. Toute demande est à confirmer par la praticienne, qui vous répond par e-mail ou téléphone.'],
  ['Comment puis-je payer ?', `${todo('moyens de paiement acceptés')}`],
  ['Les sourcils sont-ils accessibles aux hommes ?', 'Oui. Les soins des sourcils sont ouverts à toutes et à tous.']
];

const faq = `
${entete('Questions fréquentes', 'Les réponses aux questions les plus posées avant un premier rendez-vous.')}
    <section class="lb-section pt-3">
      <div class="container">
        <div class="row"><div class="col-lg-8">
          <div class="accordion" id="faq">
${QUESTIONS.map(([q, r], i) => `            <div class="accordion-item">
              <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#q${i}" aria-expanded="false" aria-controls="q${i}">${q}</button></h2>
              <div id="q${i}" class="accordion-collapse collapse" data-bs-parent="#faq"><div class="accordion-body">${r}</div></div>
            </div>`).join('\n')}
          </div>
          <p class="mt-5">Une autre question ? <a href="/contact.html">Contactez le studio</a>.</p>
        </div></div>
      </div>
    </section>`;

const apresSoin = `
${entete('Conseils après-soin', `${confirmer('à valider par la praticienne avant mise en ligne')}`)}
    <section class="lb-section pt-3">
      <div class="container">
        <div class="row g-5">
          <div class="col-lg-6">
            <h2>Les premières 48 heures</h2>
            <ul class="lb-checklist">
              <li>Évitez l'eau chaude, la vapeur et le sauna ${confirmer('délai exact')}.</li>
              <li>Ne touchez pas, ne frottez pas vos yeux.</li>
              <li>Évitez le maquillage des yeux et les démaquillants gras.</li>
            </ul>
          </div>
          <div class="col-lg-6">
            <h2>Au quotidien</h2>
            <ul class="lb-checklist">
              <li>Brossez délicatement vos cils chaque jour avec la brossette fournie.</li>
              <li>Nettoyez-les avec un produit adapté ${confirmer('produit conseillé')}.</li>
              <li>Prenez rendez-vous pour une retouche ${confirmer('rythme conseillé')}.</li>
              <li>En cas de gêne ou de rougeur, contactez le studio.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>`;

const contact = `
${entete('Contact', 'Une question avant de réserver ? Écrivez-nous ou passez au studio.')}
    <section class="lb-section pt-3">
      <div class="container">
        <div class="row g-5">
          <div class="col-lg-5">
            <h2>Coordonnées</h2>
            <p>${todo('adresse du studio')}<br>${todo('téléphone')}<br>${todo('e-mail')}</p>
            <h3 class="fs-4 mt-4">Horaires</h3>
            <p>${todo('horaires d’ouverture')}</p>
            <div class="lb-carte-consent mt-4">
              <p class="mb-0"><strong>Carte et itinéraire</strong></p>
              <p class="mb-0">La carte ne sera affichée qu'avec votre accord, car elle fait appel à un service tiers. ${todo('adresse, puis activation de la carte au consentement')}</p>
            </div>
          </div>
          <div class="col-lg-6 offset-lg-1">
            <h2>Écrire au studio</h2>
            <form class="lb-form" novalidate>
              <div class="mb-3"><label class="form-label" for="c-nom">Nom</label><input class="form-control" id="c-nom" name="nom" autocomplete="name" required></div>
              <div class="mb-3"><label class="form-label" for="c-mail">E-mail</label><input class="form-control" id="c-mail" name="email" type="email" autocomplete="email" required></div>
              <div class="mb-3"><label class="form-label" for="c-msg">Message</label><textarea class="form-control" id="c-msg" name="message" rows="5" required></textarea></div>
              <div class="lb-hp" aria-hidden="true"><label for="c-site">Ne pas remplir</label><input id="c-site" name="site" tabindex="-1" autocomplete="off"></div>
              <div class="form-check mb-4">
                <input class="form-check-input" type="checkbox" id="c-rgpd" name="rgpd" required>
                <label class="form-check-label" for="c-rgpd">J'accepte que mes données soient utilisées pour répondre à ma demande. <a href="/politique-confidentialite.html">Politique de confidentialité</a></label>
              </div>
              <button class="btn lb-btn lb-btn--primaire" type="submit" disabled>Envoyer</button>
              <p class="mt-3 small">${todo('service d’envoi du formulaire (Formspree ou fonction serverless), l’envoi est désactivé en attendant')}</p>
            </form>
          </div>
        </div>
      </div>
    </section>`;

export default [
  { chemin: '/tarifs.html', titre: 'Tarifs des soins cils et sourcils | My Beauty Aura', description: 'Tarifs et durées des extensions de cils, du rehaussement et des soins des sourcils. Filtrez par type de soin.', corps: tarifs, vue: true, scripts: ['/assets/js/app/tarifs.js'] },
  { chemin: '/a-propos.html', titre: 'À propos du studio | My Beauty Aura', description: 'Découvrez le parcours de la praticienne, le lieu et le protocole d’hygiène du studio My Beauty Aura.', corps: aPropos },
  { chemin: '/faq.html', titre: 'FAQ cils et sourcils | My Beauty Aura', description: 'Durée, tenue, entretien, annulation : les réponses aux questions fréquentes sur les extensions de cils et les soins des sourcils.', corps: faq },
  { chemin: '/conseils-apres-soin.html', titre: 'Conseils après-soin | My Beauty Aura', description: 'Les gestes à adopter après une pose de cils, un rehaussement ou un soin des sourcils.', corps: apresSoin },
  { chemin: '/contact.html', titre: 'Contact et accès | My Beauty Aura', description: 'Contactez le studio My Beauty Aura : coordonnées, horaires, formulaire de contact.', corps: contact }
];
