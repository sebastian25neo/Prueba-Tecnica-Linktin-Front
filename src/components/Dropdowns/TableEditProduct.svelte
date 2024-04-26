<script>
  // library for creating dropdown menu appear on click
  import { createPopper } from "@popperjs/core";
  import { createEventDispatcher } from 'svelte';
  import Swal from 'sweetalert2';
  import axios from 'axios';
  export let product;

  const dispatch = createEventDispatcher();

  let btnDropdownRef;

  const handleEdit = () => {
    Swal.fire({
      title: 'Editar Producto',
      html: `<form id="editProductForm">
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
                name="grid-nameProduct" 
                class="swal2-input border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                required  
                value="${product.nombre}"
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
                name="grid-price"
                class="swal2-input border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                required
                value="${product.precio}"
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
                name="grid-Description"
                type="text"
                class="swal2-textarea border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                rows="4"
                required
              >${product.description}</textarea> 
            </div>
          </div>
        </div>
      </form>`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const form = document.getElementById('editProductForm');
        if (!form.checkValidity()) {
          Swal.showValidationMessage('Por favor, completa todos los campos.');
          return false; 
        } else {
          const formData = new FormData(form);
          const nombre = formData.get('grid-nameProduct');
          const precio = formData.get('grid-price');
          const descripcion = formData.get('grid-Description');
          
          // Enviar los datos del formulario a tu backend usando Axios
          axios.put('http://localhost:3000/productosUpdate', {
            id:product.id,
            nombre: nombre,
            precio: precio,
            description: descripcion
          })
          .then(response => {
            dispatch('customEvent');
            Swal.fire('¡Cambios Guardados!', '', 'success');
            
          })
          .catch(error => {
            console.error('Error al enviar datos:', error);
            Swal.fire('Error', 'Ocurrió un error al guardar los cambios.', 'error');
          });
        }
      }
    });
  };
</script>

<!-- Resto del código -->

<div>
  <button
    class="text-blueGray-500 py-1 px-3 rounded-full"
    bind:this="{btnDropdownRef}"
    on:click="{handleEdit}"
  >
    <i class="fas fa-pencil-alt"></i>
  </button>
</div>
