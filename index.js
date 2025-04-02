// Verificar que auth está disponible globalmente
if (typeof auth === 'undefined') {
    console.error('Error: auth no está definido. Verifica que auth.js se cargó correctamente.');
}

// Esperar a que el documento esté listo
$(document).ready(function() {
    console.log('Inicializando página de login...');

    // Si ya hay una sesión activa, redirigir al dashboard
    if (auth.verificarAutenticacion()) {
        window.location.href = './main.html';
        return;
    }

    $('#loginForm').on('submit', function(e) {
        e.preventDefault();
        
        const username = $('#username').val().trim();
        const password = $('#password').val().trim();
        
        if (!username || !password) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos requeridos',
                text: 'Por favor ingrese usuario y contraseña',
                confirmButtonColor: CONFIG.COLORS.primary
            });
            return;
        }

        // Deshabilitar el botón y mostrar estado de carga
        const $button = $(this).find('button');
        const originalText = $button.text();
        $button.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Iniciando sesión...');
        
        // Ocultar mensaje de error previo
        $('#errorMessage').hide();

        // Intentar iniciar sesión
        auth.llamarServidor('login', {
            username: username,
            password: password
        })
        .then(data => {
            auth.guardarSesion(data);
            window.location.href = './main.html';
        })
        .catch(error => {
            console.error('Error de login:', error);
            $('#errorMessage')
                .text(error.message || 'Error al iniciar sesión')
                .show();
            
            Swal.fire({
                icon: 'error',
                title: 'Error de autenticación',
                text: error.message || 'Usuario o contraseña incorrectos',
                confirmButtonColor: CONFIG.COLORS.primary
            });
        })
        .finally(() => {
            // Restaurar el botón
            $button.prop('disabled', false).html(originalText);
        });
    });
}); 