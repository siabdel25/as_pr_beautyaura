from django.urls import path

from . import views

urlpatterns = [
    path('health/', views.health, name='health'),
    path('services/', views.liste_services, name='services'),
    path('creneaux/', views.liste_creneaux, name='creneaux'),
    path('reservations/', views.creer_reservation, name='reservations'),
]
