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
    if (table) {
        table.destroy();
    }

    // Formatear fechas
    const cotizaciones = data.map(cotizacion => ({
        ...cotizacion,
        fecha: new Date(cotizacion.fecha).toLocaleDateString()
    }));

    table = $('#resumenTable').DataTable({
        data: cotizaciones,
        language: spanishTranslation,
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
                    if (data.toLowerCase() === 'express') {
                        return `<span class="priority-express">
                                 <i class="fas fa-exclamation-triangle text-warning"></i> 
                                 ${data}
                               </span>`;
                    }
                    return data;
                }
            },
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
                    const colorMap = {
                        'aprobada': '#28a745',
                        'procesando': '#ffc107',
                        'despachado': '#17a2b8',
                        'en_destino': '#6f42c1',
                        'entregado': '#20c997'
                    };
                    const color = colorMap[data] || '#6c757d';
                    return `<span class="badge" style="background-color: ${color}">${data.toUpperCase()}</span>`;
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
}

function actualizarResumen(data) {
    // Reiniciar contadores
    const contadores = {
        aprobada: { count: 0, amount: 0 },
        procesando: { count: 0, amount: 0 },
        despachado: { count: 0, amount: 0 },
        en_destino: { count: 0, amount: 0 },
        entregado: { count: 0, amount: 0 }
    };

    // Contadores por categoría
    const categorias = {};

    // Procesar datos
    data.forEach(cotizacion => {
        const estado = cotizacion.estado;
        const total = parseFloat(cotizacion.total);

        // Actualizar contadores de estado
        if (contadores[estado]) {
            contadores[estado].count++;
            contadores[estado].amount += total;
        }

        // Actualizar contadores por categoría
        cotizacion.items.forEach(item => {
            if (!categorias[item.categoria]) {
                categorias[item.categoria] = 0;
            }
            // Distribuir el total proporcionalmente entre las categorías
            categorias[item.categoria] += total / cotizacion.items.length;
        });
    });

    // Actualizar tarjetas de estado
    Object.entries(contadores).forEach(([estado, datos]) => {
        $(`#${estado}-count`).text(datos.count);
        $(`#${estado}-amount`).text(`S/. ${datos.amount.toFixed(2)}`);
    });

    // Actualizar tarjetas de categoría
    const categoryGrid = $('#category-grid');
    categoryGrid.empty();

    Object.entries(categorias).forEach(([categoria, monto]) => {
        categoryGrid.append(`
            <div class="status-card category-card">
                <div class="status-header">
                    <div class="status-icon">
                        <i class="fas fa-tag"></i>
                    </div>
                    <div class="status-title">${categoria}</div>
                </div>
                <div class="category-amount">S/. ${monto.toFixed(2)}</div>
            </div>
        `);
    });
}

function cargarCotizaciones() {
    console.log('Cargando cotizaciones...');
    const script = document.createElement('script');
    const callback = 'callback_' + Math.random().toString(36).substr(2, 9);

    window[callback] = function(response) {
        if (response.success) {
            initDataTable(response.data);
            actualizarResumen(response.data);
        } else {
            console.error('Error:', response.message);
            alert('Error al cargar los datos. Por favor, recarga la página.');
        }
        delete window[callback];
    };

    script.src = `https://script.google.com/macros/s/AKfycbyiHpw6uBp_WLV5i6wRQaCdyskKHSS2r7UuiS00Wis/dev?action=obtenerCotizacionesAprobadas&callback=${callback}`;
    document.body.appendChild(script);
}

function verDetalle(id) {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyiHpw6uBp_WLV5i6wRQaCdyskKHSS2r7UuiS00Wis/dev';
    const url = new URL(scriptURL);
    url.searchParams.append('action', 'obtenerCotizacion');
    url.searchParams.append('id', id);
    url.searchParams.append('callback', 'procesarDetalle');

    const script = document.createElement('script');
    script.src = url.toString();
    document.body.appendChild(script);
}

window.procesarDetalle = function(response) {
    if (response.success) {
        const cotizacion = {
            ...response.data,
            fecha: new Date(response.data.fecha).toLocaleDateString(),
            estado: response.data.estado || 'pendiente'
        };
        mostrarDetalleCotizacion(cotizacion);
    } else {
        console.error('Error al cargar detalle:', response.message);
        alert('Error al cargar los detalles de la cotización');
    }
};

function mostrarDetalleCotizacion(cotizacion) {
    const content = document.getElementById('detalleContent');
    const estado = (cotizacion.estado || 'pendiente').toUpperCase();
    
    let html = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Fecha:</div>
                <div>${cotizacion.fecha}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Cliente:</div>
                <div>${cotizacion.cliente}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Unidad:</div>
                <div>${cotizacion.unidad}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Departamento:</div>
                <div>${cotizacion.departamento}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Prioridad:</div>
                <div>${cotizacion.prioridad}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Usuario:</div>
                <div>${cotizacion.usuario}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Estado:</div>
                <div>${estado}</div>
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

    cotizacion.items.forEach(item => {
        html += `
            <tr>
                <td>${item.categoria}</td>
                <td>${item.item}</td>
                <td>${item.cantidad}</td>
                <td>S/. ${parseFloat(item.precio).toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>

        <div class="detail-grid" style="margin-top: 2rem;">
            <div class="detail-item">
                <div class="detail-label">Subtotal:</div>
                <div>S/. ${parseFloat(cotizacion.subtotal).toFixed(2)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">IGV (18%):</div>
                <div>S/. ${parseFloat(cotizacion.igv).toFixed(2)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Total:</div>
                <div>S/. ${parseFloat(cotizacion.total).toFixed(2)}</div>
            </div>
        </div>
    `;

    content.innerHTML = html;
    document.getElementById('detalleModal').style.display = 'block';
}

$(document).ready(function() {
    console.log('Inicializando página de resumen...');
    cargarCotizaciones();

    // Manejar cierre del modal
    $('.close').click(function() {
        $(this).closest('.modal').hide();
    });

    window.onclick = function(event) {
        if ($(event.target).hasClass('modal')) {
            $(event.target).hide();
        }
    }
}); 