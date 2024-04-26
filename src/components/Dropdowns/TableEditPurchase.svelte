<script>
  // library for creating dropdown menu appear on click
  import { createPopper } from "@popperjs/core";
  import { createEventDispatcher } from 'svelte';
  import Swal from 'sweetalert2';
  import axios from 'components/Scripts/axiosConfig.js';
  export let item;

  const dispatch = createEventDispatcher();

  let btnDropdownRef;

  const handleDelete = () => {
    // Mostrar el modal de confirmación de SweetAlert2
    Swal.fire({
      title: '¿Estás seguro? Editar la cantidad de productos que quiere comparar',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, Editar cantidad '
    }).then((result) => {
      if (result.isConfirmed) {
        // Enviar la solicitud de eliminación al backend
        if (!item.cantidad || item.cantidad <= 0 ) {
            Swal.fire({
              icon: 'error',
              text: 'El campo no puede estar vacío, ser igual a 0 o contener números negativoss.',
            });
             // Salir de la función si hay campos vacíos
           } else{
            axios.put('/pedidosUpdate', {
            id:item.id,
            cantidad: item.cantidad,
          })
          .then(response => {
            if(response){
              dispatch('customEvent');
              Swal.fire('¡Cambios Guardados!', '', 'success');
            }
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
    on:click="{handleDelete}"
  >
    <i class="fas fa-pencil-alt"></i>
  </button>
</div>
