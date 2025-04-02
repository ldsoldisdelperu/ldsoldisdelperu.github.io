// Variables globales
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

    // Formatear fechas y preparar datos
    const cotizaciones = data.map(cotizacion => ({
        ...cotizacion,
        fecha: new Date(cotizacion.fecha).toLocaleDateString()
    }));

    table = $('#resumenTable').DataTable({
        data: cotizaciones,
        language: spanishTranslation,
        dom: '<"top"Bf>rt<"bottom"lip><"clear">',
        buttons: [
            {
                extend: 'excel',
                text: '<i class="fas fa-file-excel"></i> Exportar a Excel',
                className: 'btn btn-success',
                title: 'Resumen de Cotizaciones LT SOLIDS',
                filename: 'Resumen_Cotizaciones_' + new Date().toISOString().split('T')[0],
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
                }
            }
        ],
        order: [[0, 'desc']], // Ordenar por fecha descendente
        columns: [
            { data: 'fecha' },
            { data: 'usuario' },
            { data: 'cliente' },
            { data: 'unidad' },
            { data: 'departamento' },
            { 
                data: 'prioridad',
                render: function(data) {
                    if (data && data.toLowerCase() === 'express') {
                        return `<span class="priority-express">
                                 <i class="fas fa-exclamation-triangle text-warning"></i> 
                                 ${data}
                               </span>`;
                    }
                    return data || 'Normal';
                }
            },
            { 
                data: 'subtotal',
                render: function(data) {
                    return 'S/. ' + (parseFloat(data) || 0).toFixed(2);
                }
            },
            { 
                data: 'igv',
                render: function(data) {
                    return 'S/. ' + (parseFloat(data) || 0).toFixed(2);
                }
            },
            { 
                data: 'total',
                render: function(data) {
                    return 'S/. ' + (parseFloat(data) || 0).toFixed(2);
                }
            },
            {
                data: 'estado',
                render: function(data) {
                    const colorMap = {
                        'aprobada': '#28a745',
                        'procesando': '#ffc107',
                        'despachado': '#17a2b8',
                        'en_destino': '#6f42c1',
                        'entregado': '#20c997'
                    };
                    const estado = (data || 'pendiente').toLowerCase();
                    const color = colorMap[estado] || '#6c757d';
                    return `<span class="badge" style="background-color: ${color}">${estado.toUpperCase()}</span>`;
                }
            },
            {
                data: null,
                render: function(data) {
                    return `
                        <button onclick="verDetalle('${data.id}')" class="btn btn-info btn-sm action-btn" title="Ver Detalle">
                            <i class="fas fa-search"></i>
                        </button>`;
                }
            }
        ],
        responsive: true
    });

    // Agregar los detalles al archivo Excel después de la inicialización
    table.on('buttons-action', function(e, buttonApi, dataTable, node, config) {
        if (config.extend === 'excel') {
            const worksheet = XLSX.utils.aoa_to_sheet([]);
            
            data.forEach((cotizacion, index) => {
                // Agregar encabezado de la cotización
                XLSX.utils.sheet_add_aoa(worksheet, [
                    [`Cotización #${index + 1}`],
                    ['ID', 'Fecha', 'Cliente', 'Unidad', 'Total'],
                    [cotizacion.id, cotizacion.fecha, cotizacion.cliente, cotizacion.unidad, `S/. ${cotizacion.total}`],
                    [],
                    ['Items'],
                    ['Categoría', 'Item', 'Cantidad', 'Precio']
                ], {origin: -1});

                // Agregar items
                if (cotizacion.items && Array.isArray(cotizacion.items)) {
                    const itemsData = cotizacion.items.map(item => [
                        item.categoria,
                        item.item,
                        item.cantidad,
                        `S/. ${parseFloat(item.precio).toFixed(2)}`
                    ]);
                    XLSX.utils.sheet_add_aoa(worksheet, itemsData, {origin: -1});
                }

                // Agregar espacio entre cotizaciones
                XLSX.utils.sheet_add_aoa(worksheet, [[]], {origin: -1});
            });
        }
    });
}

function actualizarTarjetasResumen(data) {
    const summaryCards = document.querySelector('.summary-cards');
    
    // Calcular totales por estado
    const estadosCounts = {
        aprobada: 0,
        procesando: 0,
        despachado: 0,
        en_destino: 0,
        entregado: 0
    };

    // Calcular ganancias por categoría
    const categoriaGanancias = {};

    data.forEach(cotizacion => {
        // Contar estados
        const estado = (cotizacion.estado || 'pendiente').toLowerCase();
        if (estadosCounts.hasOwnProperty(estado)) {
            estadosCounts[estado]++;
        }

        // Sumar ganancias por categoría
        if (Array.isArray(cotizacion.items)) {
            cotizacion.items.forEach(item => {
                if (item.categoria) {
                    if (!categoriaGanancias[item.categoria]) {
                        categoriaGanancias[item.categoria] = 0;
                    }
                    categoriaGanancias[item.categoria] += parseFloat(item.precio || 0);
                }
            });
        }
    });

    // Generar HTML para las tarjetas de estado
    let cardsHTML = `
        <div class="summary-card">
            <div class="title">
                <i class="fas fa-check-circle"></i>
                Aprobadas
            </div>
            <div class="value">${estadosCounts.aprobada}</div>
            <div class="subtitle">Cotizaciones aprobadas</div>
        </div>
        <div class="summary-card">
            <div class="title">
                <i class="fas fa-cog"></i>
                En Proceso
            </div>
            <div class="value">${estadosCounts.procesando}</div>
            <div class="subtitle">Cotizaciones en proceso</div>
        </div>
        <div class="summary-card">
            <div class="title">
                <i class="fas fa-truck"></i>
                Despachadas
            </div>
            <div class="value">${estadosCounts.despachado}</div>
            <div class="subtitle">Cotizaciones despachadas</div>
        </div>
        <div class="summary-card">
            <div class="title">
                <i class="fas fa-map-marker-alt"></i>
                En Destino
            </div>
            <div class="value">${estadosCounts.en_destino}</div>
            <div class="subtitle">Cotizaciones en destino</div>
        </div>
        <div class="summary-card">
            <div class="title">
                <i class="fas fa-check-double"></i>
                Entregadas
            </div>
            <div class="value">${estadosCounts.entregado}</div>
            <div class="subtitle">Cotizaciones entregadas</div>
        </div>
    `;

    // Agregar tarjetas de ganancias por categoría
    Object.entries(categoriaGanancias).forEach(([categoria, ganancia]) => {
        cardsHTML += `
            <div class="summary-card">
                <div class="title">
                    <i class="fas fa-dollar-sign"></i>
                    ${categoria}
                </div>
                <div class="value">S/. ${ganancia.toFixed(2)}</div>
                <div class="subtitle">Ganancias totales</div>
            </div>
        `;
    });

    summaryCards.innerHTML = cardsHTML;
}

function cargarCotizaciones() {
    console.log('Cargando cotizaciones...');
    
    auth.llamarServidor('obtenerCotizacionesAprobadas')
        .then(response => {
            console.log('Respuesta del servidor:', response);
            if (response.success && response.data) {
                const data = Array.isArray(response.data) ? response.data : [];
                initDataTable(data);
                actualizarTarjetasResumen(data);
            } else {
                throw new Error('Error al cargar los datos');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los datos. Por favor, recarga la página.',
                confirmButtonColor: CONFIG.COLORS.primary
            });
        });
}

function verDetalle(id) {
    console.log('Obteniendo detalle para ID:', id);
    auth.llamarServidor('obtenerCotizacion', { id: id })
        .then(response => {
            console.log('Respuesta del servidor:', response);
            if (response.success && response.data) {
                procesarDetalle(response);
            } else {
                console.error('Error al cargar detalle:', response.message);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al cargar los detalles de la cotización',
                    confirmButtonColor: CONFIG.COLORS.primary
                });
            }
        })
        .catch(error => {
            console.error('Error al obtener detalle:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar los detalles de la cotización',
                confirmButtonColor: CONFIG.COLORS.primary
            });
        });
}

function procesarDetalle(response) {
    console.log('Procesando detalle:', response);
    if (response.success && response.data) {
        const cotizacion = response.data;
        
        // Formatear la fecha
        let fechaFormateada = 'N/A';
        try {
            if (cotizacion.fecha) {
                const fecha = new Date(cotizacion.fecha);
                fechaFormateada = fecha.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        } catch (error) {
            console.error('Error al formatear fecha:', error);
        }
        
        // Parsear los items que vienen como string JSON si es necesario
        let items = [];
        try {
            if (typeof cotizacion.items === 'string') {
                items = JSON.parse(cotizacion.items);
            } else if (Array.isArray(cotizacion.items)) {
                items = cotizacion.items;
            }
        } catch (error) {
            console.error('Error al parsear items:', error);
            items = [];
        }

        // Formatear la cotización con los campos correctos
        const cotizacionFormateada = {
            id: cotizacion.id,
            fecha: fechaFormateada,
            cliente: cotizacion.cliente || 'N/A',
            unidad: cotizacion.unidad || 'N/A',
            departamento: cotizacion.departamento || 'N/A',
            subtotal: parseFloat(cotizacion.subtotal || 0).toFixed(2),
            igv: parseFloat(cotizacion.igv || 0).toFixed(2),
            total: parseFloat(cotizacion.total || 0).toFixed(2),
            items: items
        };

        mostrarDetalleCotizacion(cotizacionFormateada);
    } else {
        console.error('Error al procesar detalle:', response.message);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al procesar los detalles de la cotización',
            confirmButtonColor: CONFIG.COLORS.primary
        });
    }
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
                    <div>${cotizacion.fecha || 'N/A'}</div>
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

        if (Array.isArray(cotizacion.items) && cotizacion.items.length > 0) {
            cotizacion.items.forEach(item => {
                html += `
                    <tr>
                        <td>${item.categoria || 'N/A'}</td>
                        <td>${item.item || 'N/A'}</td>
                        <td>${item.cantidad || '0'}</td>
                        <td>S/. ${parseFloat(item.precio || 0).toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
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
                    <div>S/. ${cotizacion.subtotal}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">IGV (18%):</div>
                    <div>S/. ${cotizacion.igv}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Total:</div>
                    <div>S/. ${cotizacion.total}</div>
                </div>
            </div>
        `;

        content.innerHTML = html;
        document.getElementById('detalleModal').style.display = 'block';
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

// Inicialización
$(document).ready(function() {
    console.log('Inicializando página de resumen...');
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

    // Configurar refresco automático cada 5 minutos
    setInterval(cargarCotizaciones, 5 * 60 * 1000);
}); 