// Variables globales
let table;
let charts = {};
let presupuestos = {};
let rol = ''; // Variable para almacenar el rol del usuario

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
    },
    buttons: {
        excel: 'Exportar a Excel'
    }
};

function initDataTable(data) {
    console.log('Inicializando DataTable con datos:', data);
    
    if (table) {
        table.destroy();
    }

    // Formatear fechas y asegurar que los datos sean un array
    const cotizaciones = (Array.isArray(data) ? data : []).map(cotizacion => ({
        ...cotizacion,
        fecha: new Date(cotizacion.fecha).toLocaleDateString(),
        id: cotizacion.id || '',  // Asegurar que siempre haya un ID
        subtotal: parseFloat(cotizacion.subtotal || 0).toFixed(2),
        igv: parseFloat(cotizacion.igv || 0).toFixed(2),
        total: parseFloat(cotizacion.total || 0).toFixed(2)
    }));

    table = $('#aprobadosTable').DataTable({
        data: cotizaciones,
        language: spanishTranslation,
        order: [[0, 'desc']], // Ordenar por fecha descendente
        columns: [
            { data: 'fecha' },
            { 
                data: 'cliente',
                defaultContent: 'N/A'
            },
            { 
                data: 'unidad',
                defaultContent: 'N/A'
            },
            { 
                data: 'departamento',
                defaultContent: 'N/A'
            },
            { 
                data: 'prioridad',
                defaultContent: 'Normal',
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
                defaultContent: '0.00',
                render: function(data) {
                    return 'S/. ' + (parseFloat(data) || 0).toFixed(2);
                }
            },
            { 
                data: 'igv',
                defaultContent: '0.00',
                render: function(data) {
                    return 'S/. ' + (parseFloat(data) || 0).toFixed(2);
                }
            },
            { 
                data: 'total',
                defaultContent: '0.00',
                render: function(data) {
                    return 'S/. ' + (parseFloat(data) || 0).toFixed(2);
                }
            },
            {
                data: 'estado',
                defaultContent: 'pendiente',
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
                    if (!data.id) return '';
                    
                    const buttons = [];
                    
                    // Botón de Ver Detalle - visible para todos
                    buttons.push(`
                        <button onclick="verDetalle('${data.id}')" class="btn btn-info btn-sm action-btn" title="Ver Detalle">
                            <i class="fas fa-search"></i> Ver Detalle
                        </button>
                    `);

                    // Botones de estado - visibles para logístico y administrador
                    const rolActual = rol ? rol.toString().toLowerCase() : '';
                    
                    if (rolActual === 'logistico' || rolActual === 'administrador') {
                        const estado = (data.estado || 'pendiente').toLowerCase();
                        
                        if (estado === 'aprobada') {
                            buttons.push(`
                                <button onclick="actualizarEstado('${data.id}', 'procesando')" 
                                        class="btn btn-warning btn-sm action-btn" 
                                        title="Marcar como Procesando">
                                    <i class="fas fa-cog"></i>
                                </button>`);
                        }
                        if (estado === 'procesando') {
                            buttons.push(`
                                <button onclick="actualizarEstado('${data.id}', 'despachado')" 
                                        class="btn btn-info btn-sm action-btn" 
                                        title="Marcar como Despachado">
                                    <i class="fas fa-truck"></i>
                                </button>`);
                        }
                        if (estado === 'despachado') {
                            buttons.push(`
                                <button onclick="actualizarEstado('${data.id}', 'en_destino')" 
                                        class="btn btn-purple btn-sm action-btn" 
                                        title="Marcar como En Destino">
                                    <i class="fas fa-map-marker-alt"></i>
                                </button>`);
                        }
                        if (estado === 'en_destino') {
                            buttons.push(`
                                <button onclick="actualizarEstado('${data.id}', 'entregado')" 
                                        class="btn btn-success btn-sm action-btn" 
                                        title="Marcar como Entregado">
                                    <i class="fas fa-check-circle"></i>
                                </button>`);
                        }

                        // Botón de subir evidencia - solo para logístico y administrador cuando está entregado
                        if (estado === 'entregado' && !data.evidencia) {
                            buttons.push(`
                                <button onclick="subirEvidencia('${data.id}')" 
                                        class="btn btn-warning btn-sm action-btn" 
                                        title="Subir Evidencia">
                                    <i class="fas fa-upload"></i>
                                </button>`);
                        }
                    }

                    // Botón de ver evidencia - visible para todos si existe evidencia
                    if (data.evidencia) {
                        buttons.push(`
                            <button onclick="verEvidencia('${data.evidencia}')" 
                                    class="btn btn-info btn-sm action-btn" 
                                    title="Ver Evidencia">
                                <i class="fas fa-image"></i>
                            </button>`);
                    }

                    return `<div class="action-buttons">${buttons.join('')}</div>`;
                }
            }
        ],
        responsive: true,
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excel',
                text: '<i class="fas fa-file-excel"></i> Exportar a Excel',
                className: 'btn btn-success',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7, 8]
                }
            }
        ],
        createdRow: function(row, data) {
            if (data.prioridad && data.prioridad.toLowerCase() === 'express') {
                $(row).addClass('express-row');
            }
        }
    });
}

$(document).ready(function() {
    console.log('Inicializando página de cotizaciones aprobadas...');
    
    // Obtener el rol del usuario de la sesión
    const usuario = auth.obtenerSesion();
    if (usuario && usuario.rol) {
        rol = usuario.rol.toLowerCase();
        console.log('Rol del usuario:', rol);
        
        // Cargar datos una vez que tenemos el rol
        cargarCotizacionesAprobadas()
            .then(() => {
                console.log('Datos cargados exitosamente');
            })
            .catch(error => {
                console.error('Error en la carga inicial:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error de carga',
                    text: 'No se pudieron cargar los datos. Por favor, recarga la página.',
                    confirmButtonColor: CONFIG.COLORS.primary
                });
            });
    } else {
        console.error('No se encontró el rol del usuario');
        Swal.fire({
            icon: 'error',
            title: 'Error de acceso',
            text: 'No se pudo obtener el rol del usuario. Por favor, inicie sesión nuevamente.',
            confirmButtonColor: CONFIG.COLORS.primary
        }).then(() => {
            window.location.href = 'login.html';
        });
    }

    // Verificar que todas las dependencias estén cargadas
    const dependencias = {
        'jQuery': typeof $ !== 'undefined',
        'DataTables': typeof $.fn.DataTable !== 'undefined',
        'Chart.js': typeof Chart !== 'undefined',
        'SweetAlert2': typeof Swal !== 'undefined',
        'Cloudinary': typeof cloudinary !== 'undefined'
    };

    console.log('Estado de dependencias:', dependencias);

    const dependenciasFaltantes = Object.entries(dependencias)
        .filter(([_, loaded]) => !loaded)
        .map(([name]) => name);

    if (dependenciasFaltantes.length > 0) {
        console.error('Faltan dependencias:', dependenciasFaltantes);
        alert('Error: No se pudieron cargar todas las dependencias necesarias. Por favor, recarga la página.');
        return;
    }

    // Configurar eventos de modales
    $('.close').click(function() {
        $(this).closest('.modal').hide();
    });

    $(window).click(function(event) {
        if ($(event.target).hasClass('modal')) {
            $(event.target).hide();
        }
    });

    // Configurar refresco automático cada 5 minutos
    setInterval(() => {
        console.log('Actualizando datos...');
        cargarCotizacionesAprobadas()
            .catch(error => console.error('Error en actualización automática:', error));
    }, 5 * 60 * 1000);
});

function cargarPresupuestos() {
    console.log('Cargando presupuestos...');
    return new Promise((resolve, reject) => {
        auth.llamarServidor('obtenerPresupuestos')
            .then(response => {
                console.log('Respuesta de presupuestos:', response);
                try {
                    if (!response.success) {
                        throw new Error('Error al cargar presupuestos');
                    }

                    let presupuestosData = [];
                    if (Array.isArray(response.data)) {
                        presupuestosData = response.data;
                    } else if (response.data && typeof response.data === 'object') {
                        presupuestosData = Object.values(response.data);
                    }

                    if (!Array.isArray(presupuestosData)) {
                        throw new Error('Los datos de presupuestos no tienen el formato esperado');
                    }

                    // Reiniciar el objeto de presupuestos
                    presupuestos = {};
                    
                    // Procesar cada presupuesto
                    presupuestosData.forEach(p => {
                        if (p && p.categoria && p.monto) {
                            presupuestos[p.categoria] = {
                                total: parseFloat(p.monto) || 0,
                                consumido: 0
                            };
                        }
                    });

                    console.log('Presupuestos procesados:', presupuestos);
                    
                    if (Object.keys(presupuestos).length === 0) {
                        console.warn('No se encontraron presupuestos válidos');
                    }
                    
                    resolve();
                } catch (error) {
                    console.error('Error al procesar presupuestos:', error);
                    reject(error);
                }
            })
            .catch(error => {
                console.error('Error al cargar presupuestos:', error);
                reject(error);
            });
    });
}

function calcularConsumoPresupuesto(cotizaciones) {
    console.log('Iniciando cálculo de consumo de presupuesto...');
    
    // Reiniciar consumo
    Object.keys(presupuestos).forEach(categoria => {
        presupuestos[categoria].consumido = 0;
    });

    // Calcular consumo por cada cotización en proceso o posterior
    cotizaciones.forEach(cotizacion => {
        console.log(`\nAnalizando cotización:`, cotizacion);
        
        if (['procesando', 'despachado', 'en_destino', 'entregado'].includes(cotizacion.estado)) {
            // Obtener el total de la cotización
            const totalCotizacion = parseFloat(cotizacion.total);
            
            // Contar cuántos items hay por categoría
            const itemsPorCategoria = {};
            cotizacion.items.forEach(item => {
                const categoria = item.categoria;
                if (!itemsPorCategoria[categoria]) {
                    itemsPorCategoria[categoria] = 0;
                }
                itemsPorCategoria[categoria]++;
            });

            // Distribuir el total entre las categorías
            Object.entries(itemsPorCategoria).forEach(([categoria, cantidad]) => {
                if (presupuestos[categoria]) {
                    const montoCategoria = totalCotizacion / Object.keys(itemsPorCategoria).length;
                    presupuestos[categoria].consumido += montoCategoria;
                    
                    console.log(`Categoría: ${categoria}`);
                    console.log(`Monto asignado: ${montoCategoria.toFixed(2)}`);
                }
            });
        }
    });

    // Redondear los valores para evitar problemas de precisión
    Object.keys(presupuestos).forEach(categoria => {
        presupuestos[categoria].consumido = Math.round(presupuestos[categoria].consumido * 100) / 100;
        console.log(`Consumo final ${categoria}: ${presupuestos[categoria].consumido}`);
    });

    console.log('Presupuestos finales:', presupuestos);
}

function actualizarGraficos() {
    const chartsGrid = document.getElementById('chartsGrid');
    chartsGrid.innerHTML = ''; // Limpiar gráficos existentes

    Object.entries(presupuestos).forEach(([categoria, datos]) => {
        // Crear contenedor para el gráfico
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';
        
        // Título del gráfico
        const title = document.createElement('div');
        title.className = 'chart-title';
        title.textContent = categoria;
        chartWrapper.appendChild(title);

        // Canvas para el gráfico
        const canvas = document.createElement('canvas');
        chartWrapper.appendChild(canvas);

        // Resumen del presupuesto
        const summary = document.createElement('div');
        summary.className = 'budget-summary';
        
        const total = document.createElement('div');
        total.className = 'budget-item';
        total.innerHTML = `
            <div class="budget-label">Total</div>
            <div class="budget-value">S/. ${datos.total.toFixed(2)}</div>
        `;
        
        const consumido = document.createElement('div');
        consumido.className = 'budget-item';
        consumido.innerHTML = `
            <div class="budget-label">Consumido</div>
            <div class="budget-value consumed">S/. ${datos.consumido.toFixed(2)}</div>
        `;
        
        const disponible = document.createElement('div');
        disponible.className = 'budget-item';
        disponible.innerHTML = `
            <div class="budget-label">Disponible</div>
            <div class="budget-value available">S/. ${(datos.total - datos.consumido).toFixed(2)}</div>
        `;
        
        summary.appendChild(total);
        summary.appendChild(consumido);
        summary.appendChild(disponible);
        chartWrapper.appendChild(summary);

        chartsGrid.appendChild(chartWrapper);

        // Crear gráfico
        const disponibleValue = Math.max(0, datos.total - datos.consumido);
        const chart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Consumido', 'Disponible'],
                datasets: [{
                    data: [datos.consumido, disponibleValue],
                    backgroundColor: ['#dc3545', '#28a745'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '70%',
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            }
        });

        charts[categoria] = chart;
    });
}

function cargarCotizacionesAprobadas() {
    console.log('Cargando cotizaciones aprobadas...');
    return new Promise((resolve, reject) => {
        auth.llamarServidor('obtenerCotizacionesAprobadas')
            .then(response => {
                console.log('Respuesta del servidor:', response);
                try {
                    if (!response.success) {
                        throw new Error('Error al cargar cotizaciones');
                    }

                    // Asegurarnos de que response.data sea un array
                    let cotizaciones = [];
                    if (Array.isArray(response.data)) {
                        cotizaciones = response.data;
                    } else if (response.data && typeof response.data === 'object') {
                        // Si es un objeto, intentar convertirlo en array
                        cotizaciones = Object.values(response.data);
                    }

                    if (!Array.isArray(cotizaciones)) {
                        throw new Error('Los datos recibidos no tienen el formato esperado');
                    }

                    console.log('Cotizaciones procesadas:', cotizaciones);

                    // Verificar pedidos Express pendientes
                    const pedidosExpress = cotizaciones.filter(cotizacion => 
                        cotizacion && 
                        cotizacion.prioridad && 
                        cotizacion.prioridad.toLowerCase() === 'express' && 
                        cotizacion.estado &&
                        ['aprobada', 'procesando'].includes(cotizacion.estado.toLowerCase())
                    );

                    if (pedidosExpress.length > 0) {
                        mostrarNotificacionExpress(pedidosExpress.length);
                    }

                    // Asegurarnos de que los presupuestos estén cargados
                    if (Object.keys(presupuestos).length === 0) {
                        console.log('Cargando presupuestos primero...');
                        cargarPresupuestos()
                            .then(() => {
                                procesarDatosCotizaciones(cotizaciones);
                                resolve(cotizaciones);
                            })
                            .catch(error => {
                                console.error('Error al cargar presupuestos:', error);
                                reject(error);
                            });
                    } else {
                        procesarDatosCotizaciones(cotizaciones);
                        resolve(cotizaciones);
                    }
                } catch (error) {
                    console.error('Error al procesar respuesta:', error);
                    reject(error);
                }
            })
            .catch(error => {
                console.error('Error al cargar cotizaciones:', error);
                reject(error);
            });
    });
}

function procesarDatosCotizaciones(data) {
    console.log('Procesando datos de cotizaciones:', data);
    try {
        calcularConsumoPresupuesto(data);
        actualizarGraficos();
        initDataTable(data);
    } catch (error) {
        console.error('Error al procesar datos:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al procesar los datos de las cotizaciones',
            confirmButtonColor: CONFIG.COLORS.primary
        });
    }
}

function mostrarNotificacionExpress(cantidad) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: '¡Atención!',
            html: `<div style="font-size: 1.2em">
                    <i class="fas fa-exclamation-triangle" style="color: #f8bb86; font-size: 3em; margin-bottom: 15px;"></i><br>
                    Hay <strong>${cantidad}</strong> pedido(s) EXPRESS pendiente(s)<br>
                    <span style="font-size: 0.9em; color: #666; margin-top: 10px;">
                        Por favor, dale prioridad a estos pedidos
                    </span>
                   </div>`,
            icon: 'warning',
            confirmButtonText: 'Entendido',
            confirmButtonColor: CONFIG.COLORS.primary,
            allowOutsideClick: false
        });
    } else {
        alert(`¡Atención! Hay ${cantidad} pedido(s) EXPRESS pendiente(s)`);
    }
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

async function mostrarDetalleCotizacion(cotizacion) {
    try {
        let items = [];
        if (typeof cotizacion.items === 'string') {
            try {
                items = JSON.parse(cotizacion.items);
            } catch (e) {
                console.error('Error al parsear items:', e);
                items = [];
            }
        } else if (Array.isArray(cotizacion.items)) {
            items = cotizacion.items;
        }

        // Formatear la fecha correctamente
        let fecha;
        try {
            // Primero intentamos parsear la fecha asumiendo que viene en formato ISO
            const fechaObj = new Date(cotizacion.fecha);
            if (isNaN(fechaObj.getTime())) {
                // Si la fecha es inválida, verificamos si tiene guiones
                if (cotizacion.fecha.includes('-')) {
                    // Si tiene guiones, asumimos formato YYYY-MM-DD
                    const [year, month, day] = cotizacion.fecha.split('-');
                    fecha = `${day}/${month}/${year}`;
                } else {
                    // Si no tiene guiones, mostramos la fecha como está
                    fecha = cotizacion.fecha;
                }
            } else {
                // Si es una fecha válida, la formateamos
                fecha = fechaObj.toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        } catch (e) {
            console.error('Error al formatear fecha:', e);
            fecha = cotizacion.fecha || 'Fecha no disponible';
        }

        // Crear el modal si no existe
        let modalElement = document.getElementById('detalleModal');
        if (!modalElement) {
            modalElement = document.createElement('div');
            modalElement.id = 'detalleModal';
            modalElement.className = 'modal';
            document.body.appendChild(modalElement);
        }

        // Crear el contenido del modal
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Detalle de Cotización</h5>
                    <div class="btn-group">
                        <button type="button" class="btn btn-primary" onclick="imprimirCotizacion()">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="cerrarModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="modal-body" id="cotizacionDetalle">
                    <div class="cotizacion-header">
                        <div class="row">
                            <div class="col-md-6">
                                <p>RUC: 20609075954</p>
                                <p>Dirección: Av. Separadora Industrial 751</p>
                                <p>Teléfono: +51 932 777 509</p>
                            </div>
                            <div class="col-md-6 text-right">
                                <h4>COTIZACIÓN</h4>
                                <p>Fecha: ${fecha}</p>
                                <p>N° Cotización: ${cotizacion.id || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="row mt-4">
                            <div class="col-md-6">
                                <h5>Cliente</h5>
                                <p>Unidad: ${cotizacion.unidad || 'N/A'}</p>
                                <p>Departamento: ${cotizacion.departamento || 'N/A'}</p>
                                <p>Cliente: ${cotizacion.cliente || 'N/A'}</p>
                            </div>
                            <div class="col-md-6">
                                <h5>Detalles</h5>
                                <p>Prioridad: ${cotizacion.prioridad || 'Normal'}</p>
                                <p>Estado: ${cotizacion.estado ? cotizacion.estado.toUpperCase() : 'PENDIENTE'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="table-responsive mt-4">
                        <table class="table table-bordered">
                            <thead class="thead-dark">
                                <tr>
                                    <th>Categoría</th>
                                    <th>Ítem</th>
                                    <th>Cantidad</th>
                                    <th>Precio Unitario</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => {
                                    const cantidad = parseInt(item.cantidad) || 0;
                                    const precioUnitario = parseFloat(item.precio) / cantidad;
                                    const total = parseFloat(item.precio) || 0;
                                    return `
                                        <tr>
                                            <td>${item.categoria || 'N/A'}</td>
                                            <td>${item.item || 'N/A'}</td>
                                            <td class="text-right">${cantidad}</td>
                                            <td class="text-right">S/. ${precioUnitario.toFixed(2)}</td>
                                            <td class="text-right">S/. ${total.toFixed(2)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="4" class="text-right"><strong>Subtotal:</strong></td>
                                    <td class="text-right">S/. ${parseFloat(cotizacion.subtotal || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td colspan="4" class="text-right"><strong>IGV (18%):</strong></td>
                                    <td class="text-right">S/. ${parseFloat(cotizacion.igv || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td colspan="4" class="text-right"><strong>Total:</strong></td>
                                    <td class="text-right">S/. ${parseFloat(cotizacion.total || 0).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `;

        modalElement.innerHTML = modalContent;
        modalElement.style.display = 'block';

        // Agregar event listener para cerrar el modal
        modalElement.addEventListener('click', function(event) {
            if (event.target === modalElement) {
                modalElement.style.display = 'none';
            }
        });

    } catch (error) {
        console.error('Error al mostrar detalle:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al mostrar los detalles de la cotización',
            confirmButtonColor: CONFIG.COLORS.primary
        });
    }
}

function imprimirCotizacion() {
    const contenido = document.getElementById('cotizacionDetalle').innerHTML;
    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
        <html>
            <head>
                <title>Imprimir Cotización</title>
                <link href="https://fonts.googleapis.com/css2?family=Anaheim&display=swap" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Anaheim', sans-serif;
                        padding: 20px;
                    }
                    .table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 1rem;
                    }
                    .table th, .table td {
                        border: 1px solid #dee2e6;
                        padding: 8px;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .thead-dark th {
                        background-color: #19485F;
                        color: white;
                    }
                    @media print {
                        body { margin: 0; padding: 15px; }
                        .btn-group { display: none; }
                    }
                </style>
            </head>
            <body>
                ${contenido}
            </body>
        </html>
    `);
    ventanaImpresion.document.close();
    ventanaImpresion.print();
}

// Función para cerrar el modal
function cerrarModal() {
    const modal = document.getElementById('detalleModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Event listener para cerrar el modal al hacer clic fuera de él
window.onclick = function(event) {
    const modal = document.getElementById('detalleModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

function getEstadoColor(estado) {
    const colorMap = {
        'aprobada': '#28a745',
        'procesando': '#ffc107',
        'despachado': '#17a2b8',
        'en_destino': '#6f42c1',
        'entregado': '#20c997'
    };
    return colorMap[estado?.toLowerCase()] || '#6c757d';
}

function exportarExcel() {
    const table = $('#aprobadosTable').DataTable();
    const data = table.data().toArray();
    
    // Crear un array con los headers
    const headers = [
        'Fecha',
        'Cliente',
        'Unidad',
        'Departamento',
        'Subtotal',
        'IGV',
        'Total'
    ];
    
    // Preparar los datos para el Excel
    const excelData = data.map(row => [
        row.fecha,
        row.cliente,
        row.unidad,
        row.departamento,
        parseFloat(row.subtotal).toFixed(2),
        parseFloat(row.igv).toFixed(2),
        parseFloat(row.total).toFixed(2)
    ]);
    
    // Insertar los headers al inicio
    excelData.unshift(headers);
    
    // Crear el libro de Excel
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cotizaciones Aprobadas");
    
    // Descargar el archivo
    XLSX.writeFile(wb, `Cotizaciones_Aprobadas_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function generarPDF(id) {
    // Esta función se implementará cuando tengamos la plantilla del PDF
    alert('Funcionalidad de PDF en desarrollo');
}

function actualizarEstado(id, nuevoEstado) {
    const script = document.createElement('script');
    const callback = 'callback_' + Math.random().toString(36).substr(2, 9);

    window[callback] = function(response) {
        if (response.success) {
            // Recargar datos para actualizar tabla y gráficos
            cargarCotizacionesAprobadas();
            alert(`Estado actualizado a ${nuevoEstado.toUpperCase()} exitosamente`);
        } else {
            alert('Error al actualizar estado: ' + response.message);
        }
        delete window[callback];
    };

    script.src = `https://script.google.com/macros/s/AKfycbyiHpw6uBp_WLV5i6wRQaCdyskKHSS2r7UuiS00Wis/dev?action=actualizarEstadoAprobada&id=${id}&estado=${nuevoEstado}&callback=${callback}`;
    document.body.appendChild(script);
}

function verCotizacion(id) {
    console.log('Generando PDF para cotización:', id);
    
    // Primero, obtener los datos de la cotización
    auth.llamarServidor('obtenerCotizacion', { id: id })
        .then(response => {
            if (response.success && response.data) {
                generarPDFCotizacion(response.data);
            } else {
                throw new Error('No se pudo obtener la información de la cotización');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo generar el PDF de la cotización',
                confirmButtonColor: CONFIG.COLORS.primary
            });
        });
}

function generarPDFCotizacion(cotizacion) {
    // Crear el modal si no existe
    if (!document.getElementById('pdfModal')) {
        const modalHTML = `
            <div id="pdfModal" class="modal">
                <div class="modal-content" style="width: 90%; max-width: 1000px; height: 90vh;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem;">
                        <h2>Cotización PDF</h2>
                        <div class="modal-actions" style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" onclick="descargarPDF()">
                                <i class="fas fa-download"></i> Descargar
                            </button>
                            <button class="btn btn-info" onclick="imprimirPDF()">
                                <i class="fas fa-print"></i> Imprimir
                            </button>
                            <span class="close">&times;</span>
                        </div>
                    </div>
                    <div class="modal-body" style="height: calc(100% - 60px); overflow: auto; padding: 0;">
                        <div id="pdfContent" style="background: white; padding: 40px; max-width: 800px; margin: 0 auto;">
                            <!-- Aquí se generará el contenido del PDF -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Agregar evento para cerrar el modal
        const modal = document.getElementById('pdfModal');
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = function() {
            modal.style.display = "none";
        }
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
    }

    // Formatear la fecha
    const fecha = new Date(cotizacion.fecha).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    // Asegurarse de que los items sean un array
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

    // Generar el contenido del PDF
    const pdfContent = document.getElementById('pdfContent');
    pdfContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
            <img src="logo.png" alt="LT SOLIDS" style="max-width: 200px;">
            <h1 style="color: #19485F; margin: 20px 0;">COTIZACIÓN</h1>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div>
                <strong>Cliente:</strong> ${cotizacion.cliente}<br>
                <strong>Unidad:</strong> ${cotizacion.unidad}<br>
                <strong>Departamento:</strong> ${cotizacion.departamento}
            </div>
            <div style="text-align: right;">
                <strong>Fecha:</strong> ${fecha}<br>
                <strong>Cotización N°:</strong> ${cotizacion.id}<br>
                <strong>Estado:</strong> <span class="estado-badge ${cotizacion.estado.toLowerCase()}">${cotizacion.estado.toUpperCase()}</span>
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
                <tr style="background-color: #19485F; color: white;">
                    <th style="padding: 10px; text-align: left;">Categoría</th>
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Cantidad</th>
                    <th style="padding: 10px; text-align: right;">Precio Unit.</th>
                    <th style="padding: 10px; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => {
                    const cantidad = parseInt(item.cantidad) || 0;
                    const precioUnitario = parseFloat(item.precio) || 0;
                    const total = cantidad * precioUnitario;
                    
                    return `
                        <tr style="border-bottom: 1px solid #ddd;">
                            <td style="padding: 10px;">${item.categoria || 'N/A'}</td>
                            <td style="padding: 10px;">${item.item || 'N/A'}</td>
                            <td style="padding: 10px; text-align: center;">${cantidad}</td>
                            <td style="padding: 10px; text-align: right;">S/. ${precioUnitario.toFixed(2)}</td>
                            <td style="padding: 10px; text-align: right;">S/. ${total.toFixed(2)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
            <div style="width: 200px;">
                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                    <strong>Subtotal:</strong>
                    <span>S/. ${parseFloat(cotizacion.subtotal || 0).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                    <strong>IGV (18%):</strong>
                    <span>S/. ${parseFloat(cotizacion.igv || 0).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #19485F; margin-top: 5px;">
                    <strong>Total:</strong>
                    <span>S/. ${parseFloat(cotizacion.total || 0).toFixed(2)}</span>
                </div>
            </div>
        </div>

        <div style="margin-top: 50px; color: #666; font-size: 0.9em;">
            <p><strong>Notas:</strong></p>
            <ul style="margin-top: 10px;">
                <li>Los precios incluyen IGV</li>
                <li>Cotización válida por 30 días</li>
                <li>Tiempo de entrega sujeto a stock</li>
            </ul>
        </div>
    `;

    // Mostrar el modal
    document.getElementById('pdfModal').style.display = 'block';
}

function descargarPDF() {
    const element = document.getElementById('pdfContent');
    const opt = {
        margin: 1,
        filename: 'cotizacion.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

function imprimirPDF() {
    const contenido = document.getElementById('pdfContent').innerHTML;
    const ventana = window.open('', 'PRINT', 'height=600,width=800');
    
    ventana.document.write(`
        <html>
            <head>
                <title>Cotización LT SOLIDS</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .estado-badge {
                        display: inline-block;
                        padding: 0.25rem 0.75rem;
                        border-radius: 20px;
                        color: white;
                        font-weight: bold;
                        text-transform: uppercase;
                        font-size: 0.9rem;
                    }
                    .estado-badge.aprobada { background-color: #28a745; }
                    .estado-badge.procesando { background-color: #ffc107; }
                    .estado-badge.despachado { background-color: #17a2b8; }
                    .estado-badge.en_destino { background-color: #6f42c1; }
                    .estado-badge.entregado { background-color: #20c997; }
                </style>
            </head>
            <body>
                ${contenido}
            </body>
        </html>
    `);
    
    ventana.document.close();
    ventana.focus();
    
    ventana.onload = function() {
        ventana.print();
        ventana.close();
    };
}

function subirEvidencia(id) {
    // Crear un input de archivo oculto
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    // Configurar el widget de Cloudinary
    const widget = cloudinary.createUploadWidget(
        {
            cloudName: 'dt1op1srh', 
            uploadPreset: 'evidencias_solids',
            maxFiles: 1,
            sources: ['local', 'camera'],
            resourceType: 'image',
            maxFileSize: 2000000, // 2MB
            styles: {
                palette: {
                    window: "#FFFFFF",
                    windowBorder: "#90A0B3",
                    tabIcon: "#0078FF",
                    menuIcons: "#5A616A",
                    textDark: "#000000",
                    textLight: "#FFFFFF",
                    link: "#0078FF",
                    action: "#FF620C",
                    inactiveTabIcon: "#0E2F5A",
                    error: "#F44235",
                    inProgress: "#0078FF",
                    complete: "#20B832",
                    sourceBg: "#E4EBF1"
                }
            }
        },
        (error, result) => {
            if (!error && result && result.event === "success") {
                // La imagen se subió exitosamente a Cloudinary
                const imageUrl = result.info.secure_url;
                
                // Actualizar la evidencia en la base de datos
                actualizarEvidencia(id, imageUrl);
            }
        }
    );

    widget.open();
}

function actualizarEvidencia(id, imageUrl) {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyiHpw6uBp_WLV5i6wRQaCdyskKHSS2r7UuiS00Wis/dev';
    const url = new URL(scriptURL);
    url.searchParams.append('action', 'actualizarEvidencia');
    url.searchParams.append('id', id);
    url.searchParams.append('evidencia', imageUrl);
    url.searchParams.append('callback', 'procesarActualizacionEvidencia');

    const script = document.createElement('script');
    script.src = url.toString();
    document.body.appendChild(script);
}

window.procesarActualizacionEvidencia = function(response) {
    if (response.success) {
        alert('Evidencia subida exitosamente');
        // Recargar la tabla
        cargarCotizacionesAprobadas();
        
        // Recargar el modal de detalles si está abierto
        const detalleModal = document.getElementById('detalleModal');
        if (detalleModal.style.display === 'block') {
            verDetalle(response.data.id);
        }
    } else {
        alert('Error al subir evidencia: ' + response.message);
    }
};

function verEvidencia(imageUrl) {
    // Crear modal para mostrar la imagen
    if (!$('#evidenciaModal').length) {
        $('body').append(`
            <div id="evidenciaModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Evidencia de Entrega</h2>
                        <span class="close">&times;</span>
                    </div>
                    <div class="modal-body" style="text-align: center;">
                        <img src="${imageUrl}" style="max-width: 100%; max-height: 80vh;" alt="Evidencia de entrega">
                    </div>
                </div>
            </div>
        `);

        // Manejar cierre del modal
        $('#evidenciaModal .close').click(function() {
            $('#evidenciaModal').hide();
        });
    } else {
        $('#evidenciaModal img').attr('src', imageUrl);
    }

    // Mostrar el modal
    $('#evidenciaModal').show();
}

// Agregar estilos necesarios al inicio del archivo
const styles = `
<style>
    .detail-section {
        margin-bottom: 2rem;
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .detail-section h3 {
        color: var(--primary-color);
        margin-bottom: 1rem;
        font-size: 1.2rem;
    }

    .detail-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .detail-group {
        display: flex;
        flex-direction: column;
    }

    .detail-group label {
        font-weight: bold;
        color: var(--primary-color);
        margin-bottom: 0.5rem;
    }

    .detail-group span {
        color: #333;
    }

    .estado-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        color: white;
        font-weight: bold;
        text-transform: uppercase;
        font-size: 0.9rem;
    }

    .estado-badge.aprobada { background-color: #28a745; }
    .estado-badge.procesando { background-color: #ffc107; }
    .estado-badge.despachado { background-color: #17a2b8; }
    .estado-badge.en_destino { background-color: #6f42c1; }
    .estado-badge.entregado { background-color: #20c997; }

    .evidence-container {
        text-align: center;
    }

    .evidence-image {
        max-width: 100%;
        max-height: 300px;
        border-radius: 8px;
        cursor: pointer;
        transition: transform 0.3s ease;
    }

    .evidence-image:hover {
        transform: scale(1.02);
    }

    .detail-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
    }

    .detail-table th,
    .detail-table td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid var(--gray);
    }

    .detail-table th {
        background-color: var(--gray-light);
        color: var(--primary-color);
        font-weight: bold;
    }

    .detail-table tr:hover {
        background-color: var(--gray-light);
    }

    .no-items {
        text-align: center;
        color: #666;
        font-style: italic;
    }

    .totals {
        background-color: var(--gray-light);
    }

    .totals .detail-group {
        align-items: flex-end;
    }

    .totals .total {
        font-size: 1.2rem;
        font-weight: bold;
        color: var(--primary-color);
    }

    @media (max-width: 768px) {
        .detail-row {
            grid-template-columns: 1fr;
        }
    }
</style>
`;

// Agregar los estilos al documento si no existen
if (!document.getElementById('detalleStyles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'detalleStyles';
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
} 
