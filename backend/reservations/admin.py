from django.contrib import admin

from .models import HoraireOuverture, Indisponibilite, Reservation, Service


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('date', 'debut', 'prenom', 'nom', 'telephone', 'statut')
    list_filter = ('statut', 'date')
    search_fields = ('nom', 'prenom', 'email', 'telephone')
    actions = ['confirmer']

    @admin.action(description='Confirmer les demandes sélectionnées')
    def confirmer(self, request, queryset):
        queryset.filter(statut=Reservation.A_CONFIRMER).update(statut=Reservation.CONFIRMEE)


admin.site.register([Service, HoraireOuverture, Indisponibilite])
