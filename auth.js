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

// Función para llamadas al servidor usando Fetch API con fallback a JSONP
async function llamarServidor(action, params = {}) {
    console.log('Llamando al servidor:', action, 'con params:', params);
    
    try {
        // URL del servidor de Google Apps Script
        const baseUrl = 'https://script.google.com/macros/s/AKfycbyiHpw6uBp_WLV5i6wRQaCdyskKHSS2r7UuiS00Wis/dev';
        
        // Construir los parámetros de la URL
        const queryParams = new URLSearchParams({
            action: action,
            ...params
        });

        // Intentar primero con Fetch API
        try {
            const response = await fetch(`${baseUrl}?${queryParams}`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }

            const data = await response.json();
            console.log('Respuesta del servidor (Fetch):', data);

            if (data && typeof data === 'object') {
                return data;
            }
            throw new Error('Formato de respuesta inválido');
        } catch (fetchError) {
            console.log('Fetch falló, intentando con JSONP:', fetchError);
            
            // Si Fetch falla, usar JSONP como fallback
            return new Promise((resolve, reject) => {
                const callbackName = 'callback_' + Math.random().toString(36).substr(2, 9);
                const script = document.createElement('script');
                const timeoutId = setTimeout(() => {
                    reject(new Error('Timeout en la llamada JSONP'));
                    cleanup();
                }, 10000);

                // Función de limpieza
                const cleanup = () => {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    clearTimeout(timeoutId);
                };

                // Configurar callback
                window[callbackName] = (response) => {
                    cleanup();
                    console.log('Respuesta del servidor (JSONP):', response);
                    if (response && response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response?.message || 'Error en la operación'));
                    }
                };

                // Agregar callback a los parámetros
                queryParams.append('callback', callbackName);

                // Configurar y agregar el script
                script.src = `${baseUrl}?${queryParams}`;
                document.body.appendChild(script);
            });
        }
    } catch (error) {
        console.error('Error en llamada al servidor:', error);
        throw error;
    }
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
