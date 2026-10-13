export default {
  name: 'Confirmation',
  props: { recap: { type: Object, required: true } },
  emits: ['nouvelle'],
  template: `
    <div class="lb-bk-confirmation">
      <p class="lb-intro">Merci {{ recap.prenom }}. Votre demande a bien été transmise au studio. <strong>Elle n'est pas encore confirmée</strong> : la praticienne la valide puis vous répond par e-mail ou par téléphone.</p>
      <dl class="lb-fiche">
        <dt>Prestations</dt><dd>{{ recap.prestations.join(', ') }}</dd>
        <dt>Date souhaitée</dt><dd>{{ recap.jour }} à {{ recap.heure.replace(':', ' h ') }}</dd>
        <dt>Durée prévue</dt><dd>{{ recap.duree }}</dd>
        <dt>Annulation</dt><dd>Gratuite jusqu'à 24 h avant le rendez-vous. <a href="/cgv-annulation.html">Voir les conditions</a></dd>
      </dl>
      <p class="d-flex flex-wrap gap-3 mt-4">
        <a class="btn lb-btn lb-btn--primaire" :href="recap.icsUrl" download="demande-rendez-vous.ics">Ajouter à mon agenda (.ics)</a>
        <button type="button" class="btn lb-btn lb-btn--contour" @click="$emit('nouvelle')">Faire une autre demande</button>
      </p>
      <p class="small">Le fichier d'agenda est marqué « à confirmer ».</p>
    </div>`
};
