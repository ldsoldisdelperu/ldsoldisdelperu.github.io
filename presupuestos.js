let table;
let categorias = [];

// Configuración de idioma español para DataTables
const spanishTranslation = {
    "decimal": "",
    "emptyTable": "No hay categorías disponibles",
    "info": "Mostrando _START_ a _END_ de _TOTAL_ categorías",
    "infoEmpty": "Mostrando 0 a 0 de 0 categorías",
    "infoFiltered": "(filtrado de _MAX_ categorías totales)",
    "infoPostFix": "",
    "thousands": ",",
    "lengthMenu": "Mostrar _MENU_ categorías",
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
    console.log('Datos recibidos:', data);
    
    if (table) {
        table.destroy();
    }

    // Asegurarnos de que los datos tengan el formato correcto
    const presupuestosFormateados = data.map(item => ({
        categoria: item.categoria || '',
        monto: parseFloat(item.monto || 0)
    }));

    console.log('Datos formateados:', presupuestosFormateados);

    table = $('#presupuestosTable').DataTable({
        data: presupuestosFormateados,
        language: spanishTranslation,
        columns: [
            { 
                data: 'categoria',
                render: function(data) {
                    return `<div style="font-weight: bold; color: var(--primary-color);">
                            <i class="fas fa-tag"></i> ${data}
                           </div>`;
                }
            },
            { 
                data: 'monto',
                render: function(data, type, row) {
                    if (type === 'display') {
                        return `<div class="input-group">
                                <span class="currency">S/.</span>
                                <input type="number" 
                                       class="presupuesto-input" 
                                       value="${parseFloat(data || 0).toFixed(2)}" 
                                       step="0.01" 
                                       min="0"
                                       onchange="actualizarPresupuesto('${row.categoria}', this.value)">
                               </div>`;
                    }
                    return data;
                }
            },
            {
                data: null,
                render: function(data) {
                    return `<button class="btn btn-danger btn-sm" 
                                  onclick="eliminarCategoria('${data.categoria}')"
                                  title="Eliminar Categoría">
                            <i class="fas fa-trash"></i>
                           </button>`;
                }
            }
        ],
        order: [[0, 'asc']],
        pageLength: 25,
        dom: '<"top"f>rt<"bottom"lip><"clear">'
    });
}

function cargarCategorias() {
    console.log('Cargando categorías...');
    
    auth.llamarServidor('obtenerPresupuestos')
        .then(response => {
            console.log('Respuesta completa del servidor:', response);
            console.log('Estructura de datos:', {
                tipo: typeof response.data,
                esArray: Array.isArray(response.data),
                longitud: response.data ? response.data.length : 0,
                primerElemento: response.data && response.data[0] ? response.data[0] : null
            });
            
            if (response.success && response.data) {
                categorias = response.data;
                console.log('Campos disponibles en el primer elemento:', 
                    categorias[0] ? Object.keys(categorias[0]) : 'No hay datos');
                initDataTable(categorias);
            } else {
                console.error('Error:', response.message);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al cargar las categorías',
                    confirmButtonColor: CONFIG.COLORS.primary
                });
            }
        })
        .catch(error => {
            console.error('Error detallado:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor',
                confirmButtonColor: CONFIG.COLORS.primary
            });
        });
}

function mostrarModalNuevaCategoria() {
    document.getElementById('categoriaModal').style.display = 'block';
    document.getElementById('categoriaForm').reset();
}

function cerrarModal() {
    document.getElementById('categoriaModal').style.display = 'none';
}

function guardarCategoria(event) {
    event.preventDefault();
    
    const categoria = document.getElementById('categoria').value.trim();
    const monto = document.getElementById('presupuesto').value;

    if (!categoria || !monto) {
        Swal.fire({
            icon: 'warning',
            title: 'Campos incompletos',
            text: 'Por favor, complete todos los campos',
            confirmButtonColor: CONFIG.COLORS.primary
        });
        return;
    }

    // Verificar si la categoría ya existe
    if (categorias.some(c => c.categoria.toLowerCase() === categoria.toLowerCase())) {
        Swal.fire({
            icon: 'error',
            title: 'Categoría duplicada',
            text: 'Esta categoría ya existe',
            confirmButtonColor: CONFIG.COLORS.primary
        });
        return;
    }

    auth.llamarServidor('guardarPresupuesto', {
        categoria: categoria,
        monto: monto
    })
    .then(response => {
        if (response.success) {
            Swal.fire({
                icon: 'success',
                title: 'Categoría guardada',
                text: 'La categoría se ha guardado exitosamente',
                confirmButtonColor: CONFIG.COLORS.primary
            });
            cerrarModal();
            cargarCategorias();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: response.message || 'Error al guardar la categoría',
                confirmButtonColor: CONFIG.COLORS.primary
            });
        }
    })
    .catch(error => {
        console.error('Error al guardar categoría:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al guardar la categoría',
            confirmButtonColor: CONFIG.COLORS.primary
        });
    });
}

function actualizarPresupuesto(categoria, nuevoMonto) {
    if (!nuevoMonto || isNaN(nuevoMonto) || nuevoMonto < 0) {
        Swal.fire({
            icon: 'error',
            title: 'Valor inválido',
            text: 'Por favor, ingrese un valor válido',
            confirmButtonColor: CONFIG.COLORS.primary
        });
        cargarCategorias(); // Recargar para restaurar el valor anterior
        return;
    }

    auth.llamarServidor('guardarPresupuesto', {
        categoria: categoria,
        monto: nuevoMonto
    })
    .then(response => {
        if (response.success) {
            Swal.fire({
                icon: 'success',
                title: 'Presupuesto actualizado',
                text: 'El presupuesto se ha actualizado exitosamente',
                confirmButtonColor: CONFIG.COLORS.primary,
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: response.message || 'Error al actualizar el presupuesto',
                confirmButtonColor: CONFIG.COLORS.primary
            });
            cargarCategorias(); // Recargar para restaurar el valor anterior
        }
    })
    .catch(error => {
        console.error('Error al actualizar presupuesto:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al actualizar el presupuesto',
            confirmButtonColor: CONFIG.COLORS.primary
        });
        cargarCategorias(); // Recargar para restaurar el valor anterior
    });
}

function eliminarCategoria(Categoria) {
    Swal.fire({
        title: '¿Está seguro?',
        text: "Esta acción no se puede deshacer",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: CONFIG.COLORS.danger,
        cancelButtonColor: CONFIG.COLORS.secondary,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            auth.llamarServidor('eliminarCategoria', {
                Categoria: Categoria
            })
            .then(response => {
                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Categoría eliminada',
                        text: 'La categoría se ha eliminado exitosamente',
                        confirmButtonColor: CONFIG.COLORS.primary
                    });
                    cargarCategorias();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.message || 'Error al eliminar la categoría',
                        confirmButtonColor: CONFIG.COLORS.primary
                    });
                }
            })
            .catch(error => {
                console.error('Error al eliminar categoría:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al eliminar la categoría',
                    confirmButtonColor: CONFIG.COLORS.primary
                });
            });
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Cargar categorías al iniciar
    cargarCategorias();

    // Configurar eventos del modal
    document.querySelector('.close').addEventListener('click', cerrarModal);
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('categoriaModal')) {
            cerrarModal();
        }
    });

    // Configurar evento del formulario
    document.getElementById('categoriaForm').addEventListener('submit', guardarCategoria);
}); 