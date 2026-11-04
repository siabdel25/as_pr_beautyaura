export default {
  name: 'SlotGrid',
  props: { creneaux: { type: Array, required: true }, modelValue: { type: String, default: null }, libelleJour: { type: String, default: '' },
    chargement: { type: Boolean, default: false }, erreur: { type: Boolean, default: false } },
  emits: ['update:modelValue'],
  template: `
    <fieldset class="lb-bk-creneaux">
      <legend class="lb-bk-sous-titre">Créneaux disponibles <span v-if="libelleJour">le {{ libelleJour }}</span></legend>
      <p v-if="chargement" class="lb-bk-vide" role="status">Chargement des créneaux…</p>
      <p v-else-if="erreur" class="alert alert-danger" role="alert">Les créneaux n’ont pas pu être chargés. Rechargez la page ou contactez le studio.</p>
      <p v-else-if="!creneaux.length" class="lb-bk-vide">Aucun créneau ce jour-là pour cette durée. Choisissez une autre date.</p>
      <div v-else class="lb-bk-grille">
        <label v-for="h in creneaux" :key="h" class="lb-bk-heure" :class="{ 'lb-bk-heure--actif': h === modelValue }">
          <input type="radio" name="creneau" :value="h" :checked="h === modelValue" @change="$emit('update:modelValue', h)">
          <span>{{ h.replace(':', ' h ') }}</span>
        </label>
      </div>
    </fieldset>`
};
