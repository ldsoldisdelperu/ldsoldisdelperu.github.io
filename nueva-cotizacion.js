document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (!auth.verificarAutenticacion()) {
        window.location.href = './index.html';
        return;
    }

    // Cargar datos iniciales
    cargarDatosIniciales();

    // Event listener para el formulario
    document.getElementById('cotizacionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        guardarCotizacion();
    });

    // Event listener para agregar items
    document.getElementById('agregarItem').addEventListener('click', agregarNuevaFila);

    // Event listener para prioridad y departamento
    document.getElementById('prioridad').addEventListener('change', calcularTotales);
    document.getElementById('departamento').addEventListener('change', calcularTotales);
});

function cargarDatosIniciales() {
    console.log('Iniciando carga de datos iniciales...');
    
    // Establecer fecha actual
    document.getElementById('fecha').valueAsDate = new Date();
    
    // Establecer usuario actual y cliente asociado
    const usuario = auth.obtenerSesion();
    console.log('Datos del usuario:', usuario);
    document.getElementById('usuario').value = usuario.nombres || usuario.usuario;
    
    // Cargar prioridades
    cargarPrioridades();
    
    // Obtener el select de cliente
    const clienteSelect = document.getElementById('cliente');
    
    // Si el usuario tiene un cliente asociado
    if (usuario.cliente) {
        console.log('Usuario tiene cliente asignado:', usuario.cliente);
        // Limpiar y agregar solo el cliente del usuario
        clienteSelect.innerHTML = `<option value="${usuario.cliente}">${usuario.cliente}</option>`;
        clienteSelect.value = usuario.cliente;
        clienteSelect.disabled = true;
        
        // Cargar las unidades del cliente
        cargarUnidades(usuario.cliente);
    } else {
        console.log('Usuario no tiene cliente asignado, cargando todos los clientes');
        // Si no tiene cliente asociado, cargar todos los clientes
        cargarClientes();
    }
    
    // Agregar primera fila de items
    agregarNuevaFila();
}

function cargarPrioridades() {
    auth.llamarServidor('obtenerPrioridades')
        .then(response => {
            if (!response.success) {
                throw new Error('Error al cargar prioridades');
            }
            const select = document.getElementById('prioridad');
            select.innerHTML = '<option value="">Seleccione Prioridad</option>';
            response.data.forEach(valor => {
                const option = document.createElement('option');
                option.value = valor;
                option.textContent = valor;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error al cargar prioridades:', error);
            alert('Error al cargar las prioridades');
        });
}

function cargarClientes() {
    console.log('Cargando lista de clientes...');
    
    // Verificar si el usuario ya tiene un cliente asignado
    const usuario = auth.obtenerSesion();
    if (usuario.cliente) {
        console.log('Usuario ya tiene cliente asignado, no se cargarán todos los clientes');
        return;
    }

    auth.llamarServidor('obtenerClientes')
        .then(response => {
            if (!response.success) {
                throw new Error('Error al cargar clientes');
            }
            const select = document.getElementById('cliente');
            select.innerHTML = '<option value="">Seleccione Cliente</option>';
            response.data.forEach(valor => {
                const option = document.createElement('option');
                option.value = valor;
                option.textContent = valor;
                select.appendChild(option);
            });

            // Agregar evento para cargar unidades
            select.addEventListener('change', function() {
                if (this.value) {
                    cargarUnidades(this.value);
                } else {
                    const unidadSelect = document.getElementById('unidad');
                    unidadSelect.innerHTML = '<option value="">Seleccione Unidad</option>';
                    unidadSelect.disabled = true;
                    document.getElementById('departamento').value = '';
                }
            });
        })
        .catch(error => {
            console.error('Error al cargar clientes:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar los clientes',
                confirmButtonColor: CONFIG.COLORS.primary
            });
        });
}

function cargarUnidades(cliente) {
    console.log('Cargando unidades para el cliente:', cliente);
    auth.llamarServidor('obtenerUnidades', { cliente: cliente })
        .then(response => {
            console.log('Respuesta de unidades:', response);
            if (!response.success) {
                throw new Error('Error al cargar unidades');
            }
            const select = document.getElementById('unidad');
            select.disabled = false;
            select.innerHTML = '<option value="">Seleccione Unidad</option>';
            
            if (Array.isArray(response.data)) {
                response.data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.unidad;
                    option.textContent = item.unidad;
                    option.dataset.departamento = item.departamento;
                    select.appendChild(option);
                });
            }

            // Si no hay unidades, mostrar mensaje
            if (response.data.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sin unidades',
                    text: 'No se encontraron unidades para este cliente',
                    confirmButtonColor: CONFIG.COLORS.primary
                });
            }

            // Agregar evento para actualizar departamento
            select.addEventListener('change', function() {
                const option = this.options[this.selectedIndex];
                if (option && option.dataset.departamento) {
                    document.getElementById('departamento').value = option.dataset.departamento;
                }
                calcularTotales();
            });
        })
        .catch(error => {
            console.error('Error al cargar unidades:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar las unidades: ' + error.message,
                confirmButtonColor: CONFIG.COLORS.primary
            });
        });
}

function actualizarPrecioItem(fila) {
    const prioridad = document.getElementById('prioridad').value;
    const departamento = document.getElementById('departamento').value;
    const itemSelect = fila.querySelector('.item');
    const option = itemSelect.options[itemSelect.selectedIndex];

    if (!option || !option.value || !prioridad || !departamento) {
        fila.querySelector('.precio').value = '';
        fila.querySelector('.peso').value = '0';
        calcularTotales();
        return;
    }

    const cantidad = parseInt(fila.querySelector('.cantidad').value) || 1;
    const costo = parseFloat(option.dataset.costo) || 0;
    const peso = parseFloat(option.dataset.peso) || 0;
    const pesoTotal = peso * cantidad;

    // Calcular flete para este ítem
    auth.llamarServidor('calcularFlete', {
        prioridad: prioridad,
        departamento: departamento
    })
    .then(response => {
        if (!response.success) {
            throw new Error('Error al calcular flete');
        }
        const costoFlete = response.data.costo_kilo * pesoTotal;
        const precioConFlete = (costo * cantidad) + costoFlete;
        
        fila.querySelector('.precio').value = precioConFlete.toFixed(2);
        fila.querySelector('.peso').value = peso;
        calcularTotales();
    })
    .catch(error => {
        console.error('Error al calcular flete:', error);
        alert('Error al calcular el flete');
    });
}

function agregarNuevaFila() {
    const container = document.getElementById('items-container');
    const nuevaFila = document.createElement('div');
    nuevaFila.className = 'item-row';
    nuevaFila.innerHTML = `
        <select class="categoria" required>
            <option value="">Seleccione Categoría</option>
        </select>
        <select class="item" required disabled>
            <option value="">Seleccione Item</option>
        </select>
        <input type="number" class="cantidad" min="1" value="1" required>
        <input type="text" class="precio" readonly>
        <input type="hidden" class="peso" value="0">
        <button type="button" class="eliminar-fila">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(nuevaFila);

    // Cargar categorías
    cargarCategorias(nuevaFila.querySelector('.categoria'));

    // Agregar eventos
    const categoriaSelect = nuevaFila.querySelector('.categoria');
    const itemSelect = nuevaFila.querySelector('.item');
    const cantidadInput = nuevaFila.querySelector('.cantidad');
    
    categoriaSelect.addEventListener('change', function() {
        if (this.value) {
            itemSelect.disabled = false;
            cargarItems(this.value, itemSelect);
        } else {
            itemSelect.disabled = true;
            itemSelect.innerHTML = '<option value="">Seleccione Item</option>';
            nuevaFila.querySelector('.precio').value = '';
            nuevaFila.querySelector('.peso').value = '0';
        }
        calcularTotales();
    });

    itemSelect.addEventListener('change', function() {
        actualizarPrecioItem(this.closest('.item-row'));
    });

    cantidadInput.addEventListener('input', function() {
        if (this.value && !isNaN(this.value)) {
            actualizarPrecioItem(this.closest('.item-row'));
        }
    });

    nuevaFila.querySelector('.eliminar-fila').addEventListener('click', function() {
        if (container.children.length > 1) {
            nuevaFila.remove();
            calcularTotales();
        } else {
            alert('Debe mantener al menos una fila de items');
        }
    });
}

function cargarCategorias(select) {
    auth.llamarServidor('obtenerCategorias')
        .then(response => {
            if (!response.success) {
                throw new Error('Error al cargar categorías');
            }
            select.innerHTML = '<option value="">Seleccione Categoría</option>';
            response.data.forEach(valor => {
                const option = document.createElement('option');
                option.value = valor;
                option.textContent = valor;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error al cargar categorías:', error);
            alert('Error al cargar las categorías');
        });
}

function cargarItems(categoria, select) {
    auth.llamarServidor('obtenerItems', { categoria: categoria })
        .then(response => {
            if (!response.success) {
                throw new Error('Error al cargar items');
            }
            select.innerHTML = '<option value="">Seleccione Item</option>';
            response.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.item;
                option.textContent = item.item;
                option.dataset.costo = item.costo;
                option.dataset.peso = item.peso;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error al cargar items:', error);
            alert('Error al cargar los items');
        });
}

function calcularTotales() {
    const prioridad = document.getElementById('prioridad').value;
    const departamento = document.getElementById('departamento').value;
    
    if (!prioridad || !departamento) {
        document.getElementById('subtotal').value = '0.00';
        document.getElementById('igv').value = '0.00';
        document.getElementById('total').value = '0.00';
        return;
    }

    // Calcular subtotal de items (ahora los precios ya incluyen el flete)
    let subtotal = 0;
    
    document.querySelectorAll('.item-row').forEach(fila => {
        const precio = parseFloat(fila.querySelector('.precio').value) || 0;
        subtotal += precio;  // El precio ya incluye el flete
    });
    
    const igv = subtotal * 0.18;
    const total = subtotal + igv;

    document.getElementById('subtotal').value = subtotal.toFixed(2);
    document.getElementById('igv').value = igv.toFixed(2);
    document.getElementById('total').value = total.toFixed(2);
}

function guardarCotizacion() {
    // Validar formulario
    const form = document.getElementById('cotizacionForm');
    if (!form.checkValidity()) {
        alert('Por favor complete todos los campos requeridos');
        return;
    }

    // Recopilar datos del formulario
    const items = [];
    document.querySelectorAll('.item-row').forEach(fila => {
        const categoria = fila.querySelector('.categoria').value;
        const item = fila.querySelector('.item').value;
        const cantidad = parseInt(fila.querySelector('.cantidad').value) || 1;
        const precio = parseFloat(fila.querySelector('.precio').value) || 0;
        const peso = parseFloat(fila.querySelector('.peso').value) || 0;

        if (categoria && item) {
            items.push({
                categoria: categoria,
                item: item,
                cantidad: cantidad,
                precio: precio,
                peso: peso
            });
        }
    });

    const datos = {
        fecha: document.getElementById('fecha').value,
        usuario: document.getElementById('usuario').value,
        cliente: document.getElementById('cliente').value,
        unidad: document.getElementById('unidad').value,
        departamento: document.getElementById('departamento').value,
        prioridad: document.getElementById('prioridad').value,
        items: items
    };

    // Guardar cotización
    auth.llamarServidor('guardarCotizacion', { datos: JSON.stringify(datos) })
        .then(response => {
            alert('Cotización guardada exitosamente');
            window.location.href = 'cotizaciones.html';
        })
        .catch(error => {
            console.error('Error al guardar:', error);
            alert('Error al guardar la cotización');
        });
} 