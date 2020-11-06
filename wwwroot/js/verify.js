$(document).ready(function() {
  const request = $.ajax({
    url: `${apiBaseUrl}accounts/verify`,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      Token: window.location.pathname.split("/")[3]
    }),
    async: true,
    crossDomain: true,
    xhrFields: {
      withCredentials: true
    }
  });

  request.done(data => {
    const $headerMessage = $("#verification-message");
    $headerMessage.text("Your account has been verified. You should be redirected to our homepage to log in");
    setTimeout(() => {
      window.location = "/"
    }, 3000)
  })

  request.fail(e => {
    const $headerMessage = $("#verification-message");
    $headerMessage.text("We did not find an account with this verification token...")
  })
})
