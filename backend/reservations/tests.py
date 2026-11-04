import json
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.cache import cache
from unittest import mock

from django.core import mail
from django.core.management import call_command
from django.test import SimpleTestCase, TestCase, override_settings

from . import services, slots, tasks
from .models import HoraireOuverture, Indisponibilite, Reservation, Service

PARIS = ZoneInfo('Europe/Paris')
CONFIG = {'fuseau': 'Europe/Paris', 'tampon_min': 15, 'delai_min_heures': 12, 'horizon_jours': 60, 'pas_creneau_min': 30}
HORAIRES = {'mar': ['09:30-18:30'], 'mer': ['09:30-18:30'], 'jeu': ['09:30-18:30'],
            'ven': ['09:30-18:30'], 'sam': ['09:30-18:30']}


def paris(y, m, d, h=0, mi=0):
    return datetime(y, m, d, h, mi, tzinfo=PARIS)


def creneaux(jour, duree=60, indispos=(), resas=(), now=paris(2026, 11, 1, 8)):
    return slots.creneaux_du_jour(jour, duree, CONFIG, HORAIRES, list(indispos), list(resas), now)


class SlotsTests(SimpleTestCase):
    MERCREDI = date(2026, 11, 11)

    def test_journee_ouverte(self):
        c = creneaux(self.MERCREDI, 60)
        self.assertEqual(c[0], '09:30')
        self.assertEqual(c[-1], '17:30')  # 17:30 + 60 min = 18:30 = fermeture

    def test_jour_ferme(self):
        self.assertEqual(creneaux(date(2026, 11, 9)), [])  # lundi

    def test_indisponibilite_journee_entiere(self):
        self.assertEqual(creneaux(self.MERCREDI, 60, indispos=[(self.MERCREDI, None, None)]), [])

    def test_indisponibilite_partielle_sans_tampon(self):
        c = creneaux(self.MERCREDI, 60, indispos=[(self.MERCREDI, '14:00', '18:30')])
        self.assertIn('13:00', c)       # finit à 14:00 pile : autorisé
        self.assertNotIn('13:30', c)

    def test_reservation_et_tampon(self):
        c = creneaux(self.MERCREDI, 60, resas=[(self.MERCREDI, '10:00', '12:30')])
        self.assertNotIn('09:30', c)    # finirait à 10:30, chevauche
        self.assertNotIn('12:30', c)    # tampon de 15 min après la fin
        self.assertIn('13:00', c)

    def test_delai_minimum_12h(self):
        now = paris(2026, 11, 10, 20, 0)  # veille au soir : limite = mercredi 08:00
        self.assertEqual(creneaux(self.MERCREDI, 60, now=now)[0], '09:30')
        now = paris(2026, 11, 11, 0, 0)
        self.assertEqual(creneaux(self.MERCREDI, 60, now=now)[0], '12:00')  # limite 12:00

    def test_passe_et_horizon(self):
        self.assertEqual(creneaux(date(2026, 10, 28), 60), [])
        loin = date(2026, 11, 1) + timedelta(days=61)
        self.assertEqual(creneaux(loin, 60), [])

    def test_changement_heure_octobre(self):
        # Fin de l'heure d'été le 25/10/2026 : le jour compte 25 h, le délai de 12 h aussi.
        now = paris(2026, 10, 24, 20, 0)
        c = slots.creneaux_du_jour(date(2026, 10, 27), 60, CONFIG, HORAIRES, [], [], now)
        self.assertEqual(c[0], '09:30')

    def test_changement_heure_mars(self):
        # Début de l'heure d'été le 29/03/2026 : samedi 28 à 22:00 + 12 h réelles.
        now = paris(2026, 3, 28, 22, 0)
        c = slots.creneaux_du_jour(date(2026, 3, 31), 60, CONFIG, HORAIRES, [], [], now)
        self.assertEqual(c[0], '09:30')


class ConfigTests(SimpleTestCase):
    def test_miroir_du_frontend(self):
        f = Path(settings.BASE_DIR).parent / 'frontend' / 'data' / 'reservation.json'
        if not f.exists():
            self.skipTest('frontend/data absent (image Docker)')
        d = json.loads(f.read_text(encoding='utf-8'))
        for k in ('tampon_min', 'delai_min_heures', 'horizon_jours', 'pas_creneau_min'):
            self.assertEqual(settings.RESERVATION[k], d[k], k)
        self.assertEqual(settings.RESERVATION['fuseau'], d['fuseau'])


class ApiBase(TestCase):
    def setUp(self):
        cache.clear()
        for jour, plage in (('mar', '09:30-18:30'), ('mer', '09:30-18:30'), ('jeu', '09:30-18:30'),
                            ('ven', '09:30-18:30'), ('sam', '09:30-18:30')):
            HoraireOuverture.objects.create(jour=jour, debut=time(9, 30), fin=time(18, 30))
        self.pose = Service.objects.create(id='pose', nom='Pose', categorie='extensions', duree_min=150)
        self.lift = Service.objects.create(id='lift', nom='Rehaussement', categorie='rehaussement', duree_min=60)
        j = date.today() + timedelta(days=7)
        while j.weekday() != 2:  # mercredi
            j += timedelta(days=1)
        self.jour = j

    def resa(self, statut=Reservation.CONFIRMEE, jour=None, debut=time(10, 0)):
        r = Reservation.objects.create(
            statut=statut, date=jour or self.jour, debut=debut, fin=time(11, 0), duree_min=60, prenom='Léa', nom='Martin',
            telephone='0612345678', email='lea@example.test', premiere_visite=False, consentement_rgpd=True, cgv_acceptees=True)
        r.prestations.set([self.lift])
        return r

    def payload(self, **kw):
        base = {
            'prestations': [{'id': 'lift', 'nom': 'x'}], 'date': self.jour.isoformat(), 'heure': '10:00',
            'client': {'prenom': 'Léa', 'nom': 'Martin', 'telephone': '06 12 34 56 78', 'email': 'lea@example.test'},
            'premiere_visite': 'non', 'consentement_rgpd': True, 'cgv_acceptees': True,
            'statut': 'confirme', 'duree_min': 1, 'envoye_le': '2026-01-01T00:00:00Z',
        }
        base.update(kw)
        return base

    def post(self, **kw):
        return self.client.post('/api/v1/reservations/', self.payload(**kw), content_type='application/json')


class ReservationApiTests(ApiBase):
    def test_creation_toujours_a_confirmer(self):
        r = self.post()
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['statut'], 'a_confirmer')  # le 'statut' du client est ignoré
        resa = Reservation.objects.get()
        self.assertEqual(resa.duree_min, 60)                 # durée recalculée par le serveur
        self.assertEqual((resa.debut, resa.fin), (time(10, 0), time(11, 0)))

    def test_double_reservation_refusee(self):
        self.assertEqual(self.post().status_code, 201)
        self.assertEqual(self.post(heure='10:30').status_code, 409)  # chevauche
        self.assertEqual(self.post(heure='11:00').status_code, 409)  # tampon de 15 min
        self.assertEqual(self.post(heure='11:30').status_code, 201)

    def test_creneau_annule_se_libere(self):
        self.post()
        Reservation.objects.update(statut=Reservation.ANNULEE)
        self.assertEqual(self.post().status_code, 201)

    def test_hors_horaires_et_jour_ferme(self):
        self.assertEqual(self.post(heure='18:00').status_code, 409)
        Indisponibilite.objects.create(date=self.jour, motif='Fermeture')
        self.assertEqual(self.post().status_code, 409)

    def test_validations(self):
        mauvais = [
            {'client': {'prenom': 'L', 'nom': 'M', 'telephone': '123', 'email': 'lea@example.test'}},
            {'client': {'prenom': 'L', 'nom': 'M', 'telephone': '0612345678', 'email': 'pas-un-mail'}},
            {'prestations': [{'id': 'inconnue'}]},
            {'prestations': []},
            {'prestations': [{'id': 'lift'}, {'id': 'lift'}]},
            {'consentement_rgpd': False},
            {'cgv_acceptees': False},
            {'heure': '25:00'},
            {'premiere_visite': 'peut-etre'},
            {'premiere_visite': 'oui'},  # questionnaire absent
        ]
        for kw in mauvais:
            with self.subTest(kw=kw):
                cache.clear()  # la limitation de fréquence (5/h) a son propre test
                self.assertEqual(self.post(**kw).status_code, 400)
        self.assertEqual(Reservation.objects.count(), 0)

    def test_premiere_visite_avec_questionnaire(self):
        q = {'allergie_colle': 'oui', 'traitement_oculaire': 'non', 'grossesse': 'non'}
        self.assertEqual(self.post(premiere_visite='oui', questionnaire=q).status_code, 201)
        self.assertEqual(Reservation.objects.get().questionnaire['allergie_colle'], 'oui')

    def test_honeypot_n_enregistre_rien(self):
        r = self.post(site_web='http://spam.example')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Reservation.objects.count(), 0)

    def test_limitation_de_frequence(self):
        codes = [self.post(prestations=[]).status_code for _ in range(6)]
        self.assertEqual(codes[:5], [400] * 5)
        self.assertEqual(codes[5], 429)


class ReadApiTests(ApiBase):
    def test_services(self):
        r = self.client.get('/api/v1/services/')
        self.assertEqual({s['id'] for s in r.json()}, {'pose', 'lift'})

    def test_creneaux(self):
        r = self.client.get('/api/v1/creneaux/', {'date': self.jour.isoformat(), 'services': 'lift'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['duree_min'], 60)
        self.assertEqual(r.json()['creneaux'][0], '09:30')

    def test_creneaux_somme_des_durees(self):
        r = self.client.get('/api/v1/creneaux/', {'date': self.jour.isoformat(), 'services': 'lift,pose'})
        self.assertEqual(r.json()['duree_min'], 210)
        self.assertEqual(r.json()['creneaux'][-1], '15:00')

    def test_creneaux_parametres_invalides(self):
        for q in ({}, {'date': 'demain', 'services': 'lift'}, {'date': self.jour.isoformat()},
                  {'date': self.jour.isoformat(), 'services': 'zzz'}):
            self.assertEqual(self.client.get('/api/v1/creneaux/', q).status_code, 400)

    def test_health(self):
        self.assertEqual(self.client.get('/api/v1/health/').json(), {'status': 'ok'})


class NotificationTests(ApiBase):
    RISQUE = {'allergie_colle': 'oui', 'traitement_oculaire': 'non', 'grossesse': 'non'}

    def creer(self, **kw):
        with self.captureOnCommitCallbacks(execute=True):
            return self.post(**kw)

    def test_creation_planifie_la_notification_apres_commit(self):
        with mock.patch.object(tasks.notifier_praticienne, 'delay') as delay:
            self.assertEqual(self.creer().status_code, 201)
        delay.assert_called_once_with(Reservation.objects.get().pk)

    def test_pas_de_notification_si_refus_ou_honeypot(self):
        with mock.patch.object(tasks.notifier_praticienne, 'delay') as delay:
            self.creer(heure='18:00')                      # 409
            self.creer(site_web='spam')                    # honeypot
            self.creer(prestations=[])                     # 400
        delay.assert_not_called()

    def test_broker_arrete_n_empeche_pas_la_demande(self):
        with mock.patch.object(tasks.notifier_praticienne, 'delay', side_effect=ConnectionError('redis')):
            r = self.creer()
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Reservation.objects.get().notifiee_le, None)

    @override_settings(STUDIO_EMAIL='studio@example.test')
    def test_tache_envoie_un_mail_une_seule_fois(self):
        with mock.patch.object(tasks.notifier_praticienne, 'delay'):
            self.creer(premiere_visite='oui', questionnaire=self.RISQUE, precisions='Yeux sensibles')
        pk = Reservation.objects.get().pk
        self.assertEqual(tasks.notifier_praticienne(pk), 'envoyee')
        self.assertEqual(tasks.notifier_praticienne(pk), 'ignoree')   # rejeu : pas de doublon
        self.assertEqual(len(mail.outbox), 1)
        m = mail.outbox[0]
        self.assertEqual(m.to, ['studio@example.test'])
        self.assertIn('À CONFIRMER', m.body)
        self.assertIn('Léa Martin', m.body)
        self.assertIn('10:00 à 11:00', m.body)
        self.assertIn('allergie connue à la colle', m.body)           # réponse à risque signalée
        self.assertIn('Yeux sensibles', m.body)
        self.assertNotIn('confirmée', m.body.lower().replace('à confirmer', ''))
        self.assertIsNotNone(Reservation.objects.get().notifiee_le)

    @override_settings(STUDIO_EMAIL='')
    def test_sans_destinataire_ne_plante_pas(self):
        with mock.patch.object(tasks.notifier_praticienne, 'delay'):
            self.creer()
        self.assertEqual(tasks.notifier_praticienne(Reservation.objects.get().pk), 'sans_destinataire')
        self.assertEqual(len(mail.outbox), 0)

    def test_reservation_supprimee(self):
        self.assertEqual(tasks.notifier_praticienne(999), 'ignoree')

    def test_commande_renvoyer_notifications(self):
        with mock.patch.object(tasks.notifier_praticienne, 'delay'):
            self.creer()
            self.creer(heure='13:00')
        Reservation.objects.filter(debut=time(13, 0)).update(statut=Reservation.ANNULEE)
        with mock.patch.object(tasks.notifier_praticienne, 'delay') as delay:
            call_command('renvoyer_notifications')
        delay.assert_called_once_with(Reservation.objects.get(debut=time(10, 0)).pk)


class PlanningTests(ApiBase):
    def test_rattrapage_ignore_les_notifiees_et_les_toutes_recentes(self):
        ancienne = self.resa(statut=Reservation.A_CONFIRMER)
        Reservation.objects.filter(pk=ancienne.pk).update(cree_le=datetime.now(PARIS) - timedelta(minutes=30))
        self.resa(statut=Reservation.A_CONFIRMER, debut=time(14, 0))   # créée à l'instant
        with mock.patch.object(tasks.notifier_praticienne, 'delay') as delay:
            self.assertEqual(tasks.rattraper_notifications(), 1)
        delay.assert_called_once_with(ancienne.pk)

    def test_rappel_j1_seulement_pour_les_confirmees_de_demain(self):
        veille = self.jour - timedelta(days=1)
        maintenant = datetime(veille.year, veille.month, veille.day, 10, 0, tzinfo=PARIS).isoformat()
        ok = self.resa()
        self.resa(statut=Reservation.A_CONFIRMER, debut=time(14, 0))
        self.resa(statut=Reservation.ANNULEE, debut=time(16, 0))
        self.resa(jour=self.jour + timedelta(days=1))
        with mock.patch.object(tasks.envoyer_rappel, 'delay') as delay:
            self.assertEqual(tasks.envoyer_rappels_j1(maintenant), 1)
        delay.assert_called_once_with(ok.pk)

    def test_rappel_envoye_une_fois_au_client(self):
        r = self.resa()
        self.assertEqual(tasks.envoyer_rappel(r.pk), 'envoyee')
        self.assertEqual(tasks.envoyer_rappel(r.pk), 'ignoree')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['lea@example.test'])
        self.assertIn('10:00', mail.outbox[0].body)

    def test_pas_de_rappel_pour_une_demande_a_confirmer(self):
        r = self.resa(statut=Reservation.A_CONFIRMER)
        self.assertEqual(tasks.envoyer_rappel(r.pk), 'ignoree')
        self.assertEqual(len(mail.outbox), 0)

    def test_planning_beat_declare_des_taches_existantes(self):
        from pr_beautyaura.celery import app
        app.loader.import_default_modules()
        for nom, entree in settings.CELERY_BEAT_SCHEDULE.items():
            self.assertIn(entree['task'], app.tasks, nom)


class ConfirmationTests(ApiBase):
    def setUp(self):
        super().setUp()
        from django.contrib.auth import get_user_model
        self.admin = get_user_model().objects.create_superuser('admin', 'a@example.test', 'pw')

    def test_confirmer_planifie_l_envoi_une_seule_fois(self):
        r = self.resa(statut=Reservation.A_CONFIRMER)
        with mock.patch.object(tasks.envoyer_confirmation, 'delay') as delay:
            with self.captureOnCommitCallbacks(execute=True):
                self.assertTrue(services.confirmer_reservation(r))
                self.assertFalse(services.confirmer_reservation(r))   # déjà confirmée
        delay.assert_called_once_with(r.pk)
        r.refresh_from_db()
        self.assertEqual(r.statut, Reservation.CONFIRMEE)

    def test_on_ne_confirme_pas_une_annulee(self):
        r = self.resa(statut=Reservation.ANNULEE)
        self.assertFalse(services.confirmer_reservation(r))
        r.refresh_from_db()
        self.assertEqual(r.statut, Reservation.ANNULEE)

    @override_settings(STUDIO_EMAIL='studio@example.test', STUDIO_NOM='Studio Test')
    def test_mail_de_confirmation_avec_invitation(self):
        r = self.resa(statut=Reservation.CONFIRMEE)
        self.assertEqual(tasks.envoyer_confirmation(r.pk), 'envoyee')
        self.assertEqual(tasks.envoyer_confirmation(r.pk), 'ignoree')
        self.assertEqual(len(mail.outbox), 1)
        m = mail.outbox[0]
        self.assertEqual(m.to, ['lea@example.test'])
        self.assertEqual(m.reply_to, ['studio@example.test'])
        self.assertIn('10:00 à 11:00', m.body)
        nom, contenu, type_mime = m.attachments[0]
        self.assertEqual((nom, type_mime), ('rendez-vous.ics', 'text/calendar'))
        self.assertIn('BEGIN:VEVENT', contenu)

    def test_pas_de_mail_si_la_demande_n_est_pas_confirmee(self):
        r = self.resa(statut=Reservation.A_CONFIRMER)
        self.assertEqual(tasks.envoyer_confirmation(r.pk), 'ignoree')
        self.assertEqual(len(mail.outbox), 0)

    def test_action_admin(self):
        r = self.resa(statut=Reservation.A_CONFIRMER)
        self.client.force_login(self.admin)
        with mock.patch.object(tasks.envoyer_confirmation, 'delay') as delay:
            with self.captureOnCommitCallbacks(execute=True):
                rep = self.client.post('/admin/reservations/reservation/', {'action': 'confirmer', '_selected_action': [r.pk]})
        self.assertEqual(rep.status_code, 302)
        delay.assert_called_once_with(r.pk)

    def test_changement_de_statut_dans_le_formulaire_admin(self):
        from django.contrib import admin as dj_admin
        ma = dj_admin.site._registry[Reservation]
        r = self.resa(statut=Reservation.A_CONFIRMER)
        r.statut = Reservation.CONFIRMEE
        form = mock.Mock(changed_data=['statut'])
        with mock.patch.object(tasks.envoyer_confirmation, 'delay') as delay:
            with self.captureOnCommitCallbacks(execute=True):
                ma.save_model(mock.Mock(), r, form, change=True)
        delay.assert_called_once_with(r.pk)
        form.changed_data = ['telephone']
        with mock.patch.object(tasks.envoyer_confirmation, 'delay') as delay:
            with self.captureOnCommitCallbacks(execute=True):
                ma.save_model(mock.Mock(), r, form, change=True)
        delay.assert_not_called()


class AnnulationTests(ApiBase):
    def test_refuser_et_annuler_planifient_un_seul_envoi(self):
        a, b = self.resa(statut=Reservation.A_CONFIRMER), self.resa(statut=Reservation.CONFIRMEE)
        with mock.patch.object(tasks.envoyer_annulation, 'delay') as delay:
            with self.captureOnCommitCallbacks(execute=True):
                self.assertTrue(services.cloturer_reservation(a, Reservation.REFUSEE))
                self.assertFalse(services.cloturer_reservation(a, Reservation.REFUSEE))
                self.assertTrue(services.cloturer_reservation(b, Reservation.ANNULEE))
        self.assertEqual(delay.call_count, 2)
        a.refresh_from_db()
        self.assertEqual(a.statut, Reservation.REFUSEE)

    def test_on_ne_refuse_pas_une_confirmee(self):
        r = self.resa(statut=Reservation.CONFIRMEE)
        self.assertFalse(services.cloturer_reservation(r, Reservation.REFUSEE))
        r.refresh_from_db()
        self.assertEqual(r.statut, Reservation.CONFIRMEE)

    @override_settings(STUDIO_NOM='Studio Test')
    def test_mails_refus_et_annulation(self):
        for statut, texte in ((Reservation.REFUSEE, 'ne pouvons malheureusement pas'),
                              (Reservation.ANNULEE, 'est annulé')):
            mail.outbox.clear()
            r = self.resa(statut=statut)
            self.assertEqual(tasks.envoyer_annulation(r.pk), 'envoyee')
            self.assertEqual(tasks.envoyer_annulation(r.pk), 'ignoree')
            self.assertEqual(len(mail.outbox), 1)
            self.assertEqual(mail.outbox[0].to, ['lea@example.test'])
            self.assertIn(texte, mail.outbox[0].body)
            self.assertNotIn('confirmé', mail.outbox[0].body)

    def test_pas_de_mail_pour_une_demande_active(self):
        for statut in (Reservation.A_CONFIRMER, Reservation.CONFIRMEE):
            r = self.resa(statut=statut)
            self.assertEqual(tasks.envoyer_annulation(r.pk), 'ignoree')
        self.assertEqual(len(mail.outbox), 0)

    def test_actions_admin_et_formulaire(self):
        from django.contrib import admin as dj_admin
        from django.contrib.auth import get_user_model
        self.client.force_login(get_user_model().objects.create_superuser('admin', 'a@example.test', 'pw'))
        r = self.resa(statut=Reservation.A_CONFIRMER)
        with mock.patch.object(tasks.envoyer_annulation, 'delay') as delay:
            with self.captureOnCommitCallbacks(execute=True):
                self.client.post('/admin/reservations/reservation/', {'action': 'refuser', '_selected_action': [r.pk]})
        delay.assert_called_once_with(r.pk)
        ma = dj_admin.site._registry[Reservation]
        r.statut = Reservation.ANNULEE
        with mock.patch.object(tasks.envoyer_annulation, 'delay') as delay:
            with self.captureOnCommitCallbacks(execute=True):
                ma.save_model(mock.Mock(), r, mock.Mock(changed_data=['statut']), change=True)
        delay.assert_called_once_with(r.pk)


class SuiviTests(ApiBase):
    def setUp(self):
        super().setUp()
        self.aujourdhui = date(2026, 6, 20)
        self.maintenant = '2026-06-20T09:00:00+00:00'

    def resa_a(self, jours_avant, statut=Reservation.CONFIRMEE, service=None):
        r = self.resa(statut=statut, jour=self.aujourdhui - timedelta(days=jours_avant))
        if service:
            r.prestations.set([service])
        return r

    @override_settings(AVIS_URL='https://avis.example.test/x')
    def test_avis_a_j2_seulement_pour_les_confirmees(self):
        ok = self.resa_a(2)
        self.resa_a(2, statut=Reservation.ANNULEE)
        self.resa_a(1)  # trop tôt
        with mock.patch.object(tasks.envoyer_avis, 'delay') as delay, \
                mock.patch.object(tasks.envoyer_relance_retouche, 'delay'):
            self.assertEqual(tasks.envoyer_suivis(self.maintenant)['avis'], 1)
        delay.assert_called_once_with(ok.pk)

    @override_settings(AVIS_URL='')
    def test_pas_d_avis_sans_lien(self):
        self.resa_a(2)
        self.assertEqual(tasks.envoyer_avis(self.resa_a(2).pk), 'sans_lien')
        with mock.patch.object(tasks.envoyer_avis, 'delay') as delay:
            self.assertEqual(tasks.envoyer_suivis(self.maintenant)['avis'], 0)
        delay.assert_not_called()
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(AVIS_URL='https://avis.example.test/x', STUDIO_NOM='Studio Test')
    def test_mail_d_avis_une_seule_fois(self):
        r = self.resa_a(2)
        self.assertEqual(tasks.envoyer_avis(r.pk), 'envoyee')
        self.assertEqual(tasks.envoyer_avis(r.pk), 'ignoree')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('https://avis.example.test/x', mail.outbox[0].body)

    def test_rattrapage_apres_un_jour_manque(self):
        with override_settings(AVIS_URL='https://a.test'), \
                mock.patch.object(tasks.envoyer_avis, 'delay') as delay:
            self.resa_a(5)
            tasks.envoyer_suivis(self.maintenant)
        self.assertEqual(delay.call_count, 1)

    def test_retouche_pour_les_extensions_seulement(self):
        ext = self.resa_a(18, service=self.pose)
        self.resa_a(18)  # rehaussement : pas de retouche
        with mock.patch.object(tasks.envoyer_relance_retouche, 'delay') as delay:
            self.assertEqual(tasks.envoyer_suivis(self.maintenant)['retouche'], 1)
        delay.assert_called_once_with(ext.pk)

    def test_pas_de_relance_si_deja_un_prochain_rendez_vous(self):
        self.resa_a(18, service=self.pose)
        self.resa(statut=Reservation.A_CONFIRMER, jour=self.aujourdhui + timedelta(days=5))
        with mock.patch.object(tasks.envoyer_relance_retouche, 'delay') as delay:
            self.assertEqual(tasks.envoyer_suivis(self.maintenant)['retouche'], 0)
        delay.assert_not_called()

    @override_settings(SITE_URL='https://site.example.test')
    def test_mail_de_retouche_sans_promesse(self):
        r = self.resa_a(18, service=self.pose)
        self.assertEqual(tasks.envoyer_relance_retouche(r.pk), 'envoyee')
        self.assertEqual(tasks.envoyer_relance_retouche(r.pk), 'ignoree')
        self.assertIn('https://site.example.test', mail.outbox[0].body)
        self.assertNotIn('confirmé', mail.outbox[0].body)


class IcsTests(ApiBase):
    def test_heure_utc_hiver_et_ete(self):
        from .ics import generer_ics
        hiver = self.resa(jour=date(2026, 12, 2))
        ete = self.resa(jour=date(2026, 7, 1), debut=time(10, 0))
        self.assertIn('DTSTART:20261202T090000Z', generer_ics(hiver, 'S', 'Europe/Paris'))  # UTC+1
        self.assertIn('DTSTART:20260701T080000Z', generer_ics(ete, 'S', 'Europe/Paris'))    # UTC+2
        self.assertIn('DTEND:20261202T100000Z', generer_ics(hiver, 'S', 'Europe/Paris'))

    def test_format_crlf_echappement_et_pliage(self):
        from .ics import generer_ics
        r = self.resa()
        s = generer_ics(r, 'Studio; Lash, & Brow' + ' très long' * 12, 'Europe/Paris')
        self.assertTrue(s.startswith('BEGIN:VCALENDAR\r\n') and s.endswith('END:VCALENDAR\r\n'))
        self.assertIn('Studio\\; Lash\\,', s)
        for ligne in s.split('\r\n'):
            self.assertLessEqual(len(ligne.encode('utf-8')), 75)


class DisponibilitesTests(ApiBase):
    def mois(self, jour=None, services='lift'):
        jour = jour or self.jour
        return self.client.get('/api/v1/disponibilites/', {'month': f'{jour:%Y-%m}', 'services': services})

    def test_jours_ouverts_seulement(self):
        r = self.mois()
        self.assertEqual(r.status_code, 200)
        dates = r.json()['dates']
        self.assertIn(self.jour.isoformat(), dates)
        for d in dates:
            self.assertNotIn(date.fromisoformat(d).weekday(), (0, 6))   # lundi et dimanche fermés
            self.assertGreaterEqual(date.fromisoformat(d), date.today())

    def test_jour_ferme_et_jour_complet_disparaissent(self):
        Indisponibilite.objects.create(date=self.jour, motif='Congé')
        self.assertNotIn(self.jour.isoformat(), self.mois().json()['dates'])

    def test_jour_entierement_reserve_disparait(self):
        suivant = self.jour + timedelta(days=1)   # jeudi
        for h in range(9, 18):
            Reservation.objects.create(
                statut=Reservation.A_CONFIRMER, date=suivant, debut=time(h, 30) if h < 18 else time(9, 30), fin=time(h + 1, 30) if h < 17 else time(18, 30),
                duree_min=60, prenom='A', nom='B', telephone='0612345678', email='a@example.test',
                premiere_visite=False, consentement_rgpd=True, cgv_acceptees=True)
        self.assertNotIn(suivant.isoformat(), self.mois(suivant).json()['dates'])

    def test_coherent_avec_les_creneaux(self):
        """Un jour est listé si et seulement si /creneaux/ y trouve au moins une heure."""
        dates = set(self.mois(services='pose,lift').json()['dates'])
        premier = self.jour.replace(day=1)
        for n in range(31):
            jour = premier + timedelta(days=n)
            if jour.month != premier.month:
                break
            r = self.client.get('/api/v1/creneaux/', {'date': jour.isoformat(), 'services': 'pose,lift'}).json()
            self.assertEqual(bool(r['creneaux']), jour.isoformat() in dates, jour)

    def test_duree_plus_longue_reduit_les_jours(self):
        indispo = self.jour
        Indisponibilite.objects.create(date=indispo, debut=time(10, 0), fin=time(18, 30))   # reste 09:30-10:00 seulement
        court = self.client.get('/api/v1/disponibilites/', {'month': f'{indispo:%Y-%m}', 'services': 'lift'}).json()['dates']
        self.assertNotIn(indispo.isoformat(), court)   # 60 min ne tiennent pas dans 30 min

    def test_parametres_invalides(self):
        for q in ({}, {'month': '2026-13', 'services': 'lift'}, {'month': 'novembre', 'services': 'lift'},
                  {'month': '2026-11'}, {'month': '2026-11', 'services': 'zzz'}):
            self.assertEqual(self.client.get('/api/v1/disponibilites/', q).status_code, 400, q)

    def test_peu_de_requetes_sql(self):
        with self.assertNumQueries(4):   # services + horaires + indisponibilités + réservations, quel que soit le mois
            self.mois()
