$(document).ready(function() {
    console.log('Inicializando página principal...');

    // Verificar autenticación
    if (!auth.verificarAutenticacion()) {
        window.location.href = './index.html';
        return;
    }

    const usuario = auth.obtenerSesion();
    console.log('Usuario actual:', usuario);

    // Actualizar información del usuario
    $('#userName').text(usuario.nombres || usuario.usuario);
    $('#userRole').text(usuario.cargo || usuario.rol);

    // Configurar menú según el rol
    const menuItems = [];

    // Agregar items según el rol
    if (usuario.rol === 'administrador') {
        menuItems.push(
            { url: 'nueva-cotizacion.html', icon: 'fa-plus-circle', text: 'Nueva Cotización', highlight: true },
            { url: 'cotizaciones.html', icon: 'fa-file-invoice-dollar', text: 'Cotizaciones' },
            { url: 'aprobadas.html', icon: 'fa-check-circle', text: 'Cotizaciones Aprobadas' },
            { url: 'presupuestos.html', icon: 'fa-chart-pie', text: 'Presupuestos' },
            { url: 'resumenes.html', icon: 'fa-chart-line', text: 'Resumen' }
        );
    } else if (usuario.rol === 'logistico') {
        menuItems.push(
            { url: 'aprobadas.html', icon: 'fa-check-circle', text: 'Cotizaciones Aprobadas' },
            { url: 'presupuestos.html', icon: 'fa-chart-pie', text: 'Presupuestos' },
            { url: 'resumenes.html', icon: 'fa-chart-line', text: 'Resumen' }
        );
    } else if (usuario.rol === 'aprobador') {
        menuItems.push(
            { url: 'nueva-cotizacion.html', icon: 'fa-plus-circle', text: 'Nueva Cotización', highlight: true },
            { url: 'cotizaciones.html', icon: 'fa-file-invoice-dollar', text: 'Cotizaciones' },
            { url: 'aprobadas.html', icon: 'fa-check-circle', text: 'Cotizaciones Aprobadas' }
        );
    } else {
        menuItems.push(
            { url: 'nueva-cotizacion.html', icon: 'fa-plus-circle', text: 'Nueva Cotización', highlight: true },
            { url: 'cotizaciones.html', icon: 'fa-file-invoice-dollar', text: 'Mis Cotizaciones' }
        );
    }

    // Generar HTML del menú
    const $menu = $('.menu');
    menuItems.forEach(item => {
        const $li = $('<li>').addClass('menu-item');
        const $a = $('<a>')
            .addClass('menu-link')
            .attr('href', item.url)
            .attr('target', 'content-frame')
            .html(`
                <i class="fas ${item.icon} menu-icon"></i>
                <span class="menu-text">${item.text}</span>
            `);
        
        // Aplicar estilo especial si es un item destacado
        if (item.highlight) {
            $a.addClass('highlight');
        }
        
        $li.append($a);
        $menu.append($li);
    });

    // Cargar página inicial
    if (menuItems.length > 0) {
        $('iframe[name="content-frame"]').attr('src', menuItems[0].url);
    }

    // Manejar toggle del sidebar
    $('#toggleSidebar').click(function() {
        const $sidebar = $('#sidebar');
        const $contentArea = $('#contentArea');
        const $toggleBtn = $(this);
        
        $sidebar.toggleClass('collapsed');
        $contentArea.toggleClass('expanded');
        $toggleBtn.toggleClass('collapsed');
    });

    // Manejar click en enlaces del menú
    $('.menu-link').click(function() {
        $('.menu-link').removeClass('active');
        $(this).addClass('active');
    });

    // Manejar cierre de sesión
    $('#logoutBtn').click(function() {
        Swal.fire({
            title: '¿Cerrar sesión?',
            text: '¿Está seguro que desea cerrar la sesión?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: CONFIG.COLORS.primary,
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                auth.cerrarSesion();
            }
        });
    });

    // Manejar responsive
    if (window.innerWidth <= 768) {
        $('#sidebar').addClass('collapsed');
        $('#contentArea').addClass('expanded');
        $('#toggleSidebar').addClass('collapsed');
    }

    $(window).resize(function() {
        if (window.innerWidth <= 768) {
            $('#sidebar').addClass('mobile-visible');
        } else {
            $('#sidebar').removeClass('mobile-visible');
        }
    });
}); 