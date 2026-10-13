import { computed } from 'vue';
import { totalSelection, formaterDuree } from '../slots.js';

export default {
  name: 'ServicePicker',
  props: { services: { type: Array, required: true }, modelValue: { type: Array, required: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const total = computed(() => totalSelection(props.services, props.modelValue));
    const resume = computed(() => {
      if (!props.modelValue.length) return 'Aucune prestation choisie.';
      const prix = total.value.prix === null ? 'prix à confirmer' : `à partir de ${total.value.prix} €`;
      return `Durée totale : ${formaterDuree(total.value.dureeMin)}. Tarif : ${prix}.`;
    });
    const basculer = (id) => {
      const ids = props.modelValue.includes(id) ? props.modelValue.filter((x) => x !== id) : [...props.modelValue, id];
      emit('update:modelValue', ids);
    };
    const prixLibelle = (s) => (typeof s.prix_a_partir_de === 'number' ? `à partir de ${s.prix_a_partir_de} €` : 'prix à confirmer');
    return { total, resume, basculer, prixLibelle, formaterDuree };
  },
  template: `
    <fieldset class="lb-bk-services">
      <legend class="visually-hidden">Prestations souhaitées</legend>
      <ul class="lb-bk-liste">
        <li v-for="s in services" :key="s.id">
          <label class="lb-bk-choix" :class="{ 'lb-bk-choix--actif': modelValue.includes(s.id) }">
            <input type="checkbox" :value="s.id" :checked="modelValue.includes(s.id)" @change="basculer(s.id)">
            <span class="lb-bk-choix__texte">
              <span class="lb-bk-choix__nom">{{ s.nom }}</span>
              <span class="lb-bk-choix__desc">{{ s.description }}</span>
            </span>
            <span class="lb-bk-choix__meta">{{ formaterDuree(s.duree_min) }}<br>{{ prixLibelle(s) }}</span>
          </label>
        </li>
      </ul>
      <p class="lb-bk-total" aria-live="polite">{{ resume }}</p>
    </fieldset>`
};
