<script>
  // core components
  import { onMount } from 'svelte';
  import Swal from 'sweetalert2';
  import TableAddShoppingCart from "components/Dropdowns/TableAddShoppingCart.svelte"; 
  import axios from 'axios';

  let color = "light";
  let responseData = [];
  let carrito = [];
  let responseMessage = '';

  // Suscribirse al evento desde ComponenteA


  async function fetchData() {
    try {
      const response = await axios.get('http://localhost:3000/productos');
      responseData = response.data;
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  onMount(fetchData);

  const handleCustomEvent = (event) => {
    agregarAlCarrito(event.detail.producto);
   
  };

  function agregarAlCarrito(producto) {
   
    const existeEnCarrito = carrito.find(item => item.id === producto.id);
    
    // Si el producto ya está en el carrito, no lo agregamos de nuevo
    if (existeEnCarrito) return;

    // Creamos un nuevo objeto con la cantidad inicializada en la cantidad real del producto
    const productoConCantidad = { ...producto, cantidad: 1 };
    carrito = [...carrito, productoConCantidad];
    
  }

  function incrementarCantidad(item) {
    const index = carrito.indexOf(item);
    const updatedItem = { ...item, cantidad: item.cantidad + 1 };
    carrito = [...carrito.slice(0, index), updatedItem, ...carrito.slice(index + 1)];
}


function decrementarCantidad(item) {
    if (item.cantidad > 0) {
        const index = carrito.indexOf(item);
        const updatedItem = { ...item, cantidad: item.cantidad - 1 };
        carrito = [...carrito.slice(0, index), updatedItem, ...carrito.slice(index + 1)];
    }
}


async function buyProduct(item) {

  console.log(item);
  if (!item.cantidad || item.cantidad <= 0 ) {
      Swal.fire({
        icon: 'error',
        text: 'El campo no puede estar vacío, ser igual a 0 o contener números negativoss.',
      });
      return; // Salir de la función si hay campos vacíos
    }

    let postData = {
      "productoId": item.id,
      "cantidad": item.cantidad
  };

    try {
      const response = await axios.post('http://localhost:3000/pedidos', postData);
      responseMessage = response.data.message;
      console.log(responseMessage);
    Swal.fire({
        icon: 'success',
        text: responseMessage,
    });

    carrito = carrito.filter(producto => producto !== item);


    } catch (error) {
      console.error('Error sending data:', error);
      Swal.fire({
        icon: 'error',
        text: error,
    });
    }
}

</script>

<div class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded {color === 'light' ? 'bg-white' : 'bg-red-800 text-white'}">
  <div class="rounded-t mb-0 px-4 py-3 border-0">
    <div class="flex flex-wrap items-center">
      <div class="relative w-full px-4 max-w-full flex-grow flex-1">
        <h3 class="font-semibold text-lg {color === 'light' ? 'text-blueGray-700' : 'text-white'}">
         Lista de productos
        </h3>
      </div>
    </div>
  </div>
  <div class="block w-full overflow-x-auto">
    <!-- Projects table -->
    <table class="items-center w-full bg-transparent border-collapse">
      <!-- Encabezado de la tabla -->
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
            Agregar al carrito de compras
          </th>
        </tr>
      </thead>
      <!-- Cuerpo de la tabla -->
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
              <!-- Aquí llamamos al componente TableAddShoppingCart y pasamos el producto -->
              <TableAddShoppingCart {product} on:customEvent={handleCustomEvent} />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- Tabla carrito de compras -->
<div class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded {color === 'light' ? 'bg-white' : 'bg-red-800 text-white'}">
  <div class="rounded-t mb-0 px-4 py-3 border-0">
    <div class="flex flex-wrap items-center">
      <div class="relative w-full px-4 max-w-full flex-grow flex-1">
        <h3 class="font-semibold text-lg {color === 'light' ? 'text-blueGray-700' : 'text-white'}">
          Tabla carrito de Compras
        </h3>
      </div>
    </div>
  </div>
  <div class="block w-full overflow-x-auto">
    <!-- Projects table -->
    <table class="items-center w-full bg-transparent border-collapse">
      <!-- Encabezado de la tabla -->
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
            Producto Descripción
          </th>
          <th class="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left {color === 'light' ? 'bg-blueGray-50 text-blueGray-500 border-blueGray-100' : 'bg-red-700 text-red-200 border-red-600'}">
            Acciones
          </th>
        </tr>
      </thead>
      <!-- Cuerpo de la tabla -->
      <tbody>
        {#each carrito as item}
          <tr>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              {item.nombre}
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              {item.precio}
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              <!-- Botones de incremento y decremento de cantidad -->
              <div class="flex items-center">
                <button class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-4 rounded-l" on:click={() => decrementarCantidad(item)}> - </button>
                <!-- Aquí se utiliza bind:value para vincular la cantidad al estado del componente -->
                <input type="number" min="1" bind:value={item.cantidad} class="w-full border border-gray-300 rounded px-3 py-1 focus:outline-none focus:border-indigo-500 text-xs text-center">
                <button class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-4 rounded-r" on:click={() => incrementarCantidad(item)}> + </button>
              </div>
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
              {item.description}
            </td>
            <td class="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
             
              <button class="bg-red-600 text-white active:bg-red-400 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full sm:w-auto ease-linear transition-all duration-150" on:click={() => buyProduct(item)}>Comprar</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

