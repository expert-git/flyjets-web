  $("#reset-password-form").submit((e) => {
    e.preventDefault();
    let email = $("#reset__pass_email").val();
    let password = $("#reset__pass_new").val();
    let confirm = $("#reset__pass_confirm").val();

    if (password == confirm) {
      const request = $.ajax({
        url: `${apiBaseUrl}accounts/resetpass`,
        method: "POST",
        data: JSON.stringify({
          Email: email,
          Password: password,
          Token: window.location.pathname.split("/")[3]
        }),
        contentType: "application/json",
        async: true,
        crossDomain: true,
        xhrFields: {
          withCredentials: true
        }
      })
      request.done(data => {
        window.location = "/"
      })
      request.fail(e => {
        $("#reset-password-form").reset();
      }) 
    } else {
      alert('your passwords do not match')
      $("#reset-password-form").reset();
    }
  })

