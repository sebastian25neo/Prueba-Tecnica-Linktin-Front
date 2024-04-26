<script>
  import { createEventDispatcher } from 'svelte';
  export let product;

  const dispatch = createEventDispatcher();

  let btnDropdownRef;

  const handleEdit = () => {

    dispatch('customEvent',{producto: product});

  };
</script>

<!-- Resto del código -->

<div>
  <button
    class="text-blueGray-500 py-1 px-3 rounded-full"
    bind:this="{btnDropdownRef}"
    on:click="{handleEdit}"
  >
  <i class="fas fa-shopping-cart"></i>
  </button>
</div>
