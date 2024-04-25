// eventBus.js
import mitt from 'mitt';

// Crear un nuevo bus de eventos
const eventBus = mitt();

// Exportar el bus de eventos para que pueda ser utilizado en otros módulos
export default eventBus;