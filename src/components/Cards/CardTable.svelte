<script>
  // core components
  import { onMount } from 'svelte';
  import TableEditProduct from "components/Dropdowns/TableEditProduct.svelte"; 
  import TableDeleteProduct from "components/Dropdowns/TableDeleteProduct.svelte";
  import axios from 'axios';
  import eventBus from 'components/Scripts/eventBus.js';
  export let color = "light";

 
  let mensajeDesdeComponenteA = '';

  // Suscribirse al evento desde ComponenteA
  eventBus.on('eventoDesdeComponenteA', () => {
    fetchData()
  });

  // can be one of light or dark
  let responseData = '';


   async function fetchData() {
    try {
      const response = await axios.get('http://localhost:3000/productos');
      responseData = response.data;
      console.log(responseData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  onMount(fetchData);

  const handleCustomEvent = () => {
    fetchData()
    console.log('hola buenos dias');
  };

  function handleTableUpdate() {
    fetchData();
    console.log('hola buenos dias handleTableUpdate');
  }

  onMount(() => {
    document.addEventListener('tableUpdated', handleTableUpdate);
    return () => {
      document.removeEventListener('tableUpdated', handleTableUpdate);
    };
  });

</script>

<div  class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded {color === 'light' ? 'bg-white' : 'bg-red-800 text-white'}">
  <div class="rounded-t mb-0 px-4 py-3 border-0">
    <div class="flex flex-wrap items-center">
      <div class="relative w-full px-4 max-w-full flex-grow flex-1">
        <h3 class="font-semibold text-lg {color === 'light' ? 'text-blueGray-700' : 'text-white'}">
          Card Tables
        </h3>
      </div>
    </div>
  </div>
  <div class="block w-full overflow-x-auto">
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
              {product.precio}
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
  </div>
</div>
