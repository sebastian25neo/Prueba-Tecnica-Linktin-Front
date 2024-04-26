<script>
  // core components
  import { onMount } from 'svelte';
  import TableEditPurchase from "components/Dropdowns/TableEditPurchase.svelte";
  import TableDeletePurchase from "components/Dropdowns/TableDeletePurchase.svelte"; 
  import axios from 'components/Scripts/axiosConfig.js';

  let color = "light";
  let listPurchasedProducts = [];


  async function fetchData() {
    try {
      const response = await axios.get('/pedidos');
      listPurchasedProducts = response.data;
      console.log(listPurchasedProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  onMount(fetchData);


  function incrementarCantidad(item) {
    const index = listPurchasedProducts.indexOf(item);
    const updatedItem = { ...item, cantidad: item.cantidad + 1 };
    listPurchasedProducts = [...listPurchasedProducts.slice(0, index), updatedItem, ...listPurchasedProducts.slice(index + 1)];
}


function decrementarCantidad(item) {
    if (item.cantidad > 0) {
        const index = listPurchasedProducts.indexOf(item);
        const updatedItem = { ...item, cantidad: item.cantidad - 1 };
        listPurchasedProducts = [...listPurchasedProducts.slice(0, index), updatedItem, ...listPurchasedProducts.slice(index + 1)];
    }
}

const handleCustomEvent = () => {
   fetchData()
  };

</script>



<div class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded {color === 'light' ? 'bg-white' : 'bg-red-800 text-white'}">
  <div class="rounded-t mb-0 px-4 py-3 border-0">
    <div class="flex flex-wrap items-center">
      <div class="relative w-full px-4 max-w-full flex-grow flex-1">
        <h3 class="font-semibold text-lg {color === 'light' ? 'text-blueGray-700' : 'text-white'}">
          Listado de Productos comprados
        </h3>
      </div>
    </div>
  </div>
  <div class="block w-full overflow-x-auto">

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
            Cantidad
          </th>
          <th class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left {color === 'light' ? 'bg-blueGray-50 text-blueGray-500 border-blueGray-100' : 'bg-red-700 text-red-200 border-red-600'}">
           Editar Cantidad
          </th>
          <th class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left {color === 'light' ? 'bg-blueGray-50 text-blueGray-500 border-blueGray-100' : 'bg-red-700 text-red-200 border-red-600'}">
            Acciones
          </th>
        </tr>
      </thead>

      <tbody>
        {#each listPurchasedProducts as item}
          <tr>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              {item.nombreProducto}
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              {item.precioProducto}
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
            
              <div class="flex items-center">
                <button class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-4 rounded-l" on:click={() => decrementarCantidad(item)}> - </button>
                <input type="number" min="1" bind:value={item.cantidad} class="w-full border border-gray-300 rounded px-3 py-1 focus:outline-none focus:border-indigo-500 text-xs text-center">
                <button class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-4 rounded-r" on:click={() => incrementarCantidad(item)}> + </button>
              </div>
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              <TableEditPurchase {item} on:customEvent={handleCustomEvent} />
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              <TableDeletePurchase {item} on:customEvent={handleCustomEvent} />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

