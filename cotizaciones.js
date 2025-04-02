console.log('Cargando cotizaciones.js...');

// Verificar que las dependencias estén cargadas
$(document).ready(function() {
    console.log('jQuery version:', $.fn.jquery);
    console.log('DataTables disponible:', typeof $.fn.DataTable !== 'undefined');
    console.log('DataTables Buttons disponible:', typeof $.fn.dataTable.Buttons !== 'undefined');
    console.log('DataTables Responsive disponible:', typeof $.fn.dataTable.Responsive !== 'undefined');
    console.log('auth disponible:', typeof auth !== 'undefined');
    console.log('CONFIG disponible:', typeof CONFIG !== 'undefined');
});

let table;

// Configuración de idioma español para DataTables
const spanishTranslation = {
    "decimal": "",
    "emptyTable": "No hay datos disponibles",
    "info": "Mostrando _START_ a _END_ de _TOTAL_ registros",
    "infoEmpty": "Mostrando 0 a 0 de 0 registros",
    "infoFiltered": "(filtrado de _MAX_ registros totales)",
    "infoPostFix": "",
    "thousands": ",",
    "lengthMenu": "Mostrar _MENU_ registros",
    "loadingRecords": "Cargando...",
    "processing": "Procesando...",
    "search": "Buscar:",
    "zeroRecords": "No se encontraron coincidencias",
    "paginate": {
        "first": "Primero",
        "last": "Último",
        "next": "Siguiente",
        "previous": "Anterior"
    },
    "aria": {
        "sortAscending": ": activar para ordenar columna ascendente",
        "sortDescending": ": activar para ordenar columna descendente"
    }
};

function initDataTable(data) {
    console.log('Inicializando DataTable con datos:', data);
    
    if (table) {
        table.destroy();
    }

    // Asegurarnos de que data sea un array
    let cotizaciones = [];
    
    try {
        // Si data es un array, lo usamos directamente
        if (Array.isArray(data)) {
            cotizaciones = data;
        } 
        // Si data tiene una propiedad data que es un array, usamos esa
        else if (data && Array.isArray(data.data)) {
            cotizaciones = data.data;
        }
        
        // Formatear fechas
        cotizaciones = cotizaciones.map(cotizacion => ({
            ...cotizacion,
            fecha: new Date(cotizacion.fecha).toLocaleDateString()
        }));
        
        console.log('Cotizaciones procesadas:', cotizaciones);
    } catch (error) {
        console.error('Error al procesar datos:', error);
        cotizaciones = [];
    }

    table = $('#cotizacionesTable').DataTable({
        data: cotizaciones,
        language: spanishTranslation,
        order: [[0, 'desc']], // Ordenar por fecha descendente
        columns: [
            { data: 'fecha' },
            { data: 'cliente' },
            { data: 'unidad' },
            { data: 'departamento' },
            { 
                data: 'subtotal',
                render: function(data) {
                    return 'S/. ' + parseFloat(data).toFixed(2);
                }
            },
            { 
                data: 'igv',
                render: function(data) {
                    return 'S/. ' + parseFloat(data).toFixed(2);
                }
            },
            { 
                data: 'total',
                render: function(data) {
                    return 'S/. ' + parseFloat(data).toFixed(2);
                }
            },
            {
                data: 'estado',
                render: function(data) {
                    let badge = '';
                    switch(data) {
                        case 'aprobada':
                            badge = '<span class="badge badge-success">Aprobada</span>';
                            break;
                        case 'rechazada':
                            badge = '<span class="badge badge-danger">Rechazada</span>';
                            break;
                        default:
                            badge = '<span class="badge badge-warning">Pendiente</span>';
                    }
                    return badge;
                }
            },
            {
                data: null,
                render: function(data) {
                    // Obtener el rol del usuario actual
                    const usuario = auth.obtenerSesion();
                    const rol = usuario.rol ? usuario.rol.toLowerCase() : '';
                    
                    const buttons = [
                        `<button onclick="verDetalle('${data.id}')" class="btn btn-secondary btn-sm">Ver Detalle</button>`
                    ];
                    
                    // Solo mostrar botones de aprobar/rechazar para administrador y aprobador
                    if (data.estado === 'pendiente' && (rol === 'administrador' || rol === 'aprobador')) {
                        buttons.push(`<button onclick="aprobarCotizacion('${data.id}')" class="btn btn-success btn-sm">Aprobar</button>`);
                        buttons.push(`<button onclick="rechazarCotizacion('${data.id}')" class="btn btn-danger btn-sm">Rechazar</button>`);
                    }
                    
                    return buttons.join(' ');
                }
            }
        ],
        responsive: true
    });
}

function cargarCotizaciones() {
    console.log('Iniciando carga de cotizaciones...');
    
    // Verificar autenticación y datos de sesión
    const usuario = auth.obtenerSesion();
    console.log('Datos de sesión:', usuario);
    
    if (!auth.verificarAutenticacion()) {
        console.error('Usuario no autenticado');
        window.location.href = './index.html';
        return;
    }

    auth.llamarServidor('obtenerCotizaciones')
        .then(response => {
            console.log('Respuesta completa del servidor:', response);
            
            let data;
            if (Array.isArray(response)) {
                data = response;
            } else if (response && Array.isArray(response.data)) {
                data = response.data;
            } else {
                console.warn('Formato de respuesta inesperado:', response);
                data = [];
            }
            
            console.log('Datos a pasar a initDataTable:', data);
            initDataTable(data);
        })
        .catch(error => {
            console.error('Error al cargar cotizaciones:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al cargar cotizaciones',
                text: error.message || 'No se pudieron cargar las cotizaciones',
                confirmButtonColor: CONFIG.COLORS.primary
            });
            // Inicializar tabla vacía en caso de error
            initDataTable([]);
        });
}

function verDetalle(id) {
    console.log('Solicitando detalles para cotización ID:', id);
    
    auth.llamarServidor('obtenerCotizacion', { id: id })
        .then(response => {
            console.log('Respuesta de detalles recibida:', response);
            
            let data;
            if (response && typeof response === 'object') {
                data = response.data || response;
            } else {
                console.error('Formato de respuesta inválido:', response);
                throw new Error('Formato de respuesta inválido');
            }
            
            console.log('Datos procesados para mostrar:', data);
            mostrarDetalleCotizacion(data);
        })
        .catch(error => {
            console.error('Error al cargar detalle:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los detalles de la cotización',
                confirmButtonColor: CONFIG.COLORS.primary
            });
        });
}

function mostrarDetalleCotizacion(cotizacion) {
    console.log('Mostrando detalles de cotización:', cotizacion);
    
    if (!cotizacion || typeof cotizacion !== 'object') {
        console.error('Datos de cotización inválidos:', cotizacion);
        return;
    }

    const content = document.getElementById('detalleContent');
    if (!content) {
        console.error('No se encontró el elemento detalleContent');
        return;
    }
    
    try {
        let html = `
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Fecha:</div>
                    <div>${cotizacion.fecha ? new Date(cotizacion.fecha).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Cliente:</div>
                    <div>${cotizacion.cliente || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Unidad:</div>
                    <div>${cotizacion.unidad || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Departamento:</div>
                    <div>${cotizacion.departamento || 'N/A'}</div>
                </div>
            </div>

            <h3 style="margin: 2rem 0 1rem 0; color: var(--primary-color);">Items de la Cotización</h3>
            <div class="table-container" style="overflow-x: auto;">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Categoría</th>
                            <th>Item</th>
                            <th>Cantidad</th>
                            <th>Precio</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (Array.isArray(cotizacion.items)) {
            cotizacion.items.forEach(item => {
                html += `
                    <tr>
                        <td>${item.categoria || 'N/A'}</td>
                        <td>${item.item || 'N/A'}</td>
                        <td>${item.cantidad || '0'}</td>
                        <td>S/. ${item.precio ? parseFloat(item.precio).toFixed(2) : '0.00'}</td>
                    </tr>
                `;
            });
        } else {
            console.warn('No hay items en la cotización o el formato es inválido');
            html += `
                <tr>
                    <td colspan="4" class="text-center">No hay items disponibles</td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>

            <div class="detail-grid" style="margin-top: 2rem;">
                <div class="detail-item">
                    <div class="detail-label">Subtotal:</div>
                    <div>S/. ${cotizacion.subtotal ? parseFloat(cotizacion.subtotal).toFixed(2) : '0.00'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">IGV (18%):</div>
                    <div>S/. ${cotizacion.igv ? parseFloat(cotizacion.igv).toFixed(2) : '0.00'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Total:</div>
                    <div>S/. ${cotizacion.total ? parseFloat(cotizacion.total).toFixed(2) : '0.00'}</div>
                </div>
            </div>
        `;

        content.innerHTML = html;
        
        const modal = document.getElementById('detalleModal');
        if (modal) {
            modal.style.display = 'block';
        } else {
            console.error('No se encontró el elemento detalleModal');
        }
    } catch (error) {
        console.error('Error al generar HTML de detalles:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al mostrar los detalles de la cotización',
            confirmButtonColor: CONFIG.COLORS.primary
        });
    }
}

function aprobarCotizacion(id) {
    if (!confirm('¿Está seguro de aprobar esta cotización?')) return;
    
    auth.llamarServidor('actualizarEstadoCotizacion', {
        id: id,
        estado: 'aprobada'
    })
    .then(response => {
        alert('Cotización aprobada exitosamente');
        cargarCotizaciones();
    })
    .catch(error => {
        console.error('Error al aprobar:', error);
        alert('Error al aprobar la cotización');
    });
}

function rechazarCotizacion(id) {
    if (!confirm('¿Está seguro de rechazar esta cotización?')) return;
    
    auth.llamarServidor('actualizarEstadoCotizacion', {
        id: id,
        estado: 'rechazada'
    })
    .then(response => {
        alert('Cotización rechazada exitosamente');
        cargarCotizaciones();
    })
    .catch(error => {
        console.error('Error al rechazar:', error);
        alert('Error al rechazar la cotización');
    });
}

// Inicialización
$(document).ready(function() {
    console.log('Inicializando página de cotizaciones...');
    cargarCotizaciones();

    // Manejar cierre del modal
    $('.close').click(function() {
        document.getElementById('detalleModal').style.display = 'none';
    });

    window.onclick = function(event) {
        const modal = document.getElementById('detalleModal');
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}); 