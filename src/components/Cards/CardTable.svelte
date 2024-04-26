<script>
  // core components
  import { onMount } from 'svelte';
  import TableEditProduct from "components/Dropdowns/TableEditProduct.svelte"; 
  import TableDeleteProduct from "components/Dropdowns/TableDeleteProduct.svelte";
  import axios from '../scripts/axiosConfig.js';
  import eventBus from '../scripts/eventBus.js';
  export let color = "light";

 
  let mensajeDesdeComponenteA = '';

  // Suscribirse al evento desde ComponenteA
  eventBus.on('cretaleTable', () => {
    fetchData()
  });

  // can be one of light or dark
  let responseData = 0;


   async function fetchData() {
    try {
      const response = await axios.get('/productos');
      responseData = response.data;
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  onMount(fetchData);

  const handleCustomEvent = () => {
    fetchData()
  };
</script>

<div  class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded {color === 'light' ? 'bg-white' : 'bg-red-800 text-white'}">
  <div class="rounded-t mb-0 px-4 py-3 border-0">
    <div class="flex flex-wrap items-center">
      <div class="relative w-full px-4 max-w-full flex-grow flex-1">
        <h3 class="font-semibold text-lg {color === 'light' ? 'text-blueGray-700' : 'text-white'}">
         Tabla de productos
        </h3>
      </div>
    </div>
  </div>
  <div class="block w-full overflow-x-auto">
    {#if responseData.length === 0}
    <p class="text-center py-4">No hay datos disponibles en la tabla.</p>
    {:else}
    <!-- Projects table -->
    <table class="items-center w-full bg-transparent border-collapse">
      <thead>
        <tr>
          <th class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left {color === 'light' ? 'bg-blueGray-50 text-blueGray-500 border-blueGray-100' : 'bg-red-700 text-red-200 border-red-600'}">
            Nombre Producto
          </th>
          <th class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left {color === 'light' ? 'bg-blueGray-50 text-blueGray-500 border-blueGray-100' : 'bg-red-700 text-red-200 border-red-600'}">
            Producto Precio
          </th>
          <th class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left {color === 'light' ? 'bg-blueGray-50 text-blueGray-500 border-blueGray-100' : 'bg-red-700 text-red-200 border-red-600'}">
            Producto Descripción
          </th>
          <th class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left {color === 'light' ? 'bg-blueGray-50 text-blueGray-500 border-blueGray-100' : 'bg-red-700 text-red-200 border-red-600'}">
            Editar
          </th>
          <th class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left {color === 'light' ? 'bg-blueGray-50 text-blueGray-500 border-blueGray-100' : 'bg-red-700 text-red-200 border-red-600'}">
            Eliminar
          </th>
        </tr>
      </thead>
      <tbody>
        {#each responseData as product}
          <tr>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              {product.nombre}
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              {product.precio}
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              {product.description}
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
            
              <TableEditProduct {product} on:customEvent={handleCustomEvent} />
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              <TableDeleteProduct {product} on:customEvent={handleCustomEvent} />
             </td>
          </tr>
        {/each}
      </tbody>
    </table>
    {/if}
  </div>
</div>
