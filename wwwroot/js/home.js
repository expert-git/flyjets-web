function createAccount(form, firstName, middleName, lastName, email, mobile, password, company, accountType) {

  form.addClass('loading');
  form.find('input, button, textarea, select').attr('disabled', 'disabled');

  var request = $.ajax({
    url: apiBaseUrl + 'accounts/create',
    method: "POST",
    crossDomain: true,
    data: JSON.stringify({
      firstName: firstName,
      middleName: middleName,
      lastName: lastName,
      email: email,
      mobile: mobile,
      password: password,
      companyName: company,
      accountType: accountType
    }),
    contentType: "application/json",
    xhrFields: {
      withCredentials: true
    }
  });

  request.done(function (data, textStatus, xhr) {
    if (xhr.status == 200) {
      form.removeClass('loading');
      form.find('input, button, textarea, select').removeAttr('disabled');

      if (accountType == userTypes.aircraftProvider) {
        app.utils.responseForm('#thanksPopup');
      }
      else {
        showSuccessMessage("Thanks for signing up!", "We've sent you a verification code to the provided email.")
        // currentUser.firstName = firstName;
        // currentUser.lastName = lastName;

        // $("#signUpPopup").find(".fancybox-button.fancybox-close-small").trigger('click');
        // $(".helloUser .helloUser__inner-name").text(currentUser.firstName);

        // $(".helloUser").addClass("helloUser--show");

        // setTimeout(function () { window.location = "/app/main" }, 3000);
      }
    }
  });

  request.fail(function (jqXHR, textStatus) {
    if (jqXHR.status == 302) {
      form.removeClass('loading');
      form.find('input, button, textarea, select').removeAttr('disabled');

      alert('Email already exists');
    }
    else {
      form.removeClass('loading');
      form.find('input, button, textarea, select').removeAttr('disabled');
      console.log(jqXHR);
      console.log(textStatus);

      alert('ops!! call failed :(');
    }
  });
}

$(document).ready(function () {

  checkLoggedInUser(function () { }, function () { });

  //home page
  $("#loginBtn").click(function () {

    var form = $("#loginForm");

    if (form.valid()) {
      form.addClass('loading');
      form.find('input, button, textarea, select').attr('disabled', 'disabled');

      var request = $.ajax({
        url: apiBaseUrl + 'accounts/login',
        method: "POST",
        crossDomain: true,
        data: JSON.stringify({
          email: form.find("[name=email]").val(),
          password: form.find("[name=password]").val()
        }),
        contentType: "application/json",
        xhrFields: {
          withCredentials: true
        }
      });

      request.done(function (data, textStatus, xhr) {
        if (xhr.status == 200) {
            currentUser.firstName = data.firstName;
            currentUser.lastName = data.lastName;
            notifications = data.notifications;

            $("#loginPopup").find(".fancybox-button.fancybox-close-small").trigger('click');
            $(".helloUser .helloUser__inner-name").text(currentUser.firstName);

            $(".helloUser").addClass("helloUser--show");

            setTimeout(function () { window.location = "/app/main" }, 3000);
          }
      });

      request.fail(function (jqXHR, textStatus) {
        form.removeClass('loading');
        form.find('input, button, textarea, select').removeAttr('disabled');

        if (jqXHR.status == 404) {
          alert('Incorrect email or password');
        }
        else {
            showSuccessMessage("Your account has not been verified or confirmed yet.", "Please check your email for your verification or contact information@flyjets.com");
        }
      });
    }

  });


  $("#signUpFlyerBtn").click(function () {
    var form = $("#signUpFlyerForm");

    if (form.valid()) {
      createAccount(form, form.find("[name=firstname]").val(),
        form.find("[name=middlename]").val(),
        form.find("[name=lastname]").val(),
        form.find("[name=email]").val(),
        form.find("[name=phone]").val(),
        form.find("[name=password]").val(),
        null,
        1);
    }
  });

  $("#signUpAircraftProviderBtn").click(function () {

    var form = $("#signUpAircraftProviderForm");

    if (form.valid()) {
      createAccount(form, form.find("[name=firstname]").val(),
        form.find("[name=middlename]").val(),
        form.find("[name=lastname]").val(),
        form.find("[name=email]").val(),
        form.find("[name=phone]").val(),
        form.find("[name=password]").val(),
        form.find("[name=company]").val(),
        2);
    }

  });

  $("#sendPassword").click(function () {

    var form = $("#forgotPasswordForm");

    if (form.valid()) {
      form.addClass('loading');
      form.find('input, button, textarea, select').attr('disabled', 'disabled');

      var request = $.ajax({
        url: apiBaseUrl + 'accounts/forgotpass',
        method: "POST",
        crossDomain: true,
        data: JSON.stringify({
          email: form.find("[name=email]").val()
        }),
        contentType: "application/json",
        xhrFields: {
          withCredentials: true
        }
      });

      request.done(function (data, textStatus, xhr) {
        if (xhr.status == 200) {
          currentUser.firstName = data.firstName;
          currentUser.lastName = data.lastName;

          form.removeClass('loading');
          form.find('input, button, textarea, select').removeAttr('disabled');

          $("#forgotPasswordPopup").find(".fancybox-button.fancybox-close-small").trigger('click');
        }
      });

      request.fail(function (jqXHR, textStatus) {
        console.log(jqXHR);
        console.log(textStatus);
        alert('ops!! call failed :(');
      });
    }

  });
});
