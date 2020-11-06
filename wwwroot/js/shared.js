var currentUser = {
    firstName: null,
    lastName: null,
    type: null,
    imageUrl: null
};

var notifications;

var currentBooking = null;

var bookingDirection = {
    roundtrip: 1,
    oneway: 2
};

var bookingTypes = {
    charterAircraft: 2,
    charterAircraftSeat: 4,
    commercialSeat: 8,
    charterFlight: 16,
    charterFlightSeat: 32,
    charterAircraftOrSeat: 64,
    charterAircraftOrComm: 128,
    charterSeatOrComm: 254,
    any: 0
};

var aircraftTypes = {
    VeryLightJet: 2,
    LightJet: 4,
    MidSizeJet: 8,
    SuperMidSizeJet: 16,
    HeavyJet: 32
};

var userTypes = {
    flyer: 1,
    aircraftProvider: 2,
    admin: 4
};

var notificationTypes = {
    inApp: 2,
    email: 4,
    textMessage: 8
};

var requestStatuses = {
    pending: 1,
    canceled: 2,
    completed: 3
};

var paymentMethodUsedFor = {
    pay: 1,
    getPaid: 2
};

var locationsTypes =
{
    Airport: 2,
    Location: 4,
    Camp: 8,
    Country: 16,
    State: 32,
    City: 64
};

var filterFlightsBy = {
    current: 2,
    upcoming: 4,
    historical: 8
};

var departuresInFiftyMiles;

var arrivalsInFiftyMiles;

var aircraftDocumentTypes = {
    airwothinessCertificate: 1,
    insuranceDocument: 2
};

function notificationCountHandler(data, userType) {
  notifications = data
  if (data.length == 0) {
    $("#header__notification__count").css({display: "none"})
  }

  //organize the notifications
  const aggregateNotificationCounts = notifications.reduce((agg, notification) => {
    agg[notification.text] = ++agg[notification.text] || 1;
    return agg;
  }, {});

  if (userType == userTypes.admin) {
    //DOM manipulation for setting corresponding notification counts to their respective sections
    $("#header__notification__count").text(notifications.length)
    $("#admin-activity-notification-count").text(aggregateNotificationCounts["New Flyer"] ? aggregateNotificationCounts["New Flyer"] : "");
    $("#admin-booking-notification-count").text(aggregateNotificationCounts["New Booking"] ? aggregateNotificationCounts["New Booking"] : "");
    $("#admin-flight-request-notification-count").text(aggregateNotificationCounts["New Flight Request"] ? aggregateNotificationCounts["New Flight Request"]: "");
    $("#admin-provider-notification-count").text(aggregateNotificationCounts["New Aircraft Provider"] ? aggregateNotificationCounts["New Aircraft Provider"] : "");
    $("#new-flyer-notification-count").text(aggregateNotificationCounts["New Flyer"] ? aggregateNotificationCounts["New Flyer"] : "")
    newFlyersDashboardTab();
    newProviderDashboardTab();
  } else if (userType == userTypes.aircraftProvider) {
    $("#provider-bookings-notification-count").text(aggregateNotificationCounts["New Booking"] ? aggregateNotificationCounts["New Booking"] : "");
    $("#provider-flight-request-notification-count").text(aggregateNotificationCounts["New Flight Request"] ? aggregateNotificationCounts["New Flight Request"]: "")
  } else {
    return null;
  }

  return aggregateNotificationCounts;
}

function newProviderDashboardTab() {
  const newProviders = notifications.filter(notification => notification.text == "New Aircraft Provider");

  if (newProviders.length) {
    const providerNotifications = 5 < newProviders.length ? 5 : newProviders.length;
    $("#provider_request_icon_count").text(newProviders.length);

    const truncatedNewProviders = newProviders.slice(0, providerNotifications);

    const $container = $("#provider_request_tab")
    $container.empty();

    for (let i = 0 ; i < truncatedNewProviders.length ; i++) {
      let $newDiv = $("<div class=\"tabsDashboard__requests-item js-request-item\"></div>")
      let providerParams = JSON.parse(truncatedNewProviders[i].params);
      $newDiv.append($(`<span class="tabsDashboard__requests-name" >${providerParams[1].Value} ${providerParams[2].Value}</span>`));
      $newDiv.append($(`<div class="tabsDashboard__requests-phone">${providerParams[4].Value}</div>`));
      $newDiv.append($(`<div class="tabsDashboard__requests-email">${providerParams[5].Value}</div>`));
      $newDiv.append($("<div class=\"tabsDashboard__requests-button-wr\"></div>"));
      $newDiv.append($(`<div class="tabsDashboard__requests-button tabsDashboard__requests-button--confirm js-request-confirm">
                        <svg class="icon__checked" width="19px" height="19px">
                          <use xlink:href="#checked"></use>
                        </svg>
                      </div>`));
      $newDiv.append($(`<svg class="icon__close" width="17px" height="17px">
                          <use xlink:href="#close"></use>
                        </svg>`).on('click', () => app.utils.responseForm("#questionPopup")));
      $container.append($newDiv)
    }
  } else {
    $("#provider_request_icon_count").css({display: "none"});
  }
}
function newFlyersDashboardTab() {
  //new flyers in the notifications
  const newFlyers = notifications.filter(notification => notification.text == "New Flyer")

  if (newFlyers.length) {
    //length variable
    const newNotifications = 5 < newFlyers.length ? 5 : newFlyers.length;
    $("#new-flyer-notification-count").text(newFlyers.length)

    //first five (or less) new flyers
    const truncatedNewFlyers = newFlyers.slice(0, newNotifications);

    const $container = $("#network_tab");

    //clear container of old notifications;
    $container.empty();

    for (let i = 0 ; i < truncatedNewFlyers.length ; i++) {
      //holder
      let $newDiv = $("<div class='tabsDashboard__network-item'></div>");

      //parse the json string from the database
      let newFlyerParams = JSON.parse(newFlyers[i].params)

      //DOM manipulation
      $newDiv.append($(`<span class="tabsDashboard__network-name">${newFlyerParams[1].Value} ${newFlyerParams[2].Value}</span>`));
      $newDiv.append($(`<div class="tabsDashboard__network-phone">${newFlyerParams[3].Value}</div>`));
      $newDiv.append($(`<div class="tabsDashboard__network-email">${newFlyerParams[4].Value}</div>`));
      $newDiv.append($(`<div class="tabsDashboard__network-info">${newFlyerParams[5].Value}</div>`));
      $container.append($newDiv);
    }
  } else {
    $("#new-flyer-notification-count").css({display: "none"})
  }
}

function formatMoney(amount, decimalCount = 2, decimal = ".", thousands = ",") {
    try {
        decimalCount = Math.abs(decimalCount);
        decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

        const negativeSign = amount < 0 ? "-" : "";

        let i = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString();
        let j = (i.length > 3) ? i.length % 3 : 0;

        return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : "");
    } catch (e) {
        console.log(e)
    }
};

function showSuccessMessage(title, text) {
    $("#successMessage .thanksPopup__title").text(title);
    $("#successMessage .thanksPopup__text").text(text);

    app.utils.responseForm('#successMessage');
}

function checkLoggedInUser(successCallback, failCallback) {
    var request = $.ajax({
        url: apiBaseUrl + 'accounts/checklogin',
        method: "GET",
        crossDomain: true,
        xhrFields: {
            withCredentials: true
        }

    });

    request.done(function (data, textStatus, xhr) {
        if (xhr.status == 200) {
            currentUser.firstName = data.firstName;
            currentUser.lastName = data.lastName;
            currentUser.imageUrl = data.imageUrl;
            currentUser.type = data.type;
            notifications = data.notifications;

            $(".header__login-username").text(currentUser.firstName + ' ' + currentUser.lastName);

            if (currentUser.imageUrl != '' && currentUser.imageUrl != null) {
                $(".header__login-avatar").find("svg").addClass("hide");
                $(".header__login-avatar").css("background-image", "url('" + currentUser.imageUrl + "')");
            }

            successCallback();
        }
    });

    request.fail(function (jqXHR, textStatus) {
        //user not logged in, show log in page
        failCallback();
    });
}

function getDate(element) {
    var date;

    try {
        date = $.datepicker.parseDate("mm/dd/yy", element.value);
    } catch (error) {
        date = null;
    }

    return date;
}

// function bindElementsEvents() {
//     $(document).on('change', 'input[type="radio"]', function () {
//         var name = $(this).attr('name');
//         var form = $(this).closest('form');
//         var radioGroup = form.find('input[name="' + name + '"]');

//     });

//     $(document).on('change', 'input[type="checkbox"]', function () {
//     });
// }

function dateToString(d, format) {
    if (d == null) return "";

    var date = new Date(d);

    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    if (format != null) {
        if (format == "mm/dd/yyyy") {
            return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
        }
    }

    return monthNames[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
}

function setInnerContainer(callback) {
    var templateName = "";

    if (currentUser.type == userTypes.flyer) {
        templateName = "flyer/inner.html";
    }
    else if (currentUser.type == userTypes.aircraftProvider) {
        templateName = "aircraftprovider/inner.html";
    }
    else if (currentUser.type == userTypes.admin) {
        templateName = "admin/inner.html";
    }

    $.get("/templates/" + templateName + "?_=" + new Date().getTime(), function (template) {

        $container.html(template);

        callback();
    });
}

$(document).ready(function () {

    $("#headerLogout").click(function () {
        var request = $.ajax({
            url: apiBaseUrl + 'accounts/logout',
            method: "GET",
            crossDomain: true,
            contentType: "application/json",
            xhrFields: {
                withCredentials: true
            }
        });

        request.done(function (data, textStatus, xhr) {
            if (xhr.status == 200) {

                currentUser = {
                    firstName: null,
                    lastName: null,
                    type: null,
                    imageUrl: null
                };

                connection.stop();
                window.location = "/";
            }
        });

        request.fail(function (jqXHR, textStatus) {
            console.log(jqXHR);
            console.log(textStatus);

            alert('ops!! call failed :(');
        });
    });

    $.validator.addMethod("equalOrGreaterThan",
        function (value, element, param) {
            var $otherElement = $(param);

            if ($otherElement.val() == "" || value == "") return true;

            return parseFloat(value) > parseFloat($otherElement.val());
        });
  setTimeout(() => {
    if (notifications) {
      notificationCountHandler(notifications, currentUser.type)
    } else {
      $("#header__notification__count").css({display: "none"})
    }
  }, 500)

})
