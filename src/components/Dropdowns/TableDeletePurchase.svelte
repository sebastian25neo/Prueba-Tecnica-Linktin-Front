<script>
  // library for creating dropdown menu appear on click
  import { createPopper } from "@popperjs/core";
  import { createEventDispatcher } from 'svelte';
  import Swal from 'sweetalert2';
  import axios from '../scripts/axiosConfig.js';
  export let item;

  const dispatch = createEventDispatcher();

  let btnDropdownRef;

  const handleDelete = () => {
    // Mostrar el modal de confirmación de SweetAlert2
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminarlo'
    }).then((result) => {
      if (result.isConfirmed) {
        // Enviar la solicitud de eliminación al backend
        axios.delete(`/pedidosDelete/${item.id}`)
          .then(response => {
            if(response){
              Swal.fire(
              '¡Eliminado!',
              'Se eliminó la comprar correctamente',
              'success'
            );
            dispatch('customEvent');
            }
           
          })
          .catch(error => {
            // Manejar cualquier error que ocurra durante la eliminación
            console.error('Error al eliminar el Pedido:', error);
            Swal.fire(
              'Error',
              'Se produjo un error al intentar eliminar el producto.',
              'error'
            );
          });
      }
    });
  };
</script>

<!-- Resto del código -->

<div>
  <button
    class="text-blueGray-500 py-1 px-3 rounded-full"
    bind:this="{btnDropdownRef}"
    on:click="{handleDelete}"
  >
  <i class="fas fa-trash"></i>
  </button>
</div>
