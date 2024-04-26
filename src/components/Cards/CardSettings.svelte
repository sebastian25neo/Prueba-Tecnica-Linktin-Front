<script>
  // core components

  import axios from '../scripts/axiosConfig.js';
  import Swal from 'sweetalert2';
  import eventBus from '../scripts/eventBus.js';
  

  let nameProduct = '';
  let priceProduct = '';
  let descriptionProduct = '';
  let responseMessage = '';

  async  function saveInformation() {
    // Almacena los valores de los campos de entrada en las variables
    nameProduct = document.getElementById('grid-nameProduct').value;
    priceProduct = document.getElementById('grid-price').value;
    descriptionProduct = document.getElementById('grid-Description').value;


    if (!nameProduct || !priceProduct || !descriptionProduct) {
      Swal.fire({
        icon: 'error',
        text: 'Por favor, complete todos los campos',
      });
      return; // Salir de la función si hay campos vacíos
    }



    let postData = {
      nombre: nameProduct,
      precio: priceProduct,
      description:descriptionProduct
  };

    try {
      const response = await axios.post('/productos', postData);
      responseMessage = response.data.message;
    Swal.fire({
        icon: 'success',
        text: responseMessage,
    });

    eventBus.emit('cretaleTable');
    cleanFields()


    } catch (error) {
      console.error('Error sending data:', error);
      Swal.fire({
        icon: 'error',
        text: error,
    });
    }
  }

  function cleanFields() {
      document.getElementById('grid-nameProduct').value = '';
      document.getElementById('grid-price').value = '';
      document.getElementById('grid-Description').value = '';
  }

</script>

<div
  class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-100 border-0"
>
  <div class="rounded-t bg-white mb-0 px-6 py-6">
    <div class="text-center flex justify-centrer">
      <h6 class="text-blueGray-700 text-xl font-bold">Crear Producto</h6>
    </div>
  </div>
  <div class="flex-auto px-4 lg:px-10 py-10 pt-0">
    <form>
      <h6 class="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">
        Producto Información
      </h6>
      <div class="flex flex-wrap">
        <div class="w-full lg:w-6/12 px-4">
          <div class="relative w-full mb-3">
            <label
              class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
              for="grid-nameProduct"
            >
              Nombre Producto
            </label>
            <input
              id="grid-nameProduct"
              type="text"
              class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
              required  
              />
          </div>
        </div>
        <div class="w-full lg:w-6/12 px-4">
          <div class="relative w-full mb-3">
            <label
              class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
              for="grid-price"
            >
              Precio Producto
            </label>
            <input
              id="grid-price"
              type="number"
              class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
              required
              />
          </div>
        </div>
      </div>
      <div class="flex flex-wrap">
        <div class="w-full lg:w-12/12 px-4">
          <div class="relative w-full mb-3">
            <label
              class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
              for="grid-Description"
            >
            Descripción
            </label>
            <textarea
              id="grid-Description"
              type="text"
              class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
              rows="4"
            required
            />
          </div>
        </div>
      </div>
      <div class="text-center mt-6 flex justify-center">
        <button
        on:click={cleanFields}
        class="bg-red-600 text-white active:bg-red-400 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full sm:w-auto ease-linear transition-all duration-150"
        type="button"
      >
        Cancelar
      </button>
        <button
          on:click={saveInformation}
          class="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full sm:w-auto ease-linear transition-all duration-150"
          type="button"
        >
          Guardar
        </button>
       
      </div>
      
    </form>
  </div>
</div>
