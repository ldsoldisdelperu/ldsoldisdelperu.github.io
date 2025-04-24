console.log('Loading auth.js...');

// Funciones básicas de autenticación
function verificarAutenticacion() {
    return sessionStorage.getItem('usuarioActual') !== null;
}

function obtenerSesion() {
    const datos = sessionStorage.getItem('usuarioActual');
    return datos ? JSON.parse(datos) : null;
}

function guardarSesion(datosUsuario) {
    sessionStorage.setItem('usuarioActual', JSON.stringify(datosUsuario));
}

function cerrarSesion() {
    sessionStorage.removeItem('usuarioActual');
    window.location.href = './index.html';
}

// Función para llamadas JSONP
function llamarServidor(action, params = {}) {
    console.log('Llamando al servidor:', action, 'con params:', params);
    return new Promise((resolve, reject) => {
        const nombreCallback = 'callback_' + Math.random().toString(36).substr(2, 9);
        
        window[nombreCallback] = function(response) {
            console.log('Respuesta completa del servidor:', response);
            if (response && response.success) {
                if (response.data === undefined) {
                    console.warn('La respuesta no contiene datos');
                    resolve([]);
                } else {
                    console.log('Datos a devolver:', response.data);
                    resolve(response.data);
                }
            } else {
                console.error('Error en respuesta:', response);
                reject(new Error(response?.message || 'Error en la operación'));
            }
            delete window[nombreCallback];
            
            // Limpiar el script después de la ejecución
            const script = document.querySelector(`script[data-callback="${nombreCallback}"]`);
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };

        const queryParams = new URLSearchParams({
            action: action,
            callback: nombreCallback,
            ...params
        }).toString();

        const script = document.createElement('script');
        script.setAttribute('data-callback', nombreCallback);
        const url = 'https://script.google.com/macros/s/AKfycbyiHpw6uBp_WLV5i6wRQaCdyskKHSS2r7UuiS00Wis/dev?' + queryParams;
        console.log('URL completa de la petición:', url);
        script.src = url;
        
        script.onerror = (error) => {
            console.error('Error al cargar el script:', error);
            delete window[nombreCallback];
            reject(new Error('Error de conexión con el servidor'));
            
            // Limpiar el script en caso de error
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };

        document.body.appendChild(script);
    });
}

// Exportar funciones
window.auth = {
    verificarAutenticacion,
    obtenerSesion,
    guardarSesion,
    cerrarSesion,
    llamarServidor
};
console.log('Auth instance created successfully'); 

function cargarDatosIniciales() {
    // Establecer fecha actual
    document.getElementById('fecha').valueAsDate = new Date();
    
    // Establecer usuario actual y cliente asociado
    const usuario = auth.obtenerSesion();
    document.getElementById('usuario').value = usuario.nombres || usuario.usuario;
    
    // Si el usuario tiene un cliente asociado, establecerlo y cargar sus unidades
    if (usuario.cliente) {
        const clienteSelect = document.getElementById('cliente');
        clienteSelect.value = usuario.cliente;
        clienteSelect.disabled = true; // Deshabilitar el select si el cliente está predefinido
        
        // Cargar las unidades del cliente
        cargarUnidades(usuario.cliente);
    } else {
        // Si no tiene cliente asociado, cargar todos los clientes como antes
        cargarClientes();
    }
} 
