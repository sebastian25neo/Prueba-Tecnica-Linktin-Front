<!-- Modal.svelte -->
<script>
    export let isOpen = false;
    export let onClose = () => {};
  </script>
  
  <div class="{isOpen ? 'block' : 'hidden'} fixed inset-0 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
  
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
  
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <!-- Modal content -->
          <div class="sm:flex sm:items-start">
            <!-- Your modal content goes here -->
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 class="text-lg font-medium text-gray-900" id="modal-headline">
                Editar Producto
              </h3>
              <!-- Add your form fields or any other content here -->
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            onclick={() => onClose()}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
  