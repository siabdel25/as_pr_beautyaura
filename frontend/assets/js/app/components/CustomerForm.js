import { reactive, ref, nextTick } from 'vue';
import { validerClient, reponsesARisque, QUESTIONS_A_RISQUE } from '../validation.js';

export default {
  name: 'CustomerForm',
  props: { envoi: { type: Object, required: true } },
  emits: ['submit', 'retour'],
  setup(props, { emit }) {
    const client = reactive({
      prenom: '', nom: '', telephone: '', email: '', premiereVisite: '', allergiesConnues: '',
      questionnaire: {}, consentementRgpd: false, acceptationCgv: false, siteWeb: ''
    });
    const erreurs = ref({});
    const resumeErreurs = ref(null);

    const alertes = () => reponsesARisque(client);

    async function valider() {
      erreurs.value = validerClient(client);
      const ids = Object.keys(erreurs.value);
      if (ids.length) {
        await nextTick();
        // Focus sur le premier champ en erreur, dans l'ordre d'apparition
        const premier = document.querySelector('.lb-bk-form [aria-invalid="true"]');
        (premier ?? resumeErreurs.value)?.focus();
        return;
      }
      emit('submit', { ...client, questionnaire: { ...client.questionnaire } });
    }
    return { client, erreurs, resumeErreurs, valider, alertes, QUESTIONS_A_RISQUE };
  },
  template: `
    <form class="lb-bk-form" novalidate @submit.prevent="valider">
      <div v-if="Object.keys(erreurs).length" ref="resumeErreurs" class="alert alert-danger" role="alert" tabindex="-1">
        Corrigez {{ Object.keys(erreurs).length > 1 ? 'les ' + Object.keys(erreurs).length + ' champs signalés' : 'le champ signalé' }} avant d'envoyer votre demande.
      </div>

      <div class="row g-3">
        <div class="col-sm-6">
          <label class="form-label" for="bk-prenom">Prénom</label>
          <input class="form-control" id="bk-prenom" v-model.trim="client.prenom" type="text" autocomplete="given-name" required :aria-invalid="!!erreurs.prenom" :aria-describedby="erreurs.prenom ? 'bk-prenom-e' : null">
          <p v-if="erreurs.prenom" id="bk-prenom-e" class="lb-bk-erreur">{{ erreurs.prenom }}</p>
        </div>
        <div class="col-sm-6">
          <label class="form-label" for="bk-nom">Nom</label>
          <input class="form-control" id="bk-nom" v-model.trim="client.nom" type="text" autocomplete="family-name" required :aria-invalid="!!erreurs.nom" :aria-describedby="erreurs.nom ? 'bk-nom-e' : null">
          <p v-if="erreurs.nom" id="bk-nom-e" class="lb-bk-erreur">{{ erreurs.nom }}</p>
        </div>
        <div class="col-sm-6">
          <label class="form-label" for="bk-tel">Téléphone</label>
          <input class="form-control" id="bk-tel" v-model.trim="client.telephone" type="tel" autocomplete="tel" inputmode="tel" required :aria-invalid="!!erreurs.telephone" :aria-describedby="erreurs.telephone ? 'bk-tel-e' : null">
          <p v-if="erreurs.telephone" id="bk-tel-e" class="lb-bk-erreur">{{ erreurs.telephone }}</p>
        </div>
        <div class="col-sm-6">
          <label class="form-label" for="bk-mail">E-mail</label>
          <input class="form-control" id="bk-mail" v-model.trim="client.email" type="email" autocomplete="email" required :aria-invalid="!!erreurs.email" :aria-describedby="erreurs.email ? 'bk-mail-e' : null">
          <p v-if="erreurs.email" id="bk-mail-e" class="lb-bk-erreur">{{ erreurs.email }}</p>
        </div>
      </div>

      <fieldset class="mt-4">
        <legend class="form-label">Est-ce votre première visite ?</legend>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" id="bk-pv-oui" name="premiere-visite" value="oui" v-model="client.premiereVisite" :aria-invalid="!!erreurs.premiereVisite">
          <label class="form-check-label" for="bk-pv-oui">Oui</label>
        </div>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" id="bk-pv-non" name="premiere-visite" value="non" v-model="client.premiereVisite" :aria-invalid="!!erreurs.premiereVisite">
          <label class="form-check-label" for="bk-pv-non">Non</label>
        </div>
        <p v-if="erreurs.premiereVisite" class="lb-bk-erreur">{{ erreurs.premiereVisite }}</p>
      </fieldset>

      <div v-if="client.premiereVisite === 'oui'" class="lb-bk-questionnaire">
        <p class="mb-2">Quelques questions de santé avant votre premier soin.</p>
        <fieldset v-for="q in QUESTIONS_A_RISQUE" :key="q.id" class="mb-3">
          <legend class="form-label fs-6">{{ q.libelle }}</legend>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="radio" :id="'bk-' + q.id + '-oui'" :name="q.id" value="oui" v-model="client.questionnaire[q.id]" :aria-invalid="!!erreurs[q.id]">
            <label class="form-check-label" :for="'bk-' + q.id + '-oui'">Oui</label>
          </div>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="radio" :id="'bk-' + q.id + '-non'" :name="q.id" value="non" v-model="client.questionnaire[q.id]" :aria-invalid="!!erreurs[q.id]">
            <label class="form-check-label" :for="'bk-' + q.id + '-non'">Non</label>
          </div>
          <p v-if="erreurs[q.id]" class="lb-bk-erreur">{{ erreurs[q.id] }}</p>
        </fieldset>
        <fieldset class="mb-3">
          <legend class="form-label fs-6">Portez-vous des lentilles ?</legend>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="radio" id="bk-lentilles-oui" name="lentilles" value="oui" v-model="client.questionnaire.lentilles">
            <label class="form-check-label" for="bk-lentilles-oui">Oui</label>
          </div>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="radio" id="bk-lentilles-non" name="lentilles" value="non" v-model="client.questionnaire.lentilles">
            <label class="form-check-label" for="bk-lentilles-non">Non</label>
          </div>
        </fieldset>
        <div class="mb-2">
          <label class="form-label" for="bk-allergies">Autres allergies ou précisions (facultatif)</label>
          <textarea class="form-control" id="bk-allergies" v-model.trim="client.allergiesConnues" rows="2"></textarea>
        </div>
        <div aria-live="polite">
          <p v-if="alertes().length" class="alert alert-warning mb-0">
            Merci de contacter le studio avant de réserver : {{ alertes().map((q) => q.libelle.toLowerCase()).join(', ') }}.
            Le soin doit être validé avec la praticienne. <a href="/contact.html">Contacter le studio</a>
          </p>
        </div>
      </div>

      <div class="lb-hp" aria-hidden="true">
        <label for="bk-site">Ne pas remplir</label>
        <input id="bk-site" v-model="client.siteWeb" type="text" tabindex="-1" autocomplete="off">
      </div>

      <div class="mt-4">
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="bk-rgpd" v-model="client.consentementRgpd" required :aria-invalid="!!erreurs.consentementRgpd" :aria-describedby="erreurs.consentementRgpd ? 'bk-rgpd-e' : null">
          <label class="form-check-label" for="bk-rgpd">J'accepte que mes données soient utilisées pour traiter ma demande de rendez-vous. <a href="/politique-confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a></label>
        </div>
        <p v-if="erreurs.consentementRgpd" id="bk-rgpd-e" class="lb-bk-erreur">{{ erreurs.consentementRgpd }}</p>
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" id="bk-cgv" v-model="client.acceptationCgv" required :aria-invalid="!!erreurs.acceptationCgv" :aria-describedby="erreurs.acceptationCgv ? 'bk-cgv-e' : null">
          <label class="form-check-label" for="bk-cgv">J'ai lu les <a href="/cgv-annulation.html" target="_blank" rel="noopener">CGV et la politique d'annulation</a> (annulation gratuite jusqu'à 24 h avant).</label>
        </div>
        <p v-if="erreurs.acceptationCgv" id="bk-cgv-e" class="lb-bk-erreur">{{ erreurs.acceptationCgv }}</p>
      </div>

      <div v-if="envoi.etat === 'erreur'" class="alert alert-danger mt-3" role="alert">{{ envoi.message }}</div>

      <div class="lb-bk-actions">
        <button type="button" class="btn lb-btn lb-btn--contour" @click="$emit('retour')">Retour</button>
        <button type="submit" class="btn lb-btn lb-btn--primaire" :disabled="envoi.etat === 'envoi'">
          {{ envoi.etat === 'envoi' ? 'Envoi en cours…' : 'Envoyer ma demande' }}
        </button>
      </div>
    </form>`
};
