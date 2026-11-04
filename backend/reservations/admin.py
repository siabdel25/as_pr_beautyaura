from django.contrib import admin, messages

from . import services
from .models import HoraireOuverture, Indisponibilite, Reservation, Service


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('date', 'debut', 'prenom', 'nom', 'telephone', 'statut')
    list_filter = ('statut', 'date')
    search_fields = ('nom', 'prenom', 'email', 'telephone')
    readonly_fields = ('notifiee_le', 'confirmation_envoyee_le', 'rappel_envoye_le',
                       'annulation_envoyee_le', 'avis_demande_le', 'retouche_proposee_le', 'cree_le')
    actions = ['confirmer', 'refuser', 'annuler']

    @admin.action(description='Confirmer les demandes sélectionnées (la cliente est prévenue par e-mail)')
    def confirmer(self, request, queryset):
        n = sum(services.confirmer_reservation(r) for r in queryset)
        self.message_user(request, f'{n} demande(s) confirmée(s), e-mail de confirmation programmé.', messages.SUCCESS)

    @admin.action(description='Refuser les demandes à confirmer (la cliente est prévenue par e-mail)')
    def refuser(self, request, queryset):
        n = sum(services.cloturer_reservation(r, Reservation.REFUSEE) for r in queryset)
        self.message_user(request, f'{n} demande(s) refusée(s), e-mail programmé.', messages.SUCCESS)

    @admin.action(description='Annuler les rendez-vous sélectionnés (la cliente est prévenue par e-mail)')
    def annuler(self, request, queryset):
        n = sum(services.cloturer_reservation(r, Reservation.ANNULEE) for r in queryset)
        self.message_user(request, f'{n} rendez-vous annulé(s), e-mail programmé.', messages.SUCCESS)

    def save_model(self, request, obj, form, change):
        passe_a_confirmee = change and 'statut' in form.changed_data and obj.statut == Reservation.CONFIRMEE
        super().save_model(request, obj, form, change)
        if passe_a_confirmee:  # même effet que l'action, quand on change le statut dans le formulaire
            services.planifier_confirmation(obj)
        elif change and 'statut' in form.changed_data and obj.statut in (Reservation.REFUSEE, Reservation.ANNULEE):
            services.planifier_annulation(obj)


admin.site.register([Service, HoraireOuverture, Indisponibilite])
