// Configuración global de la aplicación
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbyiHpw6uBp_WLV5i6wRQaCdyskKHSS2r7UuiS00Wis/dev',
    
    // Colores de la aplicación
    COLORS: {
        primary: '#19485F',
        secondary: '#d9e0a4',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8'
    },
    
    // Estados de cotización
    ESTADOS: {
        pendiente: 'pendiente',
        aprobada: 'aprobada',
        rechazada: 'rechazada',
        procesando: 'procesando',
        despachado: 'despachado',
        en_destino: 'en_destino',
        entregado: 'entregado'
    }
};

// Exportar la configuración globalmente
window.CONFIG = CONFIG; 