$(function () {

    toastr.options.progressBar = true;

    // Toggle pelo botão
    $("#sidebarToggleTop").on('click', function (e) {
        e.stopPropagation(); // Não propaga pro body!
        $(".sidebar").toggleClass('open');
    });

    $(".user-view-image").on('click', function (e) {
        e.stopPropagation(); // Não propaga pro body!
        $(".options-navbar-user").toggleClass('open');
        $(".user-view-image").toggleClass('open');
    });

    // Fecha ao clicar fora se estiver aberto
    $(document).on('click', function (e) {
        if (
            $(".sidebar").hasClass('open') &&
            !$(e.target).closest('.sidebar').length &&
            !$(e.target).is('#sidebarToggleTop')
        ) {
            $(".sidebar").removeClass('open');
        }

        if (
            $(".options-navbar-user").hasClass('open') &&
            !$(e.target).closest('.options-navbar-user').length
        ) {
            $(".options-navbar-user").removeClass('open');
            $(".user-view-image").toggleClass('open');
        }


    });

    authPanel();

});


window.addEventListener("load", function () {
    hideLoading();
});


function showLoading() {
    document.querySelector('.loading-overlay').classList.add('active');
}
function hideLoading() {
    document.querySelector('.loading-overlay').classList.remove('active');
}


function authPanel() {
    $(".form-login").on('submit', function (e) {
        e.preventDefault();
        showLoading && showLoading();
        const form = this;
        setTimeout(() => {
            try {
                const action = $(form).attr('action');
                const data = $(form).serialize();
                $.ajax({
                    url: action,
                    type: 'POST',
                    data: data,
                    dataType: 'json',
                    success: function (res, textStatus, jqXHR) {
                        try {
                            if ((jqXHR.status || 401) === 200) {
                                toastr.success('Login efetuado com sucesso!');
                                setTimeout(() => {
                                    location.href = '/dashboard';
                                }, 300);
                            } else {
                                toastr.error(res.message || 'Erro inesperado no login.');
                            }
                        } catch (error) {
                            toastr.error('Erro. Por favor, tente novamente mais tarde.');
                        }
                    },
                    error: function (jqXHR) {
                        let msg = 'Erro. Por favor, tente novamente mais tarde.';
                        try {
                            const res = JSON.parse(jqXHR.responseText);
                            msg = res.message || msg;
                        } catch (e) { }
                        toastr.error(msg);
                    },
                    complete: function () {
                        hideLoading && hideLoading();
                    }
                });
            } catch (error) {
                toastr.error('Erro. Por favor, tente novamente mais tarde.');
                hideLoading && hideLoading();
            }
        }, 300);
    });
}
