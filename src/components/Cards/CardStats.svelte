<script>
  import { onMount } from 'svelte';
  import axios from './axiosConfig';

  let products = [];

  async function fetchData() {
    try {
      const response = await axios.get('/productos');
      products = response.data;
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  onMount(fetchData);
</script>

<div class="flex flex-wrap flex-row"> <!-- Cambiado flex-column a flex-row -->
  {#each products as product}
    <div class="w-full md:w-1/2 lg:w-1/3 xl:w-1/4 p-4">
      <div class="relative flex flex-col min-w-0 break-words bg-white rounded mb-6 xl:mb-0 shadow-lg">
        <div class="flex-auto p-4">
          <div class="flex flex-wrap">
            <div class="relative w-full pr-4 max-w-full flex-grow flex-1">
              <h5 class="text-blueGray-400 uppercase font-bold text-xs">{product.nombre}</h5>
              <span class="font-semibold text-xl text-blueGray-700">{product.precio}</span>
            </div>
            <p class="text-sm text-blueGray-400 mt-2">
              <span class="whitespace-nowrap">{product.description}</span>
            </p>
          </div>
          
          <div class="relative w-auto pl-4 mt-2 flex-center">
            <button class="text-white p-3 text-center inline-flex items-center justify-center w-12 h-12 shadow-lg rounded-full bg-red-500">
              <i class="far fa-chart-bar" style="margin-top: 2px;" > </i>
            </button>
          </div>
        </div>
      </div>
    </div>
  {/each}
</div>
