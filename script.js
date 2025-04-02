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
    // Establecer fecha actual
    document.getElementById('fecha').valueAsDate = new Date();
    
    // Establecer usuario actual
    const usuario = auth.obtenerSesion();
    document.getElementById('usuario').value = usuario.nombres || usuario.usuario;
    
    // Cargar selectores principales
    cargarPrioridades();
    cargarClientes();
    
    // Agregar primera fila de items
    agregarNuevaFila();
}

function cargarPrioridades() {
    auth.llamarServidor('obtenerPrioridades')
        .then(data => {
            const select = document.getElementById('prioridad');
            select.innerHTML = '<option value="">Seleccione Prioridad</option>';
            data.forEach(valor => {
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
    auth.llamarServidor('obtenerClientes')
        .then(data => {
            const select = document.getElementById('cliente');
            select.innerHTML = '<option value="">Seleccione Cliente</option>';
            data.forEach(valor => {
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
            alert('Error al cargar los clientes');
        });
}

function cargarUnidades(cliente) {
    auth.llamarServidor('obtenerUnidades', { cliente: cliente })
        .then(data => {
            const select = document.getElementById('unidad');
            select.disabled = false;
            select.innerHTML = '<option value="">Seleccione Unidad</option>';
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.unidad;
                option.textContent = item.unidad;
                option.dataset.departamento = item.departamento;
                select.appendChild(option);
            });

            // Agregar evento para actualizar departamento
            select.addEventListener('change', function() {
                const option = this.options[this.selectedIndex];
                document.getElementById('departamento').value = option.dataset.departamento || '';
                calcularTotales();
            });
        })
        .catch(error => {
            console.error('Error al cargar unidades:', error);
            alert('Error al cargar las unidades');
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
        calcularTotales();
    });

    cantidadInput.addEventListener('input', function() {
        if (this.value && !isNaN(this.value)) {
            calcularTotales();
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
        .then(data => {
            select.innerHTML = '<option value="">Seleccione Categoría</option>';
            data.forEach(valor => {
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
        .then(data => {
            select.innerHTML = '<option value="">Seleccione Item</option>';
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.item;
                option.textContent = item.item;
                option.dataset.costo = item.costo;
                option.dataset.peso = item.peso;
                select.appendChild(option);
            });

            // Agregar evento para actualizar precio y peso
            select.addEventListener('change', function() {
                const option = this.options[this.selectedIndex];
                const fila = this.closest('.item-row');
                if (option.value) {
                    const cantidad = parseInt(fila.querySelector('.cantidad').value) || 1;
                    const costo = parseFloat(option.dataset.costo) || 0;
                    fila.querySelector('.precio').value = (cantidad * costo).toFixed(2);
                    fila.querySelector('.peso').value = option.dataset.peso || '0';
                } else {
                    fila.querySelector('.precio').value = '';
                    fila.querySelector('.peso').value = '0';
                }
                calcularTotales();
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

    // Calcular subtotal de items
    let subtotal = 0;
    let pesoTotal = 0;
    
    document.querySelectorAll('.item-row').forEach(fila => {
        const precio = parseFloat(fila.querySelector('.precio').value) || 0;
        const peso = parseFloat(fila.querySelector('.peso').value) || 0;
        const cantidad = parseInt(fila.querySelector('.cantidad').value) || 1;
        
        subtotal += precio * cantidad;
        pesoTotal += peso * cantidad;
    });

    // Obtener costo de flete
    auth.llamarServidor('calcularFlete', {
        prioridad: prioridad,
        departamento: departamento
    })
    .then(data => {
        const costoFlete = data.costo_kilo * pesoTotal;
        subtotal += costoFlete;
        
        const igv = subtotal * 0.18;
        const total = subtotal + igv;

        document.getElementById('subtotal').value = subtotal.toFixed(2);
        document.getElementById('igv').value = igv.toFixed(2);
        document.getElementById('total').value = total.toFixed(2);
    })
    .catch(error => {
        console.error('Error al calcular flete:', error);
        alert('Error al calcular el flete');
    });
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