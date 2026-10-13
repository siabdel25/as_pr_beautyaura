import { createApp, reactive, computed, ref, watch, nextTick, onMounted } from 'vue';
import VCalendar from 'v-calendar';
import ServicePicker from './components/ServicePicker.js';
import SlotGrid from './components/SlotGrid.js';
import CustomerForm from './components/CustomerForm.js';
import Confirmation from './components/Confirmation.js';
import { creneauxDuJour, datesDisponibles, totalSelection, formaterDuree, parisMaintenant, ajouterJours } from './slots.js';
import { envoyerDemande, EnvoiNonConfigure } from './submit.js';
import { genererIcs } from './ics.js';

const NOM_STUDIO = 'My Beauty Aura';
const ETAPES = ['Prestation', 'Date et créneau', 'Coordonnées', 'Confirmation'];
const pad = (n) => String(n).padStart(2, '0');

// Les Date servent uniquement à l'affichage du calendrier : on les construit en heure locale
// et on relit y/m/d en heure locale, donc aucun décalage possible, quel que soit le fuseau du visiteur.
const isoVersDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const dateVersIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const libelleJour = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

// Événements pour la mesure d'audience (branchée au lot 4) : aucun appel réseau ici.
const emettre = (name) => window.dispatchEvent(new CustomEvent('lb:event', { detail: { name } }));

async function charger(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} : ${r.status}`);
  return r.json();
}

const BookingWidget = {
  name: 'BookingWidget',
  components: { ServicePicker, SlotGrid, CustomerForm, Confirmation },
  setup() {
    const donnees = reactive({ pret: false, erreur: null, config: null, services: [], horaires: {}, indisponibilites: [], reservations: [], exemple: false });
    const etat = reactive({ etape: 1, ids: [], date: null, heure: null, maintenantMs: Date.now(), annonce: '' });
    const envoi = reactive({ etat: 'repos', message: '' });
    const recap = ref(null);
    const titre = ref(null);

    onMounted(async () => {
      try {
        const [config, services, horaires, indispos, resas] = await Promise.all([
          charger('/data/reservation.json'), charger('/data/services.json'), charger('/data/horaires.json'),
          charger('/data/indisponibilites.json'), charger('/data/reservations.json')
        ]);
        donnees.config = config;
        donnees.services = services.services;
        donnees.horaires = horaires.hebdo;
        donnees.indisponibilites = indispos.indisponibilites;
        donnees.reservations = resas.reservations_existantes;
        donnees.exemple = [config, services, horaires].some((f) => f.statut === 'exemple');
        donnees.pret = true;
        emettre('booking_start');
      } catch (e) {
        donnees.erreur = 'Le calendrier n’a pas pu être chargé. Rechargez la page ou contactez le studio.';
      }
    });

    const selection = computed(() => totalSelection(donnees.services, etat.ids));
    const nomsPrestations = computed(() => donnees.services.filter((s) => etat.ids.includes(s.id)).map((s) => s.nom));
    const contexte = () => ({
      dureeMin: selection.value.dureeMin, config: donnees.config, horaires: donnees.horaires,
      indisponibilites: donnees.indisponibilites, reservations: donnees.reservations, maintenantMs: etat.maintenantMs
    });
    const datesOk = computed(() => (donnees.pret && etat.ids.length ? datesDisponibles(contexte()) : []));
    const creneaux = computed(() => (etat.date ? creneauxDuJour({ ...contexte(), date: etat.date }) : []));

    const aujourdhui = computed(() => (donnees.pret ? parisMaintenant(etat.maintenantMs, donnees.config.fuseau).date : null));
    const minDate = computed(() => (aujourdhui.value ? isoVersDate(aujourdhui.value) : null));
    const maxDate = computed(() => (aujourdhui.value ? isoVersDate(ajouterJours(aujourdhui.value, donnees.config.horizon_jours)) : null));
    const datesFermees = computed(() => {
      if (!aujourdhui.value) return [];
      const fermees = [];
      for (let i = 0; i <= donnees.config.horizon_jours; i += 1) {
        const iso = ajouterJours(aujourdhui.value, i);
        if (!datesOk.value.includes(iso)) fermees.push(isoVersDate(iso));
      }
      return fermees;
    });
    const dateObjet = computed({
      get: () => (etat.date ? isoVersDate(etat.date) : null),
      set: (d) => choisirDate(d ? dateVersIso(d) : null)
    });

    function choisirDate(iso) {
      etat.date = iso || null;
      etat.heure = null;
      if (iso) { emettre('booking_step_date'); etat.annonce = `${libelleJour(iso)} : ${creneaux.value.length} créneaux disponibles.`; }
    }
    function choisirHeure(h) { etat.heure = h; emettre('booking_step_slot'); }

    // Changer de prestations change la durée : date et créneau choisis ne sont plus fiables
    watch(() => etat.ids.join(','), () => { etat.date = null; etat.heure = null; });

    async function aller(n) {
      etat.etape = n;
      if (n === 2) etat.maintenantMs = Date.now();
      etat.annonce = `Étape ${Math.min(n, 3)} sur 3 : ${ETAPES[n - 1]}`;
      await nextTick();
      titre.value?.focus();
    }
    const continuer = (n) => { emettre(['', 'booking_step_service', 'booking_step_date', 'booking_step_details'][n - 1] ?? ''); aller(n + 1); };

    async function soumettre(client) {
      const prestations = donnees.services.filter((s) => etat.ids.includes(s.id)).map((s) => ({ id: s.id, nom: s.nom }));
      const jour = libelleJour(etat.date);
      const resume = { prenom: client.prenom, prestations: prestations.map((p) => p.nom), jour, heure: etat.heure, duree: formaterDuree(selection.value.dureeMin) };
      // Honeypot rempli : c'est un robot. On affiche la suite sans rien envoyer.
      if (!client.siteWeb) {
        envoi.etat = 'envoi';
        try {
          await envoyerDemande({
            statut: 'a_confirmer',
            prestations, date: etat.date, heure: etat.heure, duree_min: selection.value.dureeMin,
            client: { prenom: client.prenom, nom: client.nom, telephone: client.telephone, email: client.email },
            premiere_visite: client.premiereVisite, questionnaire: client.questionnaire, precisions: client.allergiesConnues,
            consentement_rgpd: true, cgv_acceptees: true, envoye_le: new Date().toISOString()
          }, donnees.config.endpoint);
        } catch (e) {
          envoi.etat = 'erreur';
          envoi.message = e instanceof EnvoiNonConfigure
            ? 'L’envoi des demandes n’est pas encore activé sur ce site : votre demande n’a pas été transmise. Contactez le studio directement.'
            : 'L’envoi a échoué : votre demande n’a pas été transmise. Réessayez ou contactez le studio.';
          return;
        }
      }
      const ics = genererIcs({
        date: etat.date, heure: etat.heure, dureeMin: selection.value.dureeMin, prestations: resume.prestations,
        studio: NOM_STUDIO, fuseau: donnees.config.fuseau, uid: `${Date.now()}-${etat.date}@my-beauty-aura`, maintenantMs: Date.now()
      });
      recap.value = { ...resume, icsUrl: URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' })) };
      envoi.etat = 'ok';
      emettre('booking_submit');
      aller(4);
    }
    function recommencer() {
      etat.ids = []; etat.date = null; etat.heure = null; envoi.etat = 'repos'; recap.value = null; aller(1);
    }

    return {
      donnees, etat, envoi, recap, titre, ETAPES, selection, nomsPrestations, datesOk, creneaux,
      minDate, maxDate, datesFermees, dateObjet, choisirDate, choisirHeure, aller, continuer, soumettre, recommencer,
      libelleJour, formaterDuree
    };
  },
  template: `
    <section class="lb-booking" aria-label="Réservation en ligne">
      <div v-if="donnees.erreur" class="alert alert-danger" role="alert">{{ donnees.erreur }} <a href="/contact.html">Contacter le studio</a></div>
      <div v-else-if="!donnees.pret" class="lb-squelette" aria-hidden="true"><span></span><span></span><span></span></div>
      <template v-else>
        <p v-if="donnees.exemple" class="lb-bk-exemple"><span class="lb-todo">[À REMPLACER]</span> Prestations et créneaux d'exemple : les horaires réels du studio ne sont pas encore renseignés.</p>

        <ol class="lb-bk-etapes" aria-label="Progression">
          <li v-for="(nom, i) in ETAPES" :key="nom" :aria-current="etat.etape === i + 1 ? 'step' : null" :class="{ 'lb-bk-etape--faite': etat.etape > i + 1 }">{{ nom }}</li>
        </ol>
        <p class="visually-hidden" aria-live="polite">{{ etat.annonce }}</p>

        <h2 class="lb-bk-titre" ref="titre" tabindex="-1">{{ etat.etape === 1 ? 'Choisissez vos prestations' : etat.etape === 2 ? 'Choisissez la date et l’heure' : etat.etape === 3 ? 'Vos coordonnées' : 'Demande envoyée' }}</h2>

        <div v-if="etat.etape === 1">
          <ServicePicker :services="donnees.services" v-model="etat.ids" />
          <div class="lb-bk-actions">
            <button type="button" class="btn lb-btn lb-btn--primaire" :disabled="!etat.ids.length" @click="continuer(1)">Continuer</button>
          </div>
        </div>

        <div v-if="etat.etape === 2">
          <p class="lb-bk-recap">{{ nomsPrestations.join(', ') }} · {{ formaterDuree(selection.dureeMin) }}</p>
          <VDatePicker v-model="dateObjet" :min-date="minDate" :max-date="maxDate" :disabled-dates="datesFermees"
            locale="fr" :first-day-of-week="2" expanded borderless is-required title-position="left" />
          <p v-if="!datesOk.length" class="lb-bk-vide" role="status">Aucune date disponible pour cette durée. <a href="/contact.html">Contactez le studio</a>.</p>
          <div class="lb-bk-liste-dates">
            <label class="form-label" for="bk-date-liste">Ou choisissez la date dans une liste</label>
            <select id="bk-date-liste" class="form-select" :value="etat.date ?? ''" @change="choisirDate($event.target.value)">
              <option value="">Choisir une date</option>
              <option v-for="d in datesOk" :key="d" :value="d">{{ libelleJour(d) }}</option>
            </select>
          </div>
          <SlotGrid v-if="etat.date" :creneaux="creneaux" :model-value="etat.heure" :libelle-jour="libelleJour(etat.date)" @update:model-value="choisirHeure" />
          <div class="lb-bk-actions">
            <button type="button" class="btn lb-btn lb-btn--contour" @click="aller(1)">Retour</button>
            <button type="button" class="btn lb-btn lb-btn--primaire" :disabled="!etat.heure" @click="continuer(2)">Continuer</button>
          </div>
        </div>

        <div v-if="etat.etape === 3">
          <p class="lb-bk-recap">{{ nomsPrestations.join(', ') }} · {{ libelleJour(etat.date) }} à {{ etat.heure.replace(':', ' h ') }}</p>
          <p>Votre demande sera à confirmer par la praticienne. Vous ne payez rien en ligne.</p>
          <CustomerForm :envoi="envoi" @submit="soumettre" @retour="aller(2)" />
        </div>

        <Confirmation v-if="etat.etape === 4 && recap" :recap="recap" @nouvelle="recommencer" />
      </template>
    </section>`
};

/** Monte le tunnel sur l'élément donné (sélecteur CSS) et retire le squelette de chargement. */
export function monter(selecteur = '#booking-app') {
  const el = document.querySelector(selecteur);
  if (!el) return null;
  const app = createApp(BookingWidget);
  app.use(VCalendar, {});
  app.mount(el);
  // V-Calendar ne nomme pas ses flèches de mois : sans nom, un lecteur d'écran annonce « bouton » seul
  const nommerFleches = () => {
    el.querySelectorAll('.vc-arrow.vc-prev:not([aria-label])').forEach((b) => b.setAttribute('aria-label', 'Mois précédent'));
    el.querySelectorAll('.vc-arrow.vc-next:not([aria-label])').forEach((b) => b.setAttribute('aria-label', 'Mois suivant'));
  };
  new MutationObserver(nommerFleches).observe(el, { childList: true, subtree: true });
  el.parentElement?.querySelector('.lb-squelette--page')?.remove();
  return app;
}
