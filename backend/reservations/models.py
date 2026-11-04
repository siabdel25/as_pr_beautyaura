from django.db import models


class Service(models.Model):
    id = models.SlugField(primary_key=True, max_length=60)
    nom = models.CharField(max_length=120)
    categorie = models.CharField(max_length=40)
    duree_min = models.PositiveIntegerField()
    prix_a_partir_de = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['categorie', 'nom']

    def __str__(self):
        return self.nom


class HoraireOuverture(models.Model):
    JOURS = [('lun', 'Lundi'), ('mar', 'Mardi'), ('mer', 'Mercredi'), ('jeu', 'Jeudi'),
             ('ven', 'Vendredi'), ('sam', 'Samedi'), ('dim', 'Dimanche')]
    jour = models.CharField(max_length=3, choices=JOURS)
    debut = models.TimeField()
    fin = models.TimeField()

    class Meta:
        verbose_name = "horaire d'ouverture"

    def __str__(self):
        return f'{self.jour} {self.debut:%H:%M}-{self.fin:%H:%M}'


class Indisponibilite(models.Model):
    """Fermeture ou congé. Sans début ni fin : journée entière."""
    date = models.DateField()
    debut = models.TimeField(null=True, blank=True)
    fin = models.TimeField(null=True, blank=True)
    motif = models.CharField(max_length=120, blank=True)

    class Meta:
        verbose_name = 'indisponibilité'

    def __str__(self):
        return f'{self.date} {self.motif}'


class JourVerrou(models.Model):
    """Une ligne par jour réservé : on la verrouille pour sérialiser les réservations d'un même jour."""
    date = models.DateField(unique=True)


class Reservation(models.Model):
    A_CONFIRMER, CONFIRMEE, ANNULEE, REFUSEE = 'a_confirmer', 'confirmee', 'annulee', 'refusee'
    STATUTS = [(A_CONFIRMER, 'À confirmer'), (CONFIRMEE, 'Confirmée'), (ANNULEE, 'Annulée'), (REFUSEE, 'Refusée')]
    # Une demande à confirmer bloque déjà le créneau : sinon deux clientes obtiendraient le même.
    STATUTS_BLOQUANTS = (A_CONFIRMER, CONFIRMEE)

    statut = models.CharField(max_length=12, choices=STATUTS, default=A_CONFIRMER)
    date = models.DateField()
    debut = models.TimeField()
    fin = models.TimeField()
    duree_min = models.PositiveIntegerField()
    prestations = models.ManyToManyField(Service, related_name='reservations')

    prenom = models.CharField(max_length=80)
    nom = models.CharField(max_length=80)
    telephone = models.CharField(max_length=20)
    email = models.EmailField()
    premiere_visite = models.BooleanField()
    questionnaire = models.JSONField(default=dict, blank=True)
    precisions = models.TextField(blank=True)
    consentement_rgpd = models.BooleanField()
    cgv_acceptees = models.BooleanField()
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'debut']
        indexes = [models.Index(fields=['date', 'statut'])]

    def __str__(self):
        return f'{self.date} {self.debut:%H:%M} {self.prenom} {self.nom} ({self.get_statut_display()})'
