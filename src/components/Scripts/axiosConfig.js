import axios from 'axios';

// Creamos una instancia de Axios
const instance = axios.create({
  baseURL: 'http://localhost:3000', // Establece la URL base para todas las solicitudes
  // Puedes agregar otras configuraciones comunes aquí
});

// Interceptores de solicitud
instance.interceptors.request.use(
  (config) => {
    // Aquí puedes modificar la configuración de la solicitud antes de enviarla
    const token = localStorage.getItem('token'); // Suponiendo que el token se almacena en el localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // Agregamos el token a los encabezados de la solicitud
    }
    return config;
  },
  (error) => {
    // Manejo de errores de solicitud
    return Promise.reject(error);
  }
);

export default instance; // Exportamos la instancia de Axios configurada
