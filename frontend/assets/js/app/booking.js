import { createApp, reactive, computed, ref, watch, nextTick, onMounted } from 'vue';
import VCalendar from 'v-calendar';
import ServicePicker from './components/ServicePicker.js';
import SlotGrid from './components/SlotGrid.js';
import CustomerForm from './components/CustomerForm.js';
import Confirmation from './components/Confirmation.js';
import { creneauxDuJour, datesDisponibles, totalSelection, formaterDuree, parisMaintenant, ajouterJours } from './slots.js';
import { envoyerDemande, chargerCreneaux, chargerDisponibilites, EnvoiNonConfigure, CreneauPris, TropDeDemandes } from './submit.js';
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
    const etat = reactive({ etape: 1, ids: [], date: null, heure: null, maintenantMs: Date.now(), annonce: '', avertissement: '' });
    // Mode API : les créneaux viennent du serveur, qui connaît les demandes déjà reçues.
    const api = reactive({ creneaux: [], chargement: false, erreur: false, dates: [], chargementDates: false, erreurDates: false });
    let sequence = 0;
    let sequenceDates = 0;
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
    const modeApi = computed(() => Boolean(donnees.config?.api));
    const datesLocales = computed(() => (donnees.pret && etat.ids.length ? datesDisponibles(contexte()) : []));
    const datesOk = computed(() => (modeApi.value ? api.dates : datesLocales.value));
    const creneauxLocaux = computed(() => (etat.date ? creneauxDuJour({ ...contexte(), date: etat.date }) : []));
    const creneaux = computed(() => (modeApi.value ? api.creneaux : creneauxLocaux.value));

    async function rafraichirCreneaux() {
      if (!modeApi.value || !etat.date || !etat.ids.length) { api.creneaux = []; return; }
      const mien = ++sequence; // ignore une réponse arrivée après un changement de date
      api.chargement = true; api.erreur = false;
      try {
        const liste = await chargerCreneaux(donnees.config.api, etat.date, etat.ids);
        if (mien !== sequence) return;
        api.creneaux = liste;
        etat.annonce = `${libelleJour(etat.date)} : ${liste.length} créneaux disponibles.`;
      } catch (e) {
        if (mien !== sequence) return;
        api.creneaux = []; api.erreur = true;
      } finally {
        if (mien === sequence) api.chargement = false;
      }
    }
    watch(() => [etat.date, etat.ids.join(',')], rafraichirCreneaux);

    // Jours disponibles de tout l'horizon (2 à 3 mois, requêtes en parallèle) : le calendrier grise les jours complets
    async function rafraichirDates() {
      if (!modeApi.value || !etat.ids.length) { api.dates = []; return; }
      const debut = parisMaintenant(etat.maintenantMs, donnees.config.fuseau).date;
      const fin = ajouterJours(debut, donnees.config.horizon_jours);
      const mois = [];
      for (let m = debut.slice(0, 7); m <= fin.slice(0, 7); m = m.slice(5) === '12' ? `${+m.slice(0, 4) + 1}-01` : `${m.slice(0, 5)}${pad(+m.slice(5) + 1)}`) mois.push(m);
      const mien = ++sequenceDates;
      api.chargementDates = true; api.erreurDates = false;
      try {
        const listes = await Promise.all(mois.map((m) => chargerDisponibilites(donnees.config.api, m, etat.ids)));
        if (mien === sequenceDates) api.dates = listes.flat().filter((d) => d <= fin);
      } catch (e) {
        if (mien === sequenceDates) { api.dates = []; api.erreurDates = true; }
      } finally {
        if (mien === sequenceDates) api.chargementDates = false;
      }
    }

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
      if (iso) { emettre('booking_step_date'); if (!modeApi.value) etat.annonce = `${libelleJour(iso)} : ${creneaux.value.length} créneaux disponibles.`; }
    }
    function choisirHeure(h) { etat.heure = h; etat.avertissement = ''; emettre('booking_step_slot'); }

    // Changer de prestations change la durée : date et créneau choisis ne sont plus fiables
    watch(() => etat.ids.join(','), () => { etat.date = null; etat.heure = null; });

    async function aller(n) {
      etat.etape = n;
      if (n === 2) { etat.maintenantMs = Date.now(); rafraichirDates(); }
      etat.annonce = `Étape ${Math.min(n, 3)} sur 3 : ${ETAPES[n - 1]}`;
      await nextTick();
      titre.value?.focus();
    }
    // L'étape 2 émet déjà booking_step_date et booking_step_slot au choix : rien à émettre en la quittant
    const continuer = (n) => { const nom = ['booking_step_service', null, 'booking_step_details'][n - 1]; if (nom) emettre(nom); aller(n + 1); };

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
          }, modeApi.value ? `${donnees.config.api}/reservations/` : donnees.config.endpoint);
        } catch (e) {
          if (e instanceof CreneauPris) {
            // Quelqu'un a pris ce créneau entre-temps : retour au choix de l'heure, créneaux rechargés
            envoi.etat = 'repos';
            etat.heure = null;
            etat.avertissement = 'Ce créneau vient d’être pris. Choisissez une autre heure : votre demande n’a pas été envoyée.';
            await aller(2);
            rafraichirCreneaux();
            return;
          }
          envoi.etat = 'erreur';
          envoi.message = e instanceof TropDeDemandes
            ? 'Vous avez envoyé trop de demandes. Réessayez plus tard ou contactez le studio : votre demande n’a pas été transmise.'
            : e instanceof EnvoiNonConfigure
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
      donnees, etat, envoi, recap, titre, ETAPES, selection, nomsPrestations, datesOk, creneaux, api,
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
          <p v-if="api.chargementDates" class="lb-bk-vide" role="status">Chargement des disponibilités…</p>
          <p v-else-if="api.erreurDates" class="alert alert-danger" role="alert">Les disponibilités n’ont pas pu être chargées. Rechargez la page ou <a href="/contact.html">contactez le studio</a>.</p>
          <p v-else-if="!datesOk.length" class="lb-bk-vide" role="status">Aucune date disponible pour cette durée. <a href="/contact.html">Contactez le studio</a>.</p>
          <div class="lb-bk-liste-dates">
            <label class="form-label" for="bk-date-liste">Ou choisissez la date dans une liste</label>
            <select id="bk-date-liste" class="form-select" :value="etat.date ?? ''" @change="choisirDate($event.target.value)">
              <option value="">Choisir une date</option>
              <option v-for="d in datesOk" :key="d" :value="d">{{ libelleJour(d) }}</option>
            </select>
          </div>
          <p v-if="etat.avertissement" class="alert alert-warning" role="alert">{{ etat.avertissement }}</p>
          <SlotGrid v-if="etat.date" :creneaux="creneaux" :chargement="api.chargement" :erreur="api.erreur" :model-value="etat.heure" :libelle-jour="libelleJour(etat.date)" @update:model-value="choisirHeure" />
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
