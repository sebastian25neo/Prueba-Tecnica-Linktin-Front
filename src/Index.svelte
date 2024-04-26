<script>
import { navigate } from "svelte-routing";
import axios from 'axios';
import Swal from 'sweetalert2';

const registerBg2 = "../assets/img/register_bg_2.png";

  let username = '';
  let password = '';

  async  function iniciarSesion() {
    username = document.getElementById('grid-user').value;
    password = document.getElementById('grid-password').value;

    try {
        const response = await axios.post('http://localhost:3000/login', { username, password });
        if(response.data.token){
          localStorage.setItem('token', response.data.token);
          navigate("/admin/CreateProducts");
          Swal.fire({
          icon: 'success',
          text: 'Inició la sección correctamente.',
        });
        }
       
      
    } catch (error) {
      Swal.fire({
          icon: 'error',
          text: 'Credenciales inválidas.',
        });
        throw new Error('Credenciales inválidas');
        
    }
    //navigate("/admin/CreateProducts");
  }

</script>


<div>
  <main>
    <section class="relative w-full h-full py-40 min-h-screen">
      <div
        class="absolute top-0 w-full h-full bg-blueGray-800 bg-no-repeat bg-full"
        style="background-image: url({registerBg2});"
      ></div>
      <div class="container mx-auto px-4 h-full">
        <div class="flex content-center items-center justify-center h-full">
          <div class="w-full lg:w-4/12 px-4">
            <div
              class="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-200 border-0"
            >
              <div class="rounded-t mb-0 px-6 py-6">
                <div class="text-center mb-3">
                  <h6 class="text-blueGray-500 text-sm font-bold">
                    Inicia sesión
                  </h6>
                </div>
                <hr class="mt-6 border-b-1 border-blueGray-300" />
              </div>
              <div class="flex-auto px-4 lg:px-10 py-10 pt-0">
                <form>
                  <div class="relative w-full mb-3">
                    <label
                      class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                      for="grid-user"
                    >
                      Usuario
                    </label>
                    <input
                      id="grid-user"
                      type="text"
                      class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      placeholder="Usuario"
                    />
                  </div>
      
                  <div class="relative w-full mb-3">
                    <label
                      class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                      for="grid-password"
                    >
                      Contraseña
                    </label>
                    <input
                      id="grid-password"
                      type="password"
                      class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      placeholder="Password"
                    />
                  </div>
      
                  <div class="text-center mt-6">
                    <button
                      on:click={iniciarSesion}
                      class="bg-blueGray-800 text-white active:bg-blueGray-600 text-sm font-bold uppercase px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 w-full ease-linear transition-all duration-150"
                      type="button"
                    >
                     Iniciar sesión
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</div>


