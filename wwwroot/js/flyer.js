var templates = {
    searchFlights: null,
    searchFlightsResults: null,
    searchFlightsResultsItem: null,
    flightRequestForm: null,
    bookingProcessContainer: null,
    bookingProcessFlightTab: null,
    bookingProcessAircraftTab: null,
    bookingProcessTravelersTab: null,
    bookingProcessTraveler: null,
    bookingProcessTermsTab: null,
    bookingProcessPaymentTab: null,
    bookingProcessPaymentMethod: null,
    bookingProcessConfirmationTab: null
}

var completeBookingForBookingId = null;
var searchFlightsBlock = "",
    $container;

var searchResultsCache = {
    charterAircrafts: [],
    charterFlights: [],
    charterAircraftSeats: [],
    charterFlightSeats: [],
    commercialFlights: []
};

function execAjaxCall(action, method, data, onSuccess, onFail) {
    var request = $.ajax({
        url: apiBaseUrl + action,
        method: method,
        crossDomain: true,
        contentType: "application/json",
        data: data == null ? null : JSON.stringify(data),
        xhrFields: {
            withCredentials: true
        }
    });

    request.done(function (returnedData, textStatus, xhr) {
        onSuccess(returnedData, textStatus, xhr);
    });

    request.fail(function (jqXHR, textStatus) {
        onFail(jqXHR, textStatus);
    });
}

function initSearchFlightsPage(callback) {
    $.get("/templates/searchFlights.html?_=" + new Date().getTime(), function (template) {
        templates.searchFlights = template;

        $container.html(template);
        inputMaskInit();
        numberOnlyInit();
        counterInit();
        checkboxChange();
        customSelectInit();
        radioChange();
        searchForm();
        submitForm();


        callback();
    });
}

function drawFlightPath(sourcePosition, destinationPosition) {
    var flightPlanCoordinates = [
        sourcePosition,
        destinationPosition
    ];

    flightPath = new google.maps.Polyline({
        path: flightPlanCoordinates,
        geodesic: true,
        strokeColor: '#000',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });

    // flightPath.setMap(map);

    // map.fitBounds(bounds);
    // map.panToBounds(bounds);
}

function getNearLocations(locType, radius) {
    var lat, lng;
    var zoomTo = null;

    if (locType == 'dep') {
        if (sourcePosition == null) return;

        lat = sourcePosition.lat;
        lng = sourcePosition.lng;
        zoomTo = sourcePosition;
    }
    else {
        if (destinationPosition == null) return;

        lat = destinationPosition.lat;
        lng = destinationPosition.lng;
        zoomTo = destinationPosition;
    }

    $.ajax({
        url: apiBaseUrl + 'locations/inxmilesradius/' + lat + '/' + lng + '/' + radius + '/2',
        type: 'GET',
        //data: 'lat=' + lat + '&lng=' + lng + '&radius=' + radius + '&locType=1',
        async: true,
        crossDomain: true,
        xhrFields: {
            withCredentials: true
        },
        success: function (data) {
            var markerIcon = {
                url: '/img/assets/loc-map-marker2.png',
                scaledSize: new google.maps.Size(30, 49)
            };

            for (var index = 0; index < data.length; index++) {
                var infowindow = new google.maps.InfoWindow({
                    content: '<div style="background-color:white; color: black;">' + data[index].name + '</div>'
                });

                var marker = new google.maps.Marker({
                    position: { lat: data[index].lat, lng: data[index].lng },
                    // map: map,
                    title: data[index].name,
                    icon: markerIcon
                });

                // infowindow.open(map, marker);
            }

          //filter out heliports
          const regex = new RegExp("^((?!Heli).)*$", "gi")
          let cleanData = data.filter(location => location.name.match(regex))

          if (locType == 'dep') {
            departuresInFiftyMiles = cleanData;
          } else {
            arrivalsInFiftyMiles = cleanData;
          }

            // map.setZoom(12);
            // map.panTo(zoomTo);
        }
    });
}

function showFlightRequestForm($searchForm, $searchExtraFilters) {

    var showForm = function () {
        var template = $($.parseHTML("<div>" + templates.flightRequestForm + "</div>"));

        var departureId = $searchForm.find("#departureId").val(),
            departureName = $searchForm.find("#departure").val(),
            arrivalId = $searchForm.find("#arrivalId").val(),
            arrivalName = $searchForm.find("#arrival").val(),
            departureDate = $searchForm.find("#departureDate").val(),
            returnDate = $searchForm.find("#returnDate").val(),
            pax = $searchForm.find("#passengersNum").val(),
            bookingType = 0,
            direction = $searchForm.find("#direction").val();

        $searchForm.find("input[name=bookingType]").each(function () {
            if ($(this).is(":checked")) {
                bookingType += parseInt($(this).val());
            }
        });

if($container.find("#flightRequestFormBlock").length == 1){
$container.find("#flightRequestFormBlock").remove();
}

        $("#searchFlightsResultsBlock").hide();
        $container.append(template.html());

        var $flightRequestForm = $container.find("#flightRequestForm");

        changeRoundTrip($flightRequestForm);

        $flightRequestForm.find("#direction").val(direction);

        $flightRequestForm.find(".form__radio.js-changeWay").change(function () {
            if ($(this).val() == "one-way") {
                $flightRequestForm.find("#direction").val(bookingDirection.oneway);
            }
            else {
                $flightRequestForm.find("#direction").val(bookingDirection.roundtrip);
            }
        });

        if ((bookingType & bookingTypes.charterAircraft) == bookingTypes.charterAircraft) {
            $flightRequestForm.find("#bookingTypeCA").trigger("click");
        }

        if ((bookingType & bookingTypes.charterAircraftSeat) == bookingTypes.charterAircraftSeat) {
            $flightRequestForm.find("#bookingTypeCS").trigger("click");
        }

        if ((bookingType & bookingTypes.commercialSeat) == bookingTypes.commercialSeat) {
            $flightRequestForm.find("#bookingTypeCom").trigger("click");
        }

        var $departure = $flightRequestForm.find("#departure");
        var $arrival = $flightRequestForm.find("#arrival");

        $departure.val(departureName);
        $flightRequestForm.find("#departureId").val(departureId);
        $arrival.val(arrivalName);
        $flightRequestForm.find("#arrivalId").val(arrivalId);
        $flightRequestForm.find("#departureDate").val(departureDate);
        $flightRequestForm.find("#returnDate").val(returnDate);
        $flightRequestForm.find("#pax").val(pax);

        var locations = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote: {
                url: apiBaseUrl + 'locations/search/tree/%QUERY',
                wildcard: '%QUERY'
            }
        });

        $departure.typeahead(null, {
            name: 'departureLocations',
            display: 'name',
            source: locations,
            minLength: 3
        }).bind("typeahead:selected", function (obj, datum, name) {
            $flightRequestForm.find("#departureId").val(datum.id);
        });

        $arrival.typeahead(null, {
            name: 'arrivalLocations',
            display: 'name',
            source: locations,
            minLength: 3
        }).bind("typeahead:selected", function (obj, datum, name) {
            $flightRequestForm.find("#arrivalId").val(datum.id);
        });

        $departure.blur(function () {
            if ($(this).val() == "") {
                $departure.val("");
            }
        });

        $arrival.blur(function () {
            if ($(this).val() == "") {
                $arrival.val("");
            }
        });

        $(".editSearch").click(function () {
            $("#searchFlightsBlock").show();
            $("#flightRequestFormBlock").remove();
        });

$flightRequestForm.find("#createFlightRequestBtn").click(function () {
  let tempBookingType = 0
  let tempMeasure = 0
  let finalBooking = 0
  $flightRequestForm.find("input[name=booking]").each((i, el)=> {
    if($(el).closest(".form__label--checkbox").hasClass("checked")) {
      tempBookingType += 1
      tempMeasure += parseInt($(el).attr('data-val'))
    }

    if (tempBookingType == 1) {
      switch (tempMeasure) {
        case 1:
          finalBooking = bookingTypes.charterAircraft
          break
        case 2:
          finalBooking = bookingTypes.charterAircraftSeat
          break
        case 3:
          finalBooking = bookingTypes.commercialSeat
          break;
        default:
          break
      }
    }

    if (tempBookingType == 2) {
      switch (tempMeasure) {
        case 3:
          finalBooking = bookingTypes.charterAircraftOrSeat
          break;
        case 4:
          finalBooking = bookingTypes.charterAircraftOrComm
          break;
        case 5:
          finalBooking = bookingTypes.charterSeatOrComm
          break
        default:
          break
      }
    }
    if (tempBookingType == 3) {
      finalBooking = bookingTypes.any
    }
  })
  createFlightRequest($flightRequestForm, finalBooking);
});

        $("#flightRequestFormBlock").find("#flightRequestCreatedBtn").click(function () {
            $("#searchFlightsBlock").show();
            $("#flightRequestFormBlock").remove();
        });
radioChange();
checkboxChange();
counterInit();
};

    if (templates.flightRequestForm == null) {
        $.get("/templates/flightRequestForm.html?_=" + new Date().getTime(), function (template) {
            templates.flightRequestForm = template;

            showForm();
        });
    }
    else {

        showForm();
    }
}

function createFlightRequest($flightRequestForm, finalBookingType) {
    $flightRequestForm.addClass('loading');
    $flightRequestForm.find('input, button, textarea, select').attr('disabled', 'disabled');
    let calendarDates = $("input[name=date]").val().split(" - ");

    var departureId = $flightRequestForm.find("#departureId").val(),
        arrivalId = $flightRequestForm.find("#arrivalId").val(),
        departureDate = calendarDates[0],
        returnDate = calendarDates[1] || null,
        pax = $flightRequestForm.find("#pax").val(),
        bookingType = finalBookingType,
        direction = $flightRequestForm.find("#direction").val(),
        priceFrom = $flightRequestForm.find("#priceFrom").val(),
        priceTo = $flightRequestForm.find("#priceTo").val();

    var aircraftType = 0;

    $flightRequestForm.find("input[name=aircraftType]:checked").each(function () {
        aircraftType += parseInt($(this).val());
    });

    var request = $.ajax({
        url: apiBaseUrl + 'bookings/flightsrequests/create',
        method: "POST",
        crossDomain: true,
        data: JSON.stringify({
            direction: direction,
            bookingType: finalBookingType,
            departureId: departureId,
            arrivalId: arrivalId,
            departureDate: departureDate,
            returnDate: returnDate,
            pax: pax,
            minPrice: priceFrom,
            maxPrice: priceTo,
            notes: "",
            aircraftType: aircraftType == 0 ? null : aircraftType
        }),
        contentType: "application/json",
        xhrFields: {
            withCredentials: true
        }
    });

    request.done(function (data, textStatus, xhr) {
        $flightRequestForm.removeClass('loading');
        $flightRequestForm.find('input, button, textarea, select').removeAttr('disabled');

        app.utils.responseForm('#flightRequestCreatedPopup');
    });

    request.fail(function (jqXHR, textStatus) {
        $flightRequestForm.removeClass('loading');
        $flightRequestForm.find('input, button, textarea, select').removeAttr('disabled');

        console.log(jqXHR);
        console.log(textStatus);
        alert('ops!! call failed :(');
    });
}

var myLatLng = { lat: 37.7765745, lng: -5.7560792 };
var bounds;
var flightPath = null;
var infowindow;
var source = null;
var destination = null;
var sourcePosition = null;
var destinationPosition = null;

/*******************************Flyer Module Start****************************************/

var flyerModule = flyerModule || {};

flyerModule.booking = {};
flyerModule.flights = {};
flyerModule.dashboard = {};
flyerModule.profile = {};
flyerModule.flightRequests = {};
flyerModule.paymentMethods = {};
flyerModule.routeAlerts = {};

//booking
(function () {
    this.searchFlightsTemplate = null;
    this.searchFlightsResultsTemplate = null;
    this.searchFlightsResultsItemTemplate = null;
    this.bookingsListTemplate = null;
    this.bookingsListItemTemplate = null;

    this.init = function () {
        var _this = this;

        $("#adminHeaderMenue, #aircraftProviderHeadrMenue").remove();

        $("#flyerHeaderMenue .header__login-menu-list-item").click(function () {
            
            switch ($(this).data("tab")) {
                case "dashboard":
                    flyerModule.dashboard.init();
                    break;
                case "profile":
                    flyerModule.profile.init();
                    break;
                case "flights":
                    flyerModule.flights.init();
                    break;
                case "bookings":
                    flyerModule.booking.initBookingsTab();
                    break;
                case "settings":
                    flyerModule.settings.init();
                    break;
                case "iddocs":
                    break;
                case "rewards":
                    break;
                case "payMethods":
                    commonModule.paymentMethods.init();
                    break;
                case "routealerts":
                    flyerModule.routeAlerts.init();
                    break;
                case "messages":
                    break;
                case "requests":
                    break;
                case "auctions":
                    break;
                case "sellseats":
                    break;
                case "flightsReqs":
                    flyerModule.flightRequests.init();
                    break;
                default:
                    break;
            }
        });

        if (completeBookingForBookingId != null) {
            _this.completeOfflineBooking();
        }
        else {

            var setView = function () {
                var $searchFlightsTemplate = _this.searchFlightsTemplate.clone(),
                    $form = $searchFlightsTemplate.find("#flightsSearchFilters"),
                    $departure = $form.find("#departure"),
                    $arrival = $form.find("#arrival"),
                    $nearLocations = $form.find('input[name="radius"]');


                // featured flight book onclick setup - augmented from this.searchFlights > bindsearchresults
                  var bindFeaturedFlightResult = (response) => {

                        $searchFlightsResultsBlock = $("<div></div>").append(_this.searchFlightsResultsTemplate.clone());

                        var { aircraft, homeBase, departure, arrival } = response;
                        var numPassengers = $('#passengersNum').val();
                        //find below data in response -- header data
                        $searchFlightsResultsBlock.find("#departureName").text(departure.displayName);
                        $searchFlightsResultsBlock.find("#arrivalName").text(arrival.arrivalName);
                       // $searchFlightsResultsBlock.find("#directionText").text(filters.direction == bookingDirection.oneway ? "One-way" : "Round-trip");
                        $searchFlightsResultsBlock.find("#pax").text(numPassengers);
                        //$searchFlightsResultsBlock.find("#depRetDates").text(filters.direction == bookingDirection.oneway ?
                          //  dateToString(filters.departureDate) : dateToString(filters.departureDate) + ' - ' + dateToString(filters.returnDate));
                          
                          var activeTabSelected = false;
                          
                          switch(response.flightType)
                          {
                            case 2:
                                $searchFlightsResultsBlock.find("#bookingTypes").text("Charter Aircraft");
                                $(".mapBlock__tab-nav-item[data-id=charterAircraft]").removeClass("hide");
                                $(".mapBlock__tab-nav-item[data-id=charterAircraft]").addClass("active");
                                $(".mapBlock__tab-content-item[data-id=charterAircraft]").addClass("active").css('display', 'block');
                                activeTabSelected = true;
                                break;
                            case 4:
                                $searchFlightsResultsBlock.find("#bookingTypes").text("Charter Aircraft Seat");
                                $(".mapBlock__tab-nav-item[data-id=charterAircraftSeat]").removeClass("hide");
                                $(".mapBlock__tab-nav-item[data-id=charterAircraftSeat]").addClass("active");
                                $(".mapBlock__tab-content-item[data-id=charterAircraftSeat]").addClass("active").css('display', 'block');
                                activeTabSelected = true;
                                break;
                            case 16:
                                $searchFlightsResultsBlock.find("#bookingTypes").text("Charter Flight");                                
                                $(".mapBlock__tab-nav-item[data-id=charterFlight]").removeClass("hide");
                                $(".mapBlock__tab-nav-item[data-id=charterFlight]").addClass("active");
                                $(".mapBlock__tab-content-item[data-id=charterFlight]").addClass("active").css('display', 'block');
                                activeTabSelected = true;
                                break;
                            case 32:
                                $searchFlightsResultsBlock.find("#bookingTypes").text("Charter Flight Seat");
                                $(".mapBlock__tab-nav-item[data-id=charterFlightSeat]").removeClass("hide");
                                $(".mapBlock__tab-nav-item[data-id=charterFlightSeat]").addClass("active");
                                $(".mapBlock__tab-content-item[data-id=charterFlightSeat]").addClass("active").css('display', 'block');
                                activeTabSelected = true;
                                break;
                        }
        
        
                        $("#searchFlightsBlock").hide();
                        $container.append($searchFlightsResultsBlock.html());
        
                        $searchFlightsResultsBlock = $container.find("#searchFlightsResultsBlock");
        
                        $(".mapBlock__tab-nav-item").removeClass("active");
                        $(".mapBlock__tab-nav-item").addClass("hide");
                        $(".mapBlock__tab-content-item").removeClass("active").css('display', 'none');
                        
                        $("#manual-request").hide();
                    //   $("#manual-request").click(function() {
                    //     var showForm = function () {
                    //       var template = $($.parseHTML("<div>" + templates.flightRequestForm + "</div>"));
        
        
                    //       if($container.find("#flightRequestFormBlock").length == 1){
                    //         $container.find("#flightRequestFormBlock").remove();
                    //       }
        
                    //       $("#searchFlightsResultsBlock").hide();
                    //       $container.append(template.html());
        
                    //       var $flightRequestForm = $container.find("#flightRequestForm");
        
                    //       changeRoundTrip($flightRequestForm);
        
                    //       $flightRequestForm.find("#direction").val(filters.direction);
        
                    //       $flightRequestForm.find(".form__radio.js-changeWay").change(function () {
                    //         if ($(this).val() == "one-way") {
                    //           $flightRequestForm.find("#direction").val(bookingDirection.oneway);
                    //         }
                    //         else {
                    //           $flightRequestForm.find("#direction").val(bookingDirection.roundtrip);
                    //         }
                    //       });
        
                    //       if ((filters.bookingType & bookingTypes.charterAircraft) == bookingTypes.charterAircraft) {
                    //         $flightRequestForm.find("#bookingTypeCA").trigger("click");
                    //       }
        
                    //       if ((filters.bookingType & bookingTypes.charterAircraftSeat) == bookingTypes.charterAircraftSeat) {
                    //         $flightRequestForm.find("#bookingTypeCS").trigger("click");
                    //       }
        
                    //       if ((filters.bookingType & bookingTypes.commercialSeat) == bookingTypes.commercialSeat) {
                    //         $flightRequestForm.find("#bookingTypeCom").trigger("click");
                    //       }
        
                    //       var $departure = $flightRequestForm.find("#departure");
                    //       var $arrival = $flightRequestForm.find("#arrival");
        
        
                    //       var locations = new Bloodhound({
                    //         datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                    //         queryTokenizer: Bloodhound.tokenizers.whitespace,
                    //         remote: {
                    //           url: apiBaseUrl + 'locations/search/tree/2/true/%QUERY',
                    //           wildcard: '%QUERY'
                    //         }
                    //       });
        
                    //       $departure.typeahead(null, {
                    //         name: 'departureLocations',
                    //         display: 'name',
                    //         source: locations,
                    //         minLength: 3
                    //       }).bind("typeahead:selected", function (obj, datum, name) {
                    //         $flightRequestForm.find("#departureId").val(datum.id);
                    //       });
        
                    //       $arrival.typeahead(null, {
                    //         name: 'arrivalLocations',
                    //         display: 'name',
                    //         source: locations,
                    //         minLength: 3
                    //       }).bind("typeahead:selected", function (obj, datum, name) {
                    //         $flightRequestForm.find("#arrivalId").val(datum.id);
                    //       });
        
                    //       $departure.blur(function () {
                    //         if ($(this).val() == "") {
                    //           $departure.val("");
                    //         }
                    //       });
        
                    //       $arrival.blur(function () {
                    //         if ($(this).val() == "") {
                    //           $arrival.val("");
                    //         }
                    //       });
        
                    //       $(".editSearch").click(function () {
                    //         $("#searchFlightsBlock").show();
                    //         $("#flightRequestFormBlock").remove();
                    //       });
        
                    //       $flightRequestForm.find("#createFlightRequestBtn").click(function () {
                    //         let tempBookingType = 0
                    //         let tempMeasure = 0
                    //         $flightRequestForm.find("input[name=booking]").each((i, el)=> {
                    //           if($(el).closest(".form__label--checkbox").hasClass("checked")) {
                    //           tempBookingType += 1
                    //           tempMeasure += parseInt($(el).attr('data-val'))
                    //           }
        
                    //           if (tempBookingType == 1) {
                    //             switch (tempMeasure) {
                    //               case 1:
                    //                 filters.bookingType = bookingTypes.charterAircraft
                    //                 break
                    //               case 2:
                    //                 filters.bookingType = bookingTypes.charterAircraftSeat
                    //                 break
                    //               case 3:
                    //                 filters.bookingType = bookingTypes.commercialSeat
                    //                 break;
                    //               default:
                    //                 break
                    //             }
                    //           }
        
                    //           if (tempBookingType == 2) {
                    //             switch (tempMeasure) {
                    //               case 3:
                    //                 filters.bookingType = bookingTypes.charterAircraftOrSeat
                    //                 break;
                    //               case 4:
                    //                 filters.bookingType = bookingTypes.charterAircraftsOrComm 
                    //                 break;
                    //               case 5:
                    //                 filters.bookingType = bookingTypes.charterSeatOrComm
                    //                 break
                    //               default:
                    //                 break
                    //             }
                    //           }
                    //           if (tempBookingType == 3) {
                    //             filters.bookingType = bookingTypes.any
                    //           }
                    //         })
                    //         createFlightRequest($flightRequestForm, filters.bookingType);
                    //       });
        
                    //       $("#flightRequestFormBlock").find("#flightRequestCreatedBtn").click(function () {
                    //         $("#searchFlightsBlock").show();
                    //         $("#flightRequestFormBlock").remove();
                    //       });
                    //       radioChange();
                    //       checkboxChange();
                    //       counterInit();
                    //     };
        
                    //     if (templates.flightRequestForm == null) {
                    //       $.get("/templates/flightRequestForm.html?_=" + new Date().getTime(), function (template) {
                    //         templates.flightRequestForm = template;
        
                    //         showForm();
                    //       });
                    //     }
                    //     else {
                    //       showForm();
                    //     }
        
                    //   })
                      //prepare tabs
                        tabsInit();
        
                        // $(".mapBlock__tab-nav-item").click(function () {
                        //     var filterBy = $(this).data("id");
        
                        //     switch (filterBy) {
                        //         case "charterAircraft":
                        //             getFlightsData(bookingTypes.charterAircraft);
                        //             break;
                        //         case "charterFlights":
                        //             getFlightsData(bookingTypes.charterFlight);
                        //             break;
                        //         case "charterAircraftSeats":
                        //             getFlightsData(bookingTypes.charterAircraftSeat);
                        //             break;
                        //         case "charterFlightSeats":
                        //             getFlightsData(bookingTypes.charterFlightSeat);
                        //             break;
                        //         case "commercialSeats":
                        //             getFlightsData(bookingTypes.commercialSeat);
                        //             break;
                        //         default:
                        //             break;
                        //     };
                        // });
                    
        
                    //bind search results for current tab
                    // if (searchResultsData.length == 0) {
                    //     var $dialog = $("#noFlightsFoundPopup");
        
                    //     var title, bookingTypeFilter;
        
                    //     switch (filters.bookingType) {
                    //         case (bookingTypes.charterAircraft):
                    //             title = "No Charter Aircraft Found";
                    //             bookingTypeFilter = "charter aircraft";
                    //             break;
                    //         case (bookingTypes.charterFlight):
                    //             title = "No Charter Flight Found";
                    //             bookingTypeFilter = "charter flight";
                    //             break;
                    //         case (bookingTypes.charterAircraftSeat):
                    //             title = "No Charter Aircraft Seat Found";
                    //             bookingTypeFilter = "charter aircraft seat";
                    //             break;
                    //         case (bookingTypes.charterFlightSeat):
                    //             title = "No Charter Flight Seat Found";
                    //             bookingTypeFilter = "charter flight seat";
                    //             break;
                    //         case (bookingTypes.commercialSeat):
                    //             title = "No Commercial Seat Found";
                    //             bookingTypeFilter = "commercial seat";
                    //             break;
                    //         default:
                    //             break;
                    //     };
        
                    //     $dialog.find(".thanksPopup__title").text(title);
                    //     var $dialogText = $dialog.find(".thanksPopup__text");
        
                    //     $dialogText.text($dialogText.text().replace("{bookingTypeFilter}", bookingTypeFilter));
        
                    //     app.utils.responseForm('#noFlightsFoundPopup');
                    // }
                    // else {
                        var $activeTab = $searchFlightsResultsBlock.find(".mapBlock__tab-nav-item.active");
                        var $activeTabContentItem = $searchFlightsResultsBlock.find(".mapBlock__tab-content-item[data-id=" + $activeTab.data('id') + "]");
        
                        $activeTabContentItem.html('<div class="mapBlock__tab-content-inner"><div class= "mapBlock__results-list js-customScroll"></div></div>');
        
                        var $resultsList = $activeTabContentItem.find(".mapBlock__results-list");
        // build response object to match whats expected?
                            switch ($activeTab.data("id")) {
                                case "charterAircraft":
                                    searchResultsCache.charterAircrafts.push(response);
                                    break;
                                case "charterFlights":
                                    searchResultsCache.charterFlights.push(response);
                                    break;
                                case "charterAircraftSeats":
                                    searchResultsCache.charterAircraftSeats.push(response);
                                    break;
                                case "charterFlightSeats":
                                    searchResultsCache.charterFlightSeats.push(response);
                                    break;
                                case "commercialSeats":
                                    searchResultsCache.commercialFlights.push(response);
                                    break;
                                default:
                                    break;
                            };
        
                            var $item = _this.searchFlightsResultsItemTemplate.clone();
        
                            $item.find(".aircraftImageUrl").css("background-image", "url('" + response.defaultImageUrl + "')");
                            $item.find(".departureName").text(response.departure);
                            $item.find(".arrivalName").text(response.arrival);
                            $item.find(".aircraftModel").text(response.aircraftModel);
                            $item.find(".aircraftType").text(response.aircraftType);
                            $item.find(".safetyRating").text(response.aircraftArgusSafetyRating);
                            $item.find(".aircraftPax").text(response.numPax + "/" + response.aircraftPax);
        
                            //this.bookableDemo ? $item.find(".bookableDemo").show() : $item.find(".bookableDemo").hide();
        
                            if (response.flightDurationHours != 0 && response.flightDurationMinutes != 0) {
                                $item.find(".estimatedTripTime").text(response.flightDurationHours + 'H ' + response.flightDurationMinutes + 'MIN');
                            }
                            else if (response.flightDurationHours != 0) {
                                $item.find(".estimatedTripTime").text(response.flightDurationHours + 'H');
                            }
                            else {
                                $item.find(".estimatedTripTime").text(response.flightDurationMinutes + 'MIN');
                            }
        
                            $item.find(".totalPrice").text("$" + formatMoney(response.totalPrice * numPassengers));
                            $item.find(".aircraftSpeed").text(response.aircraftSpeed);
                            $item.find(".aircraftRange").text(response.aircraftRange + " NM");
                            $item.find(".hasWifi").text(response.wiFi ? "Yes" : "No");
                            $item.find(".teleNum").text(response.numberOfTelevision == null ? 0 : response.numberOfTelevision);
        
                            //$item.find(".bookBtn").data("id", this.aircraftAvailabilityId);
        
                            if ($activeTab.data("id") == "charterAircraft" || $activeTab.data("id") == "charterFlights") {
                                $item.find(".bookBtn").html('<span class="text">Book</span>');
                            }
                            else if ($activeTab.data("id") == "charterAircraftSeats" || $activeTab.data("id") == "charterFlightSeats") {
                                $item.find(".bookBtn").html('<span class="text">Reserve</span>');
                            }
                            else {
        
                            }
        
                            $resultsList.append($item);
        
                        sidebarResultsHover();
        
                      $activeTabContentItem.find(".bookBtn").click(function () {
        
                        switch ($activeTab.data("id")) {
                            case "charterAircraft":
                                var selectedBooking;
                                var aircraftAvailabilityId = $(this).data("id");
                            //console.log(departuresInFiftyMiles, arrivalsInFiftyMiles)
        
                                $.each(searchResultsCache.charterAircrafts, function () {
                                    if (this.aircraftAvailabilityId == aircraftAvailabilityId) {
                                        selectedBooking = this;
                                        return false;
                                    }
                                });
        
                                _this.startBooking(selectedBooking.direction, selectedBooking.bookingType,
                                    selectedBooking.departure, selectedBooking.departureId, selectedBooking.departureDate,
                                    selectedBooking.arrival, selectedBooking.arrivalId, selectedBooking.returnDate, selectedBooking.pax,
                                    selectedBooking.aircraftId, selectedBooking.aircraftAvailabilityId, selectedBooking.totalPrice,
                                    selectedBooking.exclusiveTotalPrice, selectedBooking.totalFees, selectedBooking.totalTaxes);
                                break;
                            case "charterFlights":
                                var selectedBooking;
                                $.each(searchResultsCache.charterFlights, function () {
                                    if (this.aircraftAvailabilityId == aircraftAvailabilityId) {
                                        selectedBooking = this;
                                        return false;
                                    }
                                });
                                _this.startBooking(selectedBooking.direction, selectedBooking.bookingType,
                                    selectedBooking.departure, selectedBooking.departureId, selectedBooking.departureDate,
                                    selectedBooking.arrival, selectedBooking.arrivalId, selectedBooking.returnDate, selectedBooking.pax,
                                    selectedBooking.aircraftId, selectedBooking.aircraftAvailabilityId, selectedBooking.totalPrice,
                                    selectedBooking.exclusiveTotalPrice, selectedBooking.totalFees, selectedBooking.totalTaxes);
                                break;
                            case "charterAircraftSeats":
                                var selectedBooking;
                                var aircraftAvailabilityId = $(this).data("id");
        
                                $.each(searchResultsCache.charterAircraftSeats, function () {
                                    if (this.aircraftAvailabilityId == aircraftAvailabilityId) {
                                        selectedBooking = this;
                                        return false;
                                    }
                                });
                                _this.startBooking(selectedBooking.direction, selectedBooking.bookingType,
                                    selectedBooking.departure, selectedBooking.departureId, selectedBooking.departureDate,
                                    selectedBooking.arrival, selectedBooking.arrivalId, selectedBooking.returnDate, selectedBooking.pax,
                                    selectedBooking.aircraftId, selectedBooking.aircraftAvailabilityId, selectedBooking.totalPrice,
                                    selectedBooking.exclusiveTotalPrice, selectedBooking.totalFees, selectedBooking.totalTaxes);
        
                                break;
                            case "charterFlightSeats":
                                var selectedBooking;
                                $.each(searchResultsCache.charterFlightSeats, function () {
                                    if (this.aircraftAvailabilityId == aircraftAvailabilityId) {
                                        selectedBooking = this;
                                        return false;
                                    }
                                });
                                _this.startBooking(selectedBooking.direction, selectedBooking.bookingType,
                                    selectedBooking.departure, selectedBooking.departureId, selectedBooking.departureDate,
                                    selectedBooking.arrival, selectedBooking.arrivalId, selectedBooking.returnDate, selectedBooking.pax,
                                    selectedBooking.aircraftId, selectedBooking.emptyLegId, selectedBooking.totalPrice,
                                    selectedBooking.exclusiveTotalPrice, selectedBooking.totalFees, selectedBooking.totalTaxes);
                                break;
                            case "commercialSeats":
                                break;
                            default:
                                break;
                        };
        
                        var createBookingSuccess = function (returnedData, textStatus, xhr) {
                          currentBooking = returnedData.bookingNo;
                        };
        
                        var createBookingFailure = function (jqXHR, textStatus) {
                          console.log(jqXHR);
                          console.log(textStatus);
        
                          alert('ops!! call failed :(');
                        };
                        const bookingPax = parseInt($("#pax").html());
        
                        const { direction, bookingType, departureId, arrivalId, departureDate, returnDate, aircraftAvailabilityId: airplaneId, emptyLegId, pax } = selectedBooking
                        const info = {
                          direction,
                          bookingType,
                          departureId,
                          arrivalId,
                          departureDate,
                          returnDate,
                          aircraftAvailabilityId: airplaneId || emptyLegId,
                          paymentMethodId: null,
                          pax,
                          travelers: [],
                          bookingPax, 
                        }
                            execAjaxCall("bookings/create", "POST", info, createBookingSuccess, createBookingFailure);
                      });
        
                        customScrollInit();
                    }
        
                    $(".editSearch").click(function () {
                        $("#searchFlightsBlock").show();
                        $("#searchFlightsResultsBlock").remove();
                    });
                

                //set featured flights list
                var $featuredList = $searchFlightsTemplate.find("#featured-flights-list");
                var request = $.ajax(`${apiBaseUrl}bookings/flights/featured`)
                //     url: `${apiBaseUrl}bookings/flights/featured`,
                //     method: "GET",
                //     crossDomain: true,
                //     contentType: "application/json",
                //     xhrFields: {
                //         withCredentials: true
                //     }
                // });
                function sidebarResultsHover() {
                    var $items = $('.js-sidebarListItem'),
                        $detailBlocks = $items.find('.js-sidebarListItemDetail'),
                        open = function open($item) {
                        $detailBlocks.stop().slideUp(400);
                        $item.addClass('open');
                        $item.find('.js-sidebarListItemDetail').stop().slideDown(400);
                    },
                        close = function close($item) {
                        $items.removeClass('open');
                        $item.find('.js-sidebarListItemDetail').stop().slideUp(400);
                    };
                
                    if (app.device.isMobile) {
                        $items.on('click', function () {
                            var $item = $(this);
                
                            if ($item.hasClass('open')) {
                                close($item);
                            } else {
                                open($item);
                            }
                        });
                    } else {
                        $items.on('mouseenter', function () {
                            open($(this));
                        });
                
                        $items.on('mouseleave', function () {
                            close($(this));
                        });
                    }
                }
                request.done(data => {
                    data.sort(function(a, b){
                        return new Date(a.departureDate) - new Date(b.departureDate);
                    })
                    data.forEach(result => {
                        var date = new Date(result.departureDate);
                        var day = date.toString().split(" ")[1] + " " + date.toString().split(" ")[2];

                        $featuredList.append(`
                        <div class="mapBlock__list-item js-sidebarListItem">
                            <div class="mapBlock__list-item-inner">
                                <ul class="mapBlock__list-item-row">
                                    <li class="mapBlock__list-item-cell"><span class="mapBlock__list-item-title">Available:&ensp;</span><span class="mapBlock__list-item-value">${day}</span>
                                    </li>
                                    <li class="mapBlock__list-item-cell"><span class="mapBlock__list-item-title">Aircraft:&ensp;</span><span class="mapBlock__list-item-value">${result.aircraftModel}</span>
                                    </li>
                                </ul>
                                <ul class="mapBlock__list-item-row">
                                    <li class="mapBlock__list-item-cell mapBlock__list-item-cell--from"><span class="mapBlock__list-item-title">${result.departure.split(",")[0]}&ensp;</span><span class="mapBlock__list-item-value"></span>
                                        <span class="mapBlock__list-item-arrow">
                                            <svg class="icon__long-left-arrow" width="12px" height="12px">
                                                <use xlink:href="#long-left-arrow"></use>
                                            </svg>
                                        </span>
                                    </li>
                                    <li class="mapBlock__list-item-cell mapBlock__list-item-cell--to"><span class="mapBlock__list-item-title">${result.arrival.split(",")[0]}&ensp;</span><span class="mapBlock__list-item-value"></span>
                                    </li>
                                </ul>
                                <ul class="mapBlock__list-item-row">
                                    <li class="mapBlock__list-item-cell"><span class="mapBlock__list-item-title">Passengers:&ensp;</span><span class="mapBlock__list-item-value">${result.pax}/${result.aircraftPax}</span>
                                    </li>
                                    <li class="mapBlock__list-item-cell mapBlock__list-item-cell--price"><span class="mapBlock__list-item-title">Per Seat:&ensp;</span><span class="mapBlock__list-item-value">$${result.totalPrice}</span>
                                    </li>
                                </ul>
                            </div>
                            <div class="mapBlock__list-item-back js-sidebarListItemDetail">
                                <div class="mapBlock__list-item-button-wr"><a class="mapBlock__list-item-button js-popup" id="featuredBookBtn" href="${'#comingSoonFFPopup'}">Book</a></div>
                                <div class="mapBlock__list-item-info">
                                    <div class="mapBlock__list-item-info-left">
                                        <ul class="mapBlock__list-item-info-list">
                                            <li class="mapBlock__list-item-info-list-item"><span class="mapBlock__list-item-info-list-title">category:&ensp;</span><span class="mapBlock__list-item-info-list-value">${result.aircraftType}</span>
                                            </li>
                                            <li class="mapBlock__list-item-info-list-item"><span class="mapBlock__list-item-info-list-title">speed:&ensp;</span><span class="mapBlock__list-item-info-list-value">${result.aircraftSpeed} M/H</span>
                                            </li>
                                            <li class="mapBlock__list-item-info-list-item"><span class="mapBlock__list-item-info-list-title">range:&ensp;</span><span class="mapBlock__list-item-info-list-value">${result.aircraftRange} M</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <div class="mapBlock__list-item-info-right" style="background-image:url(${result.defaultImageUrl})"></div>
                                </div>
                            </div>
                        </div>`);
                        
                        //Darwin - below uses bindFeaturedFlightResult function - mirroring search process. commented to show popup instead (link href above)
                    //     $featuredList.find('.js-sidebarListItem:last-child #featuredBookBtn').click(() => {
                    //         // line 1226 sets top form data. use current result's data
                    //         bindFeaturedFlightResult(result)});
                        sidebarResultsHover();
                        
                     })
                
                    if (data.length == 0 )
                    {
                        $featuredList.append("<div>Sorry, no featured flights at the moment!</div> <div>Check back soon!</div>")
                    }
                    customScrollInit();
                });
                

                //set initial direction
                $form.find("#direction").val(bookingDirection.oneway);

                //set initial booking type

                changeRoundTrip($form);

                $form.find(".form__radio.js-changeWay").change(function () {
                    if ($(this).val() == "one-way") {
                        $form.find("#direction").val(bookingDirection.oneway);
                    }
                    else {
                        $form.find("#direction").val(bookingDirection.roundtrip);
                    }
                });

                var filterLocations = 126;

                var locations = new Bloodhound({
                    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    remote: {
                        url: apiBaseUrl + 'locations/search/tree/' + filterLocations + '/true/%QUERY',
                        wildcard: '%QUERY'
                    }
                });

                $departure.typeahead(null, {
                    name: 'departureLocations',
                    display: 'name',
                    source: locations,
                    minLength: 2,
                    limit: 10
                }).bind("typeahead:selected", function (obj, datum, name) {
                    if (sourcePosition != null) {
                        source.setMap(null);
                    }

                    sourcePosition = { lat: datum.lat, lng: datum.lng };

                    $form.find("#departureId").val(datum.id);
                    departureName = datum.name;

                    var infowindow = new google.maps.InfoWindow({
                        content: '<div style="background-color:white; color: black;">' + datum.name + '</div>'
                    });

                    var markerIcon = {
                        url: '/img/assets/blue-map-marker.png',
                        scaledSize: new google.maps.Size(30, 49)
                    };

                    source = new google.maps.Marker({
                        position: sourcePosition,
                        // map: map,
                        title: datum.name,
                        //icon: markerIcon,
                        zIndex: 99999999
                    });

                    // infowindow.open(map, source);

                    bounds.extend(sourcePosition);

                    if (destinationPosition != null) {
                        if (flightPath != null) {
                            flightPath.setMap(null);
                        }

                        drawFlightPath(sourcePosition, destinationPosition);
                    }
                });

                $arrival.typeahead(null, {
                    name: 'arrivalLocations',
                    display: 'name',
                    source: locations,
                    minLength: 2,
                    limit: 10
                }).bind("typeahead:selected", function (obj, datum, name) {
                    if (destinationPosition != null) {
                        destination.setMap(null);
                    }

                    destinationPosition = { lat: parseFloat(datum.lat), lng: parseFloat(datum.lng) };

                    $form.find("#arrivalId").val(datum.id);
                    arrivalName = datum.name;

                    var markerIcon = {
                        url: '/img/assets/orange-map-marker.png',
                        scaledSize: new google.maps.Size(30, 49)
                    };

                    var infowindow = new google.maps.InfoWindow({
                        content: '<div style="background-color:white; color: black;">' + datum.name + '</div>'
                    });

                    destination = new google.maps.Marker({
                        position: destinationPosition,
                        // map: map,
                        title: datum.name,
                        //icon: markerIcon,
                        zIndex: 99999999
                    });

                    // infowindow.open(map, destination);

                    bounds.extend(destinationPosition);

                    if (sourcePosition != null) {
                        if (flightPath != null) {
                            flightPath.setMap(null);
                        }

                        drawFlightPath(sourcePosition, destinationPosition);
                    }
                });

                $departure.blur(function () {
                    if ($(this).val() == "") {
                        sourcePosition = null;

                        if (flightPath != null) {
                            flightPath.setMap(null);
                        }

                        if (source != null) {
                            source.setMap(null);
                        }

                        $form.find("#departureId").val("");
                    }
                });

                $arrival.blur(function () {
                    if ($(this).val() == "") {
                        destinationPosition = null;

                        if (flightPath != null) {
                            flightPath.setMap(null);
                        }

                        if (destination != null) {
                            destination.setMap(null);
                        }

                        $form.find("#arrivalId").val("");
                    }
                });

                $nearLocations.each(function () {
                    $(this).change(function () {
                        if ($(this).is(':checked')) {
                          const KILOMETER_CONVERSION = 2.2;
                          const RADIUS_MILES = 50;
                          const RADIUS_KILOMETERS = KILOMETER_CONVERSION * RADIUS_MILES;

                            getNearLocations($(this).data('loctype'), parseInt(RADIUS_KILOMETERS));
                        }
                    });
                });

              $form.find("#searchFlightsBtn").click(function () {
                _this.searchFlights($form, $("#flightsSearchExtraFilters"));
                var departureId = $form.find("#departureId").val(),
                  calendarDates = $form.find("input[name=date]").val().split("-")
                  departureName = $form.find("#departure").val(),
                  arrivalId = $form.find("#arrivalId").val(),
                  arrivalName = $form.find("#arrival").val(),
                  departureDate = calendarDates[0],
                  returnDate = calendarDates[1] || null,
                  pax = $form.find("#passengersNum").val(),
                  direction = $form.find("#direction").val()
                  const request = $.ajax({
                    url: `${apiBaseUrl}history/create`,
                    method: "POST",
                    data: JSON.stringify({
                      departureId: parseInt(departureId),
                      arrivalId: parseInt(arrivalId),
                      departureDate: calendarDates[0],
                      arrivalDate: calendarDates[1] || null,
                      passengers: parseInt(pax),
                      bookingType:parseInt($($form.find("input[name=bookingType]")).val())
                    }),
                    crossDomain: true,
                    contentType: "application/json",
                    xhrFields: {
                      withCredentials: true
                    }
                  })

                  request.done(data => data)

                  request.fail(err => err)
                });

                $container.html($searchFlightsTemplate);

                $("#noFlightsFoundPopup").find("#requestFlightBtn").click(function () {
                    showFlightRequestForm($form, $("#flightsSearchExtraFilters"));
                });

                //map
                if ($("#googleMap").length != 0) {
                    initMap('googleMap');
                }
              inputMaskInit();
              numberOnlyInit();
              counterInit();
              checkboxChange();
              customSelectInit();
              radioChange();
              searchForm();
              submitForm();
            };
                
          if (_this.searchFlightsTemplate == null || _this.searchFlightsResultsTemplate == null) {
            $.get("/templates/flyer/searchFlights.html?_=" + new Date().getTime(), function (template) {
              _this.searchFlightsTemplate = $($.parseHTML(template));
              $.get("/templates/flyer/searchFlightsResults.html?_=" + new Date().getTime(), function (template1) {
                $.get("/templates/flyer/searchFlightsResultsItem.html?_=" + new Date().getTime(), function (template2) {
                _this.searchFlightsResultsTemplate = $($.parseHTML(template1));
                _this.searchFlightsResultsItemTemplate = $($.parseHTML(template2));
              setView();
                });
            })
            })
        }
            else {
                setView();
            }
        }
    

    this.searchFlights = function ($form, $extraFilters) {
        var _this = this;
        let calendarDates = $("input[name=date]").val().split(" - ");

        $form.addClass('loading');
        $form.find('input, button, textarea, select').attr('disabled', 'disabled');

        var $searchFlightsResultsBlock;

        var getFlightsData = function (bookingType = null) {
            var departureId = $form.find("#departureId").val(),
                departureName = $form.find("#departure").val(),
                arrivalId = $form.find("#arrivalId").val(),
                arrivalName = $form.find("#arrival").val(),
                departureDate = calendarDates[0],
                returnDate = calendarDates[1] || null,
                pax = $form.find("#passengersNum").val(),
                direction = $form.find("#direction").val(),
                selectedBookingTypes = 0,
                buildSearchHeder = false;

            if (bookingType == null) {
                bookingType = parseInt($($form.find("input[name=bookingType]")).val());
                buildSearchHeder = true;
            }

            $form.find("input[name=bookingType]").each(function () {
                if ($(this).is(":checked")) {
                    selectedBookingTypes += parseInt($(this).val());
                }
            });

            //reset search results
            searchResultsCache = {
                charterAircrafts: [],
                charterFlights: [],
                charterAircraftSeats: [],
                charterFlightSeats: [],
                commercialFlights: []
            };

            if (bookingType == bookingTypes.charterAircraft ||
                bookingType == bookingTypes.charterAircraftSeat) {
                apiUrl = 'bookings/searchCharterAircrafts';
            }
            else if (bookingType == bookingTypes.charterFlight ||
                bookingType == bookingTypes.charterFlightSeat) {
                apiUrl = 'bookings/searchCharterFlights';
            }
            else {
                return;
            }

            var filters = {
                departureId: departureId,
                departureName: departureName,
                arrivalId: arrivalId,
                arrivalName: arrivalName,
                departureDate: calendarDates[0],
                returnDate: calendarDates[1] || null,
                pax: pax,
                bookingType: bookingType,
                direction: direction,
                selectedBookingTypes: selectedBookingTypes
            };


            var onSuccess = function (searchResultsData, textStatus, xhr) {
                if (xhr.status == 200) {
                    $form.removeClass('loading');
                    $form.find('input, button, textarea, select').removeAttr('disabled');
                  bindSearchResults(buildSearchHeder, filters, searchResultsData)
                }

            };

            var onFail = function (jqXHR, textStatus) {
                $form.removeClass('loading');
                $form.find('input, button, textarea, select').removeAttr('disabled');

                console.log(jqXHR);
                console.log(textStatus);

                alert('ops!! call failed :(');
            };

            execAjaxCall(apiUrl, "POST", filters, onSuccess, onFail);
        };

        var bindSearchResults = function (buildSearchHeder, filters, searchResultsData) {
            if (buildSearchHeder) {
                $searchFlightsResultsBlock = $("<div></div>").append(_this.searchFlightsResultsTemplate.clone());

                $searchFlightsResultsBlock.find("#departureName").text(filters.departureName);
                $searchFlightsResultsBlock.find("#arrivalName").text(filters.arrivalName);
                $searchFlightsResultsBlock.find("#directionText").text(filters.direction == bookingDirection.oneway ? "One-way" : "Round-trip");
                $searchFlightsResultsBlock.find("#pax").text(filters.pax);
                $searchFlightsResultsBlock.find("#depRetDates").text(filters.direction == bookingDirection.oneway ?
                    dateToString(filters.departureDate) : dateToString(filters.departureDate) + ' - ' + dateToString(filters.returnDate));

                var bookingTypesText = new Array();

                if ((filters.selectedBookingTypes & bookingTypes.charterAircraft) == bookingTypes.charterAircraft) {
                    bookingTypesText.push("Charter Aircraft");
                }

                if ((filters.selectedBookingTypes & bookingTypes.charterAircraftSeat) == bookingTypes.charterAircraftSeat) {
                    bookingTypesText.push("Charter Seat");
                }

                if ((filters.selectedBookingTypes & bookingTypes.commercialSeat) == bookingTypes.commercialSeat) {
                    bookingTypesText.push("Commercial Seat");
                }

                $searchFlightsResultsBlock.find("#bookingTypes").text(bookingTypesText.join(", "));

                $("#searchFlightsBlock").hide();
                $container.append($searchFlightsResultsBlock.html());

                $searchFlightsResultsBlock = $container.find("#searchFlightsResultsBlock");

                $(".mapBlock__tab-nav-item").removeClass("active");
                $(".mapBlock__tab-nav-item").addClass("hide");
                $(".mapBlock__tab-content-item").removeClass("active").css('display', 'none');


                var activeTabSelected = false;

                if ((filters.selectedBookingTypes & bookingTypes.charterAircraft) == bookingTypes.charterAircraft) {
                    $(".mapBlock__tab-nav-item[data-id=charterAircraft]").removeClass("hide");
                    $(".mapBlock__tab-nav-item[data-id=charterFlights]").removeClass("hide");

                    if (filters.bookingType == null || filters.bookingType == bookingTypes.charterAircraft) {
                        $(".mapBlock__tab-nav-item[data-id=charterAircraft]").addClass("active");
                        $(".mapBlock__tab-content-item[data-id=charterAircraft]").addClass("active").css('display', 'block');

                        activeTabSelected = true;
                    }
                }

                if ((filters.selectedBookingTypes & bookingTypes.charterAircraftSeat) == bookingTypes.charterAircraftSeat) {
                    $(".mapBlock__tab-nav-item[data-id=charterAircraftSeats]").removeClass("hide");
                    $(".mapBlock__tab-nav-item[data-id=charterFlightSeats]").removeClass("hide");

                    if (activeTabSelected == false && (filters.bookingType == null || filters.bookingType == bookingTypes.charterAircraftSeat)) {
                        $(".mapBlock__tab-nav-item[data-id=charterAircraftSeats]").addClass("active");
                        $(".mapBlock__tab-content-item[data-id=charterAircraftSeats]").addClass("active").css('display', 'block');

                        activeTabSelected = true;
                    }
                }

                if ((filters.selectedBookingTypes & bookingTypes.commercialSeat) == bookingTypes.commercialSeat) {
                    $(".mapBlock__tab-nav-item[data-id=commercialSeats]").removeClass("hide");

                    if (activeTabSelected == false && (filters.bookingType == null || filters.bookingType == bookingTypes.commercialSeat)) {
                        $(".mapBlock__tab-nav-item[data-id=commercialSeats]").addClass("active");
                        $(".mapBlock__tab-content-item[data-id=commercialSeats]").addClass("active").css('display', 'block');

                        activeTabSelected = true;
                    }

                }

                if (filters.bookingType == bookingTypes.charterFlight) {
                    $(".mapBlock__tab-nav-item[data-id=charterFlights]").removeClass("hide").addClass("active");
                    $(".mapBlock__tab-content-item[data-id=charterFlights]").addClass("active").css('display', 'block');

                    activeTabSelected = true;
                }

                if (filters.bookingType == bookingTypes.charterFlightSeat) {
                    $(".mapBlock__tab-nav-item[data-id=charterFlightSeats]").removeClass("hide").addClass("active");
                    $(".mapBlock__tab-content-item[data-id=charterFlightSeats]").addClass("active").css('display', 'block');

                    activeTabSelected = true;
                }

              $("#manual-request").click(function() {
                var showForm = function () {
                  var template = $($.parseHTML("<div>" + templates.flightRequestForm + "</div>"));


                  if($container.find("#flightRequestFormBlock").length == 1){
                    $container.find("#flightRequestFormBlock").remove();
                  }

                  $("#searchFlightsResultsBlock").hide();
                  $container.append(template.html());

                  var $flightRequestForm = $container.find("#flightRequestForm");

                  changeRoundTrip($flightRequestForm);

                  $flightRequestForm.find("#direction").val(filters.direction);

                  $flightRequestForm.find(".form__radio.js-changeWay").change(function () {
                    if ($(this).val() == "one-way") {
                      $flightRequestForm.find("#direction").val(bookingDirection.oneway);
                    }
                    else {
                      $flightRequestForm.find("#direction").val(bookingDirection.roundtrip);
                    }
                  });

                  if ((filters.bookingType & bookingTypes.charterAircraft) == bookingTypes.charterAircraft) {
                    $flightRequestForm.find("#bookingTypeCA").trigger("click");
                  }

                  if ((filters.bookingType & bookingTypes.charterAircraftSeat) == bookingTypes.charterAircraftSeat) {
                    $flightRequestForm.find("#bookingTypeCS").trigger("click");
                  }

                  if ((filters.bookingType & bookingTypes.commercialSeat) == bookingTypes.commercialSeat) {
                    $flightRequestForm.find("#bookingTypeCom").trigger("click");
                  }

                  var $departure = $flightRequestForm.find("#departure");
                  var $arrival = $flightRequestForm.find("#arrival");


                  var locations = new Bloodhound({
                    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    remote: {
                      url: apiBaseUrl + 'locations/search/tree/2/true/%QUERY',
                      wildcard: '%QUERY'
                    }
                  });

                  $departure.typeahead(null, {
                    name: 'departureLocations',
                    display: 'name',
                    source: locations,
                    minLength: 3
                  }).bind("typeahead:selected", function (obj, datum, name) {
                    $flightRequestForm.find("#departureId").val(datum.id);
                  });

                  $arrival.typeahead(null, {
                    name: 'arrivalLocations',
                    display: 'name',
                    source: locations,
                    minLength: 3
                  }).bind("typeahead:selected", function (obj, datum, name) {
                    $flightRequestForm.find("#arrivalId").val(datum.id);
                  });

                  $departure.blur(function () {
                    if ($(this).val() == "") {
                      $departure.val("");
                    }
                  });

                  $arrival.blur(function () {
                    if ($(this).val() == "") {
                      $arrival.val("");
                    }
                  });

                  $(".editSearch").click(function () {
                    $("#searchFlightsBlock").show();
                    $("#flightRequestFormBlock").remove();
                  });

                  $flightRequestForm.find("#createFlightRequestBtn").click(function () {
                    let tempBookingType = 0
                    let tempMeasure = 0
                    $flightRequestForm.find("input[name=booking]").each((i, el)=> {
                      if($(el).closest(".form__label--checkbox").hasClass("checked")) {
                      tempBookingType += 1
                      tempMeasure += parseInt($(el).attr('data-val'))
                      }

                      if (tempBookingType == 1) {
                        switch (tempMeasure) {
                          case 1:
                            filters.bookingType = bookingTypes.charterAircraft
                            break
                          case 2:
                            filters.bookingType = bookingTypes.charterAircraftSeat
                            break
                          case 3:
                            filters.bookingType = bookingTypes.commercialSeat
                            break;
                          default:
                            break
                        }
                      }

                      if (tempBookingType == 2) {
                        switch (tempMeasure) {
                          case 3:
                            filters.bookingType = bookingTypes.charterAircraftOrSeat
                            break;
                          case 4:
                            filters.bookingType = bookingTypes.charterAircraftsOrComm 
                            break;
                          case 5:
                            filters.bookingType = bookingTypes.charterSeatOrComm
                            break
                          default:
                            break
                        }
                      }
                      if (tempBookingType == 3) {
                        filters.bookingType = bookingTypes.any
                      }
                    })
                    createFlightRequest($flightRequestForm, filters.bookingType);
                  });

                  $("#flightRequestFormBlock").find("#flightRequestCreatedBtn").click(function () {
                    $("#searchFlightsBlock").show();
                    $("#flightRequestFormBlock").remove();
                  });
                  radioChange();
                  checkboxChange();
                  counterInit();
                };

                if (templates.flightRequestForm == null) {
                  $.get("/templates/flightRequestForm.html?_=" + new Date().getTime(), function (template) {
                    templates.flightRequestForm = template;

                    showForm();
                  });
                }
                else {
                  showForm();
                }

              })
              //prepare tabs
                tabsInit();

                $(".mapBlock__tab-nav-item").click(function () {
                    var filterBy = $(this).data("id");

                    switch (filterBy) {
                        case "charterAircraft":
                            getFlightsData(bookingTypes.charterAircraft);
                            break;
                        case "charterFlights":
                            getFlightsData(bookingTypes.charterFlight);
                            break;
                        case "charterAircraftSeats":
                            getFlightsData(bookingTypes.charterAircraftSeat);
                            break;
                        case "charterFlightSeats":
                            getFlightsData(bookingTypes.charterFlightSeat);
                            break;
                        case "commercialSeats":
                            getFlightsData(bookingTypes.commercialSeat);
                            break;
                        default:
                            break;
                    };
                });
            }

            //bind search results for current tab
            if (searchResultsData.length == 0) {
                var $dialog = $("#noFlightsFoundPopup");

                var title, bookingTypeFilter;

                switch (filters.bookingType) {
                    case (bookingTypes.charterAircraft):
                        title = "No Charter Aircraft Found";
                        bookingTypeFilter = "charter aircraft";
                        break;
                    case (bookingTypes.charterFlight):
                        title = "No Charter Flight Found";
                        bookingTypeFilter = "charter flight";
                        break;
                    case (bookingTypes.charterAircraftSeat):
                        title = "No Charter Aircraft Seat Found";
                        bookingTypeFilter = "charter aircraft seat";
                        break;
                    case (bookingTypes.charterFlightSeat):
                        title = "No Charter Flight Seat Found";
                        bookingTypeFilter = "charter flight seat";
                        break;
                    case (bookingTypes.commercialSeat):
                        title = "No Commercial Seat Found";
                        bookingTypeFilter = "commercial seat";
                        break;
                    default:
                        break;
                };

                $dialog.find(".thanksPopup__title").text(title);
                var $dialogText = $dialog.find(".thanksPopup__text");

                $dialogText.text($dialogText.text().replace("{bookingTypeFilter}", bookingTypeFilter));

                app.utils.responseForm('#noFlightsFoundPopup');
            }
            else {
                var $activeTab = $searchFlightsResultsBlock.find(".mapBlock__tab-nav-item.active");
                var $activeTabContentItem = $searchFlightsResultsBlock.find(".mapBlock__tab-content-item[data-id=" + $activeTab.data('id') + "]");

                $activeTabContentItem.html('<div class="mapBlock__tab-content-inner"><div class= "mapBlock__results-list js-customScroll"></div></div>');

                var $resultsList = $activeTabContentItem.find(".mapBlock__results-list");

                $.each(searchResultsData, function () {
                    switch ($activeTab.data("id")) {
                        case "charterAircraft":
                            searchResultsCache.charterAircrafts.push(this);
                            break;
                        case "charterFlights":
                            searchResultsCache.charterFlights.push(this);
                            break;
                        case "charterAircraftSeats":
                            searchResultsCache.charterAircraftSeats.push(this);
                            break;
                        case "charterFlightSeats":
                            searchResultsCache.charterFlightSeats.push(this);
                            break;
                        case "commercialSeats":
                            searchResultsCache.commercialFlights.push(this);
                            break;
                        default:
                            break;
                    };

                    var $item = _this.searchFlightsResultsItemTemplate.clone();
                  //find a way to list possible possible arrival/departures

                    $item.find(".aircraftImageUrl").css("background-image", "url('" + this.defaultImageUrl + "')");
                    $item.find(".departureName").text(this.departure);
                    $item.find(".arrivalName").text(this.arrival);
                    $item.find(".aircraftModel").text(this.aircraftModel);
                    $item.find(".aircraftType").text(this.aircraftType);
                    $item.find(".safetyRating").text(this.aircraftArgusSafetyRating);
                    $item.find(".aircraftPax").text(this.aircraftPax);

                    this.bookableDemo ? $item.find(".bookableDemo").show() : $item.find(".bookableDemo").hide();

                    if (this.flightDurationHours != 0 && this.flightDurationMinutes != 0) {
                        $item.find(".estimatedTripTime").text(this.flightDurationHours + 'H ' + this.flightDurationMinutes + 'MIN');
                    }
                    else if (this.flightDurationHours != 0) {
                        $item.find(".estimatedTripTime").text(this.flightDurationHours + 'H');
                    }
                    else {
                        $item.find(".estimatedTripTime").text(this.flightDurationMinutes + 'MIN');
                    }

                    $item.find(".totalPrice").text("$" + formatMoney(this.exclusiveTotalPrice));
                    $item.find(".aircraftSpeed").text(this.aircraftSpeed);
                    $item.find(".aircraftRange").text(this.aircraftRange + " NM");
                    $item.find(".hasWifi").text(this.wiFi ? "Yes" : "No");
                    $item.find(".teleNum").text(this.numberOfTelevision == null ? 0 : this.numberOfTelevision);

                    $item.find(".bookBtn").data("id", this.aircraftAvailabilityId);

                    if ($activeTab.data("id") == "charterAircraft" || $activeTab.data("id") == "charterFlights") {
                        $item.find(".bookBtn").html('<span class="text">Book</span>');
                    }
                    else if ($activeTab.data("id") == "charterAircraftSeats" || $activeTab.data("id") == "charterFlightSeats") {
                        $item.find(".bookBtn").html('<span class="text">Reserve</span>');
                    }
                    else {

                    }

                    $resultsList.append($item);
                });

                sidebarResultsHover();

              $activeTabContentItem.find(".bookBtn").click(function () {

                switch ($activeTab.data("id")) {
                    case "charterAircraft":
                        var selectedBooking;
                        var aircraftAvailabilityId = $(this).data("id");
                    //console.log(departuresInFiftyMiles, arrivalsInFiftyMiles)

                        $.each(searchResultsCache.charterAircrafts, function () {
                            if (this.aircraftAvailabilityId == aircraftAvailabilityId) {
                                selectedBooking = this;
                                return false;
                            }
                        });

                        _this.startBooking(selectedBooking.direction, selectedBooking.bookingType,
                            selectedBooking.departure, selectedBooking.departureId, selectedBooking.departureDate,
                            selectedBooking.arrival, selectedBooking.arrivalId, selectedBooking.returnDate, selectedBooking.pax,
                            selectedBooking.aircraftId, selectedBooking.aircraftAvailabilityId, selectedBooking.totalPrice,
                            selectedBooking.exclusiveTotalPrice, selectedBooking.totalFees, selectedBooking.totalTaxes);
                        break;
                    case "charterFlights":
                        var selectedBooking;
                        $.each(searchResultsCache.charterFlights, function () {
                            if (this.aircraftAvailabilityId == aircraftAvailabilityId) {
                                selectedBooking = this;
                                return false;
                            }
                        });
                        _this.startBooking(selectedBooking.direction, selectedBooking.bookingType,
                            selectedBooking.departure, selectedBooking.departureId, selectedBooking.departureDate,
                            selectedBooking.arrival, selectedBooking.arrivalId, selectedBooking.returnDate, selectedBooking.pax,
                            selectedBooking.aircraftId, selectedBooking.aircraftAvailabilityId, selectedBooking.totalPrice,
                            selectedBooking.exclusiveTotalPrice, selectedBooking.totalFees, selectedBooking.totalTaxes);
                        break;
                    case "charterAircraftSeats":
                        var selectedBooking;
                        var aircraftAvailabilityId = $(this).data("id");

                        $.each(searchResultsCache.charterAircraftSeats, function () {
                            if (this.aircraftAvailabilityId == aircraftAvailabilityId) {
                                selectedBooking = this;
                                return false;
                            }
                        });
                        _this.startBooking(selectedBooking.direction, selectedBooking.bookingType,
                            selectedBooking.departure, selectedBooking.departureId, selectedBooking.departureDate,
                            selectedBooking.arrival, selectedBooking.arrivalId, selectedBooking.returnDate, selectedBooking.pax,
                            selectedBooking.aircraftId, selectedBooking.aircraftAvailabilityId, selectedBooking.totalPrice,
                            selectedBooking.exclusiveTotalPrice, selectedBooking.totalFees, selectedBooking.totalTaxes);

                        break;
                    case "charterFlightSeats":
                        var selectedBooking;
                        $.each(searchResultsCache.charterFlightSeats, function () {
                            if (this.aircraftAvailabilityId == aircraftAvailabilityId) {
                                selectedBooking = this;
                                return false;
                            }
                        });
                        _this.startBooking(selectedBooking.direction, selectedBooking.bookingType,
                            selectedBooking.departure, selectedBooking.departureId, selectedBooking.departureDate,
                            selectedBooking.arrival, selectedBooking.arrivalId, selectedBooking.returnDate, selectedBooking.pax,
                            selectedBooking.aircraftId, selectedBooking.emptyLegId, selectedBooking.totalPrice,
                            selectedBooking.exclusiveTotalPrice, selectedBooking.totalFees, selectedBooking.totalTaxes);
                        break;
                    case "commercialSeats":
                        break;
                    default:
                        break;
                };

                var createBookingSuccess = function (returnedData, textStatus, xhr) {
                  currentBooking = returnedData.bookingNo;
                };

                var createBookingFailure = function (jqXHR, textStatus) {
                  console.log(jqXHR);
                  console.log(textStatus);

                  alert('ops!! call failed :(');
                };
                const bookingPax = parseInt($("#pax").html());

                const { direction, bookingType, departureId, arrivalId, departureDate, returnDate, aircraftAvailabilityId: airplaneId, emptyLegId, pax } = selectedBooking
                const info = {
                  direction,
                  bookingType,
                  departureId,
                  arrivalId,
                  departureDate,
                  returnDate,
                  aircraftAvailabilityId: airplaneId || emptyLegId,
                  paymentMethodId: null,
                  pax,
                  travelers: [],
                  bookingPax, 
                }
                    execAjaxCall("bookings/create", "POST", info, createBookingSuccess, createBookingFailure);
              });

                customScrollInit();
            }

            $(".editSearch").click(function () {
                $("#searchFlightsBlock").show();
                $("#searchFlightsResultsBlock").remove();
            });
        };

        if (templates.searchFlightsResults == null || templates.searchFlightsResultsTemplate == null) {
            $.get("/templates/flyer/searchFlightsResults.html?_=" + new Date().getTime(), function (template1) {
                $.get("/templates/flyer/searchFlightsResultsItem.html?_=" + new Date().getTime(), function (template2) {
                    _this.searchFlightsResultsTemplate = $($.parseHTML(template1));
                    _this.searchFlightsResultsItemTemplate = $($.parseHTML(template2));

                    getFlightsData();
                });
            });
        }
        else {
            getFlightsData();
        }
    };

    var bookingData, bookingFlightsData,
        aircraftData, bookingCostData,
        bookingPaymentMethods;
    var travelers = [];

    this.startBooking = function (direction, bookingType, departure, departureId, departureDate,
        arrival, arrivalId, returnDate, pax, aircraftId, aircraftAvailabilityId, totalPrice, exclusiveTotalPrice,
        totalFees, totalTaxes) {

        var outboundFlight, inboundFlight;

        bookingData = {
            bookingId: null,
            direction: direction,
            bookingType: bookingType,
            departureId: departureId,
            arrivalId: arrivalId,
            departureDate: departureDate,
            returnDate: returnDate,
            passengersNum: pax,
            aircraftAvailabilityId: aircraftAvailabilityId
        };

        bookingCostData = {
            totalCost: totalPrice,
            totalExclusiveCost: exclusiveTotalPrice,
            totalFeesCost: totalFees,
            totalTaxesCost: totalTaxes
        };

        outboundFlight = {
            departure: departure,
            departureId: departureId,
            departureDate: departureDate,
            arrival: arrival,
            arrivalId: arrivalId,
            aircraftId: aircraftId,
            aircraftAvailabilityId: aircraftAvailabilityId
        };

        inboundFlight = {
            departure: arrival,
            departureId: arrivalId,
            departureDate: returnDate,
            arrival: departure,
            arrivalId: departureId,
            aircraftId: aircraftId,
            aircraftAvailabilityId: aircraftAvailabilityId
        };

        bookingFlightsData = [];
        bookingFlightsData.push(outboundFlight);
        bookingFlightsData.push(inboundFlight);

        buildBookingProcessHeader(bookingData, outboundFlight, returnDate);
        buildBookingProcessFlightTab(bookingData, outboundFlight, inboundFlight);
    };

    this.completeOfflineBooking = function () {
        var getBookingSuccess = function (returnedData, textStatus, xhr) {
            bookingData = returnedData;

            execAjaxCall("bookings/" + completeBookingForBookingId + "/flights", "GET", null,
                getBookingFlightsSuccess, getBookingFlightsFailure);
        };

        var getBookingFailure = function (jqXHR, textStatus) {
            console.log(jqXHR);
            console.log(textStatus);

            alert('ops!! call failed :(');
        };

        execAjaxCall("bookings/" + completeBookingForBookingId, "GET", null, getBookingSuccess, getBookingFailure);
    };

    var getBookingFlightsSuccess = function (returnedData, textStatus, xhr) {
        bookingFlightsData = returnedData;

        var outboundFlight = bookingFlightsData[0];
        var returnDate = null;

        if (bookingFlightsData.bookingType == bookingTypes.roundtrip) {
            var inboundFlight = bookingFlightsData[1];

            returnDate = inboundFlight.departureDate;
        }

        buildBookingProcessHeader(bookingData, outboundFlight, returnDate);
        buildBookingProcessFlightTab(bookingData, outboundFlight, inboundFlight);
    };

    var getBookingFlightsFailure = function (jqXHR, textStatus) {
        console.log(jqXHR);
        console.log(textStatus);

        alert('ops!! call failed :(');
    };

    var getBookingAircraftSuccess = function (returnedData, textStatus, xhr) {
        aircraftData = returnedData;

        buildBookingProcessAircraftTab(aircraftData);
    };

    var getBookingAircraftFailure = function (jqXHR, textStatus) {
        console.log(jqXHR);
        console.log(textStatus);

        alert('ops!! call failed :(');
    };

    var getBookingCostSuccess = function (returnedData, textStatus, xhr) {
        bookingCostData = returnedData;

        execAjaxCall("accounts/paymethods/" + paymentMethodUsedFor.pay, "GET", null, getBookingPaymentMethodsSuccess, getBookingPaymentMethodsFailure);
    };

    var getBookingCostFailure = function (jqXHR, textStatus) {
        console.log(jqXHR);
        console.log(textStatus);

        alert('ops!! call failed :(');
    };

    var getBookingPaymentMethodsSuccess = function (returnedData, textStatus, xhr) {
        bookingPaymentMethods = returnedData;

        if (templates.bookingProcessPaymentMethod == null) {
            $.get("/templates/bookingProcessPaymentMethod.html?_=" + new Date().getTime(), function (template) {
                templates.bookingProcessPaymentMethod = template;

                buildBookingProcessPaymentTab(bookingCostData, bookingPaymentMethods);
            });
        }
        else {
            buildBookingProcessPaymentTab(bookingCostData, bookingPaymentMethods);
        }
    };

    var getBookingPaymentMethodsFailure = function (jqXHR, textStatus) {
        console.log(jqXHR);
        console.log(textStatus);

        alert('ops!! call failed :(');
    };

    var buildBookingProcessHeader = function (booking, outboundFlight, returnDate) {

        var bindBookingHeader = function () {
            var $bookingBlock = $($.parseHTML(templates.bookingProcessContainer)),
                $bookingHeader = $bookingBlock.find(".bookingBlock__header");

            $bookingHeader.find("#departureName").text(outboundFlight.departure);
            $bookingHeader.find("#arrivalName").text(outboundFlight.arrival);
            $bookingHeader.find("#directionText").text(booking.direction == bookingDirection.oneway ? "One-way" : "Round-trip");
            $bookingHeader.find("#deptRetDates").text(dateToString(outboundFlight.departureDate)
                + (booking.direction == bookingDirection.oneway ? "" : " - " + dateToString(returnDate)));
            $bookingHeader.find("#bookingType").text(booking.bookingType == bookingTypes.charterAircraft ? "Charter Aircraft" :
                booking.bookingType == bookingTypes.charterAircraftSeat ? "Charter Seat" : "Commercial Seat");
            $bookingHeader.find("#pax").text(bookingData.passengersNum)

            if (booking.bookingId != null) {
                $bookingBlock.find(".bookingBlock__breadcrumbs").remove();
            }

            $bookingBlock.find(".js-bookingNav-item").click(function () {
                var tab = $(this).data("tab");
                var tabContentId = $(this).data("tabid");
                var loaded = $(this).data("loaded");

                $bookingBlock.find(".js-bookingNav-item.active").removeClass("active");
                $(this).addClass("active");

                if (loaded) {
                    $bookingBlock.find(".bookingBlock__content-inner").children().css("display", "none");
                    $bookingBlock.find("." + tabContentId).css("display", "block");
                    return;
                }

                switch (tab) {
                    case "flights":
                        break;
                    case "aircraft":
                        execAjaxCall("aircrafts/" + outboundFlight.aircraftId, "GET", null, getBookingAircraftSuccess, getBookingAircraftFailure);
                        break;
                    case "travelers":
                        buildBookingProcessTravelersTab();
                        break;
                    case "terms":
                        buildBookingProcessTermsTab();
                        break;
                    case "payment":
                        if (booking.bookingId != null) {
                            execAjaxCall("bookings/" + booking.bookingId + "/payment/calculate", "GET", null, getBookingCostSuccess, getBookingCostFailure);
                        }
                        else {
                            execAjaxCall("accounts/paymethods/" + paymentMethodUsedFor.pay, "GET", null, getBookingPaymentMethodsSuccess, getBookingPaymentMethodsFailure);
                        }

                        break;
                    case "confirmation":
                        buildBookingProcessConfirmationTab();
                        break;
                    default:
                        break;
                }
            });

            $container.html($bookingBlock);
        };

        if (templates.bookingProcessContainer != null) {
            bindBookingHeader();
        }
        else {
            $.get("/templates/bookingProcessContainer.html?_=" + new Date().getTime(), function (template) {
                templates.bookingProcessContainer = template;

                bindBookingHeader();
            });
        }
    };

    var buildBookingProcessFlightTab = function (booking, outboundFlight, inboundFlight) {

        var bindFlightTab = function () {
            var $flightTab = $($.parseHTML(templates.bookingProcessFlightTab));
            var $bookingTabsContainer = $container.find(".bookingBlock__content-inner");

            if (booking.direction == bookingDirection.oneway) {
                $flightTab.find("#requestedInboundDepartureTime").addClass("hide");
            }

            if (booking.bookingId != null) {
                $flightTab.find("#requestedOutboundDepartureTime").remove();
                $flightTab.find("#requestedInboundDepartureTime").remove();
                $flightTab.find(".flightBooking__content-right").css('visibility', 'hidden');
            }

            $flightTab.find("#outboundFlightDeparture").text(outboundFlight.departure);
            $flightTab.find("#outboundFlightArrival").text(outboundFlight.arrival);
            $flightTab.find("#inboundFlightDeparture").text(inboundFlight.departure);
            $flightTab.find("#inboundFlightArrival").text(inboundFlight.arrival);

            $bookingTabsContainer.append($flightTab);

            $container.find(".js-bookingNav-item[data-tab=flights]").data("loaded", true);

            customScrollInit();
            bookingNav();
        };

        if (templates.bookingProcessFlightTab != null) {
            bindFlightTab();
        }
        else {
            $.get("/templates/bookingProcessFlightTab.html?_=" + new Date().getTime(), function (template) {
                templates.bookingProcessFlightTab = template;

                bindFlightTab();
            });
        }

        return;
    };

    var buildBookingProcessAircraftTab = function (aircraft) {

        var bindAircraftTab = function () {
            var $aircraftTab = $($.parseHTML(templates.bookingProcessAircraftTab));
            var $bookingTabsContainer = $container.find(".bookingBlock__content-inner");

            $bookingTabsContainer.children().css("display", "none");

            $aircraftTab.find("#modelName").text(aircraft.modelName);
            $aircraftTab.find("#typeName").text(aircraft.typeName);
            $aircraftTab.find("#homebaseName").text(aircraft.homebaseName);
            $aircraftTab.find("#argusSafetyRating").text(aircraft.argusSafetyRating);
            $aircraftTab.find("#manufactureYear").text(aircraft.manufactureYear);
            $aircraftTab.find("#lastExtRefurbish").text(aircraft.lastExtRefurbish);
            $aircraftTab.find("#lastIntRefurbish").text(aircraft.lastIntRefurbish);
            $aircraftTab.find("#maxPassengers").text(aircraft.maxPassengers);
            $aircraftTab.find("#hoursFlown").text(aircraft.hoursFlown);
            $aircraftTab.find("#range").text(aircraft.range);
            $aircraftTab.find("#speed").text(aircraft.speed);
            $aircraftTab.find("#cargoCapability").text(aircraft.cargoCapability);
            $aircraftTab.find("#wiFi").text(aircraft.wiFi ? "Yes" : "No");
            $aircraftTab.find("#numberOfTelevision").text(aircraft.numberOfTelevision == null ? 0 : aircraft.numberOfTelevision);
            console.log(aircraft)
            var $imageContainer = $aircraftTab.find('#js-swiper-wrapper');
            $imageContainer.empty();
            aircraft.images.length > 0 ? 
            aircraft.images.forEach(image => {
                $imageContainer.append(`<div class="swiper-slide">
                                            <a class="aircraftDetail__slider-main-item" data-fancybox="detailGallery" href="${image.url}" style="background-image:url('${image.url}')">
                                                 <div class="aircraftDetail__slider-main-item-back">
                                                    <span class="aircraftDetail__slider-main-item-icon"><svg width="488.85" height="488.85" viewBox="0 0 488.85 488.85"><defs><linearGradient id="eyeG" x1="244.425" y1="0" x2="244.425" y2="488.85" gradientUnits="userSpaceOnUse"><stop stop-color="#41FB96" /><stop offset="1" stop-color="#12A053" /></linearGradient></defs><path d="M244.425,98.725c-93.4,0-178.1,51.1-240.6,134.1c-5.1,6.8-5.1,16.3,0,23.1c62.5,83.1,147.2,134.2,240.6,134.2s178.1-51.1,240.6-134.1c5.1-6.8,5.1-16.3,0-23.1C422.525,149.825,337.825,98.725,244.425,98.725z M251.125,347.025c-62,3.9-113.2-47.2-109.3-109.3c3.2-51.2,44.7-92.7,95.9-95.9c62-3.9,113.2,47.2,109.3,109.3C343.725,302.225,302.225,343.725,251.125,347.025z M248.025,299.625c-33.4,2.1-61-25.4-58.8-58.8c1.7-27.6,24.1-49.9,51.7-51.7c33.4-2.1,61,25.4,58.8,58.8C297.925,275.625,275.525,297.925,248.025,299.625z" fill="url(#eyeG)" /></svg></span>
                                                </div>
                                            </a>
                                        </div>`);
            })
            : $imageContainer.append(`                             <div class="swiper-slide">
            <a class="aircraftDetail__slider-main-item" data-fancybox="detailGallery" href="/img/assets/aircraftDetail/2.jpg" style="background-image:url('/img/assets/aircraftDetail/1.jpg')">
                <div class="aircraftDetail__slider-main-item-back">
                    <span class="aircraftDetail__slider-main-item-icon"><svg width="488.85" height="488.85" viewBox="0 0 488.85 488.85"><defs><linearGradient id="eyeG" x1="244.425" y1="0" x2="244.425" y2="488.85" gradientUnits="userSpaceOnUse"><stop stop-color="#41FB96" /><stop offset="1" stop-color="#12A053" /></linearGradient></defs><path d="M244.425,98.725c-93.4,0-178.1,51.1-240.6,134.1c-5.1,6.8-5.1,16.3,0,23.1c62.5,83.1,147.2,134.2,240.6,134.2s178.1-51.1,240.6-134.1c5.1-6.8,5.1-16.3,0-23.1C422.525,149.825,337.825,98.725,244.425,98.725z M251.125,347.025c-62,3.9-113.2-47.2-109.3-109.3c3.2-51.2,44.7-92.7,95.9-95.9c62-3.9,113.2,47.2,109.3,109.3C343.725,302.225,302.225,343.725,251.125,347.025z M248.025,299.625c-33.4,2.1-61-25.4-58.8-58.8c1.7-27.6,24.1-49.9,51.7-51.7c33.4-2.1,61,25.4,58.8,58.8C297.925,275.625,275.525,297.925,248.025,299.625z" fill="url(#eyeG)" /></svg></span>
                </div>
            </a>
        </div>`);


            $bookingTabsContainer.append($aircraftTab);

            $container.find(".js-bookingNav-item[data-tab=aircraft]").data("loaded", true);

            customScrollInit();
            bookingNav();
        };

        if (templates.bookingProcessAircraftTab != null) {
            bindAircraftTab();
        }
        else {
            $.get("/templates/bookingProcessAircraftTab.html?_=" + new Date().getTime(), function (template) {
                templates.bookingProcessAircraftTab = template;

                bindAircraftTab();
            });
        }
    };

    var buildBookingProcessTravelersTab = function () {

        var bindTravelersTab = function () {
            var $travelersTab = $($.parseHTML(templates.bookingProcessTravelersTab));

            var $bookingTabsContainer = $container.find(".bookingBlock__content-inner");

            $bookingTabsContainer.children().css("display", "none");

            $travelersTab.find("#addTraveler").click(function () {
                var memberEmail = $container.find("#memberEmail");
                var nonMemberEmail = $container.find("#nonMemberEmail");
                var firstName = $container.find("#nonMemberFirstName");
                var lastName = $container.find("#nonMemberLastName");
                var addFromMembers = true;
                var emailValue = memberEmail.val();

                if (memberEmail.val() == '') {
                    addFromMembers = false;
                    emailValue = nonMemberEmail.val();
                }

                var found = false;

                $.each(travelers, function () {
                    if (this.email == emailValue) {
                        found = true;
                        return false;
                    }
                });

                if (found) {
                    showSuccessMessage('Traveler Exists', 'The traveler you are trying to add is already added.');
                    return;
                }

                var onSuccess = function (returnedData, textStatus, xhr) {
                    if (addFromMembers == true && returnedData == null) {
                        showSuccessMessage('No Member Found', 'No member found with this email.');
                        return;
                    }

                    var $traveler = $($.parseHTML(templates.bookingProcessTraveler));
                    var travelerData;

                    if (returnedData == null) {
                        travelerData = {
                            id: null,
                            firstName: firstName.val(),
                            lastName: lastName.val(),
                            email: nonMemberEmail.val(),
                            isMember: false
                        };

                        travelers.push(travelerData);
                    }
                    else {
                        travelerData = {
                            id: returnedData.id,
                            firstName: returnedData.firstName,
                            lastName: returnedData.lastName,
                            email: returnedData.email,
                            isMember: true
                        };

                        travelers.push(travelerData);
                    }

                    $traveler.find(".travelersBooking__list-item").data(travelerData.email);
                    $traveler.find(".travelersBooking__list-item-name").text(travelerData.firstName + ' ' + travelerData.lastName);
                    $traveler.find(".travelersBooking__list-item-info").text(travelerData.email);

                    $container.find(".travelersBooking__list").append($traveler);

                    memberEmail.val('');
                    nonMemberEmail.val('');
                    firstName.val('');
                    lastName.val('');
                };

                var onFail = function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);

                    alert('ops!! call failed :(');
                };

                execAjaxCall("bookings/travelers/getmember/" + emailValue, "GET", null, onSuccess, onFail);
            });

            $bookingTabsContainer.append($travelersTab);

            $container.find(".js-bookingNav-item[data-tab=travelers]").data("loaded", true);

            customScrollInit();
            bookingNav();
        };

        if (templates.bookingProcessTravelersTab != null) {
            bindTravelersTab();
        }
        else {
            $.get("/templates/bookingProcessTravelersTab.html?_=" + new Date().getTime(), function (bookingProcessTravelersTab) {
                $.get("/templates/bookingProcessTraveler.html?_=" + new Date().getTime(), function (bookingProcessTraveler) {
                    templates.bookingProcessTravelersTab = bookingProcessTravelersTab;
                    templates.bookingProcessTraveler = bookingProcessTraveler;

                    bindTravelersTab();
                });
            });
        }
    };

    var buildBookingProcessTermsTab = function () {

        var bindTermsTab = function () {
            var $termsTab = $($.parseHTML(templates.bookingProcessTermsTab));

            var $bookingTabsContainer = $container.find(".bookingBlock__content-inner");

            $bookingTabsContainer.children().css("display", "none");

            $bookingTabsContainer.append($termsTab);

            $container.find(".js-bookingNav-item[data-tab=terms]").data("loaded", true);

            customScrollInit();
            bookingNav();
            checkboxChange();
        };

        if (templates.bookingProcessTermsTab != null) {
            bindTermsTab();
        }
        else {
            $.get("/templates/bookingProcessTermsTab.html?_=" + new Date().getTime(), function (template) {
                templates.bookingProcessTermsTab = template;

                bindTermsTab();
            });
        }
    };

    var buildBookingProcessPaymentTab = function (bookingCost, bookingPaymentMethods) {

        var bindPaymentTab = function () {
            var $paymentTab = $($.parseHTML(templates.bookingProcessPaymentTab));

            var $bookingTabsContainer = $container.find(".bookingBlock__content-inner");

            $bookingTabsContainer.children().css("display", "none");

            $bookingTabsContainer.append($paymentTab);

            $container.find(".js-bookingNav-item[data-tab=terms]").data("loaded", true);

            customScrollInit();
            bookingNav();
            radioChange();
        };

        if (templates.bookingProcessPaymentTab != null) {
            bindPaymentTab();
        }
        else {
            $.get("/templates/bookingProcessPaymentTab.html?_=" + new Date().getTime(), function (template) {
                templates.bookingProcessPaymentTab = template;

                bindPaymentTab();
            });
        }
    };

    var buildBookingProcessConfirmationTab = function () {

        var confirmBookingSuccess = function (returnedData, textStatus, xhr) {
            showSuccessMessage('Booking Confirmed', 'Your booking has been confirmed successfully. We will be in touch with the aircraft provider to confirm your booking');

            completeBookingForBookingId = null;
            bookingData = null;
            bookingFlightsData = null;
            aircraftData = null;
            bookingCostData = null;
            bookingPaymentMethods = null;
            travelers = null;

            setTimeout(flyerModule.booking.init(), 3000);
        };

        var confirmBookingFailure = function (jqXHR, textStatus) {
            console.log(jqXHR);
            console.log(textStatus);

            alert('ops!! call failed :(');
        };

        var createBookingSuccess = function (returnedData, textStatus, xhr) {
            showSuccessMessage('Booking Created', 'Your booking has been created successfully. We will be in touch with the aircraft provider to confirm your booking');

            completeBookingForBookingId = null;
            bookingData = null;
            bookingFlightsData = null;
            aircraftData = null;
            bookingCostData = null;
            bookingPaymentMethods = null;
            travelers = null;
            currentBooking = null;

            setTimeout(flyerModule.booking.init(), 3000);
        };

        var createBookingFailure = function (jqXHR, textStatus) {
            console.log(jqXHR);
            console.log(textStatus);

            alert('ops!! call failed :(');
        };

        var bindConfirmationTab = function () {
            var $confirmationTab = $($.parseHTML(templates.bookingProcessConfirmationTab));

            var $bookingTabsContainer = $container.find(".bookingBlock__content-inner");

            $bookingTabsContainer.children().css("display", "none");

            //confrim booking
            $confirmationTab.find("#confirmBooking").click(function () {
                if (completeBookingForBookingId != null) {
                    //confirm offline booking
                    var booking = {
                        paymentMethodId: $($bookingTabsContainer.find("input[name=bookingPM]:checked")).val(),
                        travelers: travelers
                    };

                    execAjaxCall("bookings/" + completeBookingForBookingId + "/confirm", "POST", booking, confirmBookingSuccess, confirmBookingFailure);
                }
                else {
                    if ($bookingTabsContainer.find("#acceptTermsForm > .checked").length > 0) {
                        var request = $.ajax({
                          url: `${apiBaseUrl}bookings/edit`,
                          method: "PATCH",
                          data: JSON.stringify({
                            bookingNo: currentBooking,
                            travelers
                          }),
                          crossDomain: true,
                          contentType: "application/json",
                          xhrFields: {
                            withCredentials: true
                          }
                        })
      
                        request.done(createBookingSuccess)
                        
                        request.fail((err) => {
                        console.log('err', err)
                        })
                    } else {
                        //create fancybox to display alert
                       alert("Please accept the terms before confirming!")
                    }
                }
            });

            $bookingTabsContainer.append($confirmationTab);

            $container.find(".js-bookingNav-item[data-tab=terms]").data("loaded", true);

            customScrollInit();
            bookingNav();
        };

        if (templates.bookingProcessConfirmationTab != null) {
            bindConfirmationTab();
        }
        else {
            $.get("/templates/bookingProcessConfirmationTab.html?_=" + new Date().getTime(), function (template) {
                templates.bookingProcessConfirmationTab = template;

                bindConfirmationTab();
            });
        }
    };

    this.initBookingsTab = function () {
        var _this = this;

        var setBookingsView = function () {
            var setView = function (bookingsListTemplate, bookingsListItemTemplate) {
                var $bookingsListTemplate = $($.parseHTML(bookingsListTemplate));

                var $tabContent = $(".dashboardBlock");

                $tabContent.append($bookingsListTemplate);

                bindData($tabContent);
            };

            var bindData = function ($tabContent) {

                var onSuccess = function (returnedData, textStatus, xhr) {
                    if (xhr.status == 200) {

                        var $bookingsListItemTemplate = $($.parseHTML(_this.bookingsListItemTemplate));
                        var $bookingsList = $tabContent.find(".bookingDashboard.bookingDashboard--flyer.bookingDashboard--list .bookingDashboard__table-body");

                        $.each(returnedData, function () {
                            var $booking = $bookingsListItemTemplate.clone();

                            $booking.find(".bookingNumber").text(this.number);
                            $booking.find(".bookingDate").text(dateToString(this.createdOn, "mm/dd/yyyy"));

                            $bookingsList.append($booking);
                        });

                        customScrollInit();
                    }
                };

                var onFail = function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);
                    //confirmed bookings
                    //alert('ops!! call failed :(');
                };

                execAjaxCall("bookings/list", "GET", null, onSuccess, onFail);

            }

            if (_this.bookingsListTemplate == null) {
                $.get("/templates/flyer/bookings.html?_=" + new Date().getTime(), function (bookingsListTemplate) {
                    $.get("/templates/flyer/bookingsListItem.html?_=" + new Date().getTime(), function (bookingsListItemTemplate) {
                        _this.bookingsListTemplate = bookingsListTemplate;
                        _this.bookingsListItemTemplate = bookingsListItemTemplate;

                        setView(bookingsListTemplate, bookingsListItemTemplate);
                    });
                });
            }
            else {
                setView(_this.bookingsListTemplate, _this.bookingsListItemTemplate);
            }
        }

        flyerModule.dashboard.initContainer(setBookingsView, "bookings");
    };

    this.initFlightsTab = function () {
        var _this = this;

        var setBookingsView = function () {
            var setView = function (bookingsListTemplate, bookingsListItemTemplate) {
                var $bookingsListTemplate = $($.parseHTML(bookingsListTemplate));

                var $tabContent = $(".dashboardBlock");

                $tabContent.append($bookingsListTemplate);

                bindData($tabContent);
            };

            var bindData = function ($tabContent) {

                var onSuccess = function (returnedData, textStatus, xhr) {
                    if (xhr.status == 200) {

                        var $bookingsListItemTemplate = $($.parseHTML(_this.bookingsListItemTemplate));
                        var $bookingsList = $tabContent.find(".bookingDashboard.bookingDashboard--flyer.bookingDashboard--list .bookingDashboard__table-body");

                        $.each(returnedData, function () {
                            var $booking = $bookingsListItemTemplate.clone();

                            $booking.find(".bookingNumber").text(this.number);
                            $booking.find(".bookingDate").text(dateToString(this.createdOn, "mm/dd/yyyy"));

                            $bookingsList.append($booking);
                        });

                        customScrollInit();
                    }
                };

                var onFail = function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);

                    alert('ops!! call failed :(');
                };

                execAjaxCall("bookings/list", "GET", null, onSuccess, onFail);

            }

            if (_this.bookingsListTemplate == null) {
                $.get("/templates/flyer/bookings.html?_=" + new Date().getTime(), function (bookingsListTemplate) {
                    $.get("/templates/flyer/bookingsListItem.html?_=" + new Date().getTime(), function (bookingsListItemTemplate) {
                        _this.bookingsListTemplate = bookingsListTemplate;
                        _this.bookingsListItemTemplate = bookingsListItemTemplate;

                        setView(bookingsListTemplate, bookingsListItemTemplate);
                    });
                });
            }
            else {
                setView(_this.bookingsListTemplate, _this.bookingsListItemTemplate);
            }
        }

        flyerModule.dashboard.initContainer(setBookingsView);
    };
}
}).apply(flyerModule.booking);

//dashbaord
(function () {
    this.innerTemplate = null;
    this.dashboardTemplate = null;

    this.initContainer = function (callback, selectedTab) {

        if ($container.find(".dashboardBlock--flyer").length != 0) {
            $container.find(".dashboardBlock__content").remove();

            $container.find(".dashboardBlock__nav-item--active").removeClass("dashboardBlock__nav-item--active");
            $container.find(".dashboardBlock__nav-item[data-tab=" + selectedTab + "]").addClass("dashboardBlock__nav-item--active");

            callback();
            return;
        }

        var setView = function (template) {
            var $template = $($.parseHTML(template));

            $template.find(".dashboardBlock--flyer").find("[data-tab=" + selectedTab + "]").addClass("dashboardBlock__nav-item--active");

            $template.find(".dashboardBlock--flyer .dashboardBlock__nav-item").click(function () {
                $container.find(".dashboardBlock--flyer .dashboardBlock__nav-item--active").removeClass("dashboardBlock__nav-item--active");
                $(this).addClass("dashboardBlock__nav-item--active");

                switch ($(this).data("tab")) {
                    case "dashboard":
                        flyerModule.dashboard.init();
                        break;
                    case "profile":
                        flyerModule.profile.init();
                        break;
                    case "flights":
                        flyerModule.flights.init();
                        break;
                    case "bookings":
                        flyerModule.booking.initBookingsTab();
                        break;
                    case "settings":
                        commonModule.settings.init();
                        break;
                    case "iddocs":
                        break;
                    case "rewards":
                        break;
                    case "payMethods":
                        commonModule.paymentMethods.init();
                        break;
                    case "routealerts":
                        flyerModule.routeAlerts.init();
                        break;
                    case "messages":
                        break;
                    case "requests":
                        break;
                    case "auctions":
                        break;
                    case "sellseats":
                        break;
                    case "flightsReqs":
                        flyerModule.flightRequests.init();
                        break;
                    default:
                        break;
                }
            });

            $container.html($template);
        };

        if (this.innerTemplate == null) {
            $.get("/templates/flyer/inner.html?_=" + new Date().getTime(), function (template) {
                this.innerTemplate = template;

                setView(this.innerTemplate);
                callback();
            });
        }
        else {
            setView(this.innerTemplate);
            callback();
        }
    };

    this.init = function () {
        var setDashboardView = function () {

            var setView = function (template) {
                template = $($.parseHTML(template));

                var $tabContent = $(".dashboardBlock");

                $tabContent.append(template);

                customScrollInit();
            };

            if (this.dashboardTemplate == null) {
                $.get("/templates/flyer/dashbaord.html?_=" + new Date().getTime(), function (template) {
                    this.dashboardTemplate = template;

                    setView(this.dashboardTemplate);
                });
            }
            else {
                setView(this.dashboardTemplate);
            }

        };

        this.initContainer(setDashboardView, "dashboard");
    };

}).apply(flyerModule.dashboard);

//profile
(function () {
    this.profileTemplate = null;
    this.profileMemberTemplate = null;

    this.init = function () {
        var _this = this;

        var setProfileView = function () {
            var setView = function (profileTemplate, memberTemplate) {
                var $profileTemplate = $($.parseHTML(profileTemplate));
                var $memberTemplate = $($.parseHTML(memberTemplate));

                var $form = $profileTemplate.find('.js-profileForm');

                //- mask for phone
                $form.find('input.phone').mask('+1 (000) 000-00-00');

                //- calendar for birth field
                var today = new Date();
                $form.find('.js-datepicker').datepicker({
                    showAnim: 'fade',
                    changeMonth: true,
                    changeYear: true,
                    yearRange: (today.getFullYear() - 100) + ":" + today.getFullYear()
                });

                //- avatar - start
                var $avatar = $form.find('.js-avatar'),
                    $imgAvatar = $avatar.find('.js-avatar-img'),
                    $editAvatar = $avatar.find('.js-avatar-edit'),
                    $cropAvatar = $avatar.find('.js-avatar-crop'),
                    $cropAvatarBtn = $cropAvatar.find('button');

                var basic = $cropAvatar.croppie({
                    viewport: {
                        width: 133,
                        height: 133,
                        type: 'circle'
                    },
                    boundary: {
                        width: 200,
                        height: 200
                    },
                    showZoomer: false
                });

                function readFile(input) {
                    if (input.files && input.files[0]) {
                        var reader = new FileReader();

                        reader.onload = function (e) {
                            $cropAvatar.croppie('bind', {
                                url: e.target.result
                            });
                        };

                        reader.readAsDataURL(input.files[0]);
                    }
                }

                function popupResult(result) {
                    if (result.src) {
                        $imgAvatar.css({
                            'background-image': 'url(' + result.src + ')'
                        });
                        $avatar.removeClass('empty').attr('data-img', result.src);;
                    }
                }

                $editAvatar.on('change', function () {
                    readFile(this);
                    $avatar.addClass('showCrop');
                });

                $cropAvatarBtn.on('click', function (ev) {
                    basic.croppie('result', {
                        type: 'canvas',
                        size: 'viewport'
                    }).then(function (resp) {
                        popupResult({
                            src: resp
                        });
                        $avatar.removeClass('showCrop');
                        $form.addClass('editField showSubmit');
                    });
                });
                //- avatar - end

                // upload doc - start
                var $doc = $form.find('.js-doc'),
                    $docImg = $doc.find('.js-doc-img'),
                    $docInput = $doc.find('input'),
                    $docTitle = $doc.find('.js-doc-title');

                $docInput.on('change', function () {
                    var file = $(this)[0].files[0];

                    if (file) {
                        $form.addClass('editField showSubmit');
                        $doc.removeClass('empty');
                        $docTitle.text(file.name);
                    }
                });
                // upload doc - end

                var $editBtn = $form.find('.js-editForm');

                $editBtn.on('click', function () {
                    $form.addClass('editField showSubmit');
                });

                $form.find("#saveProfile").click(function () {
                    _this.update($form);
                });

                var $formInputMembers = $profileTemplate.find(".form--inputMembers");

                $formInputMembers.find('.js-datepicker').datepicker({
                    showAnim: 'fade',
                    changeMonth: true,
                    changeYear: true,
                    yearRange: (today.getFullYear() - 100) + ":" + today.getFullYear()
                });

                $profileTemplate.find("#addMember").click(function () {
                    _this.addMember($formInputMembers);
                });

                $memberTemplate.find(".js-removeMemebers").click(function () {
                    _this.deleteMember($(this));
                });

                _this.profileTemplate = $profileTemplate;
                _this.profileMemberTemplate = $memberTemplate;

                var $tabContent = $(".dashboardBlock");

                var request = $.ajax({
                    url: apiBaseUrl + 'accounts/get',
                    method: "GET",
                    crossDomain: true,
                    contentType: "application/json",
                    xhrFields: {
                        withCredentials: true
                    }
                });

                request.done(function (data, textStatus, xhr) {
                    if (xhr.status == 200) {
                        $form.find("#firstName").val(data.firstName);
                        $form.find("#middleName").val(data.middleName);
                        $form.find("#lastName").val(data.lastName);
                        $form.find("#dateOfBirth").datepicker('setDate', new Date(data.dateOfBirth));
                        $form.find("#email").val(data.email);
                        $form.find("#mobile").val(data.mobile);
                        $form.find("#address").val(data.address);
                        $form.find("#companyName").val(data.companyName);
                        $form.find("#companyAddress").val(data.companyAddress);
                        $form.find("#companyEmail").val(data.companyEmail);
                        $form.find("#companyPhone").val(data.companyPhone);

                        if (data.familyMembers == null || data.familyMembers.length == 0) {
                            $profileTemplate.find(".profileDashboard__members-empty").css("display", "block");
                        }
                        else {
                            var $members = $profileTemplate.find(".profileDashboard__members");

                            $.each(data.familyMembers, function () {
                                var $member = $memberTemplate.clone(true);

                                $member.find(".js-removeMemebers").data("mid", this.id);
                                $member.find(".profileDashboard__members-item-name").text(this.firstName + ' ' + this.lastName);
                                $member.find(".profileDashboard__members-item-descr").text(this.flyJestMemberId == null ? "" : "FlyJets Member");
                                $member.find(".profileDashboard__members-item-phone").text(this.mobile);
                                $member.find(".profileDashboard__members-item-email").text(this.email);
                                $member.find(".profileDashboard__members-item-birth-value").text(dateToString(this.dateOfBirth, "mm/dd/yyyy"));
                                $member.find(".profileDashboard__members-item-address-value").text(this.address);

                                $members.append($member);
                            });
                        }

                        $tabContent.append($profileTemplate);

                        tabsInit();

                        customScrollInit();
                    }
                });

                request.fail(function (jqXHR, textStatus) {
                    $form.removeClass('loading');
                    $form.find('input, button, textarea, select').removeAttr('disabled');

                    console.log(jqXHR);
                    console.log(textStatus);

                    alert('ops!! call failed :(');
                });
            };

            if (this.profileTemplate == null) {
                $.get("/templates/flyer/profile.html?_=" + new Date().getTime(), function (profileTemplate) {
                    $.get("/templates/flyer/profile_member.html?_=" + new Date().getTime(), function (memberTemplate) {
                        setView(profileTemplate, memberTemplate);
                    });
                });
            }
            else {
                setView(this.profileTemplate, this.profileMemberTemplate);
            }
        }

        flyerModule.dashboard.initContainer(setProfileView, "profile");
    };

    this.update = function ($form) {
        $form.addClass('loading');
        $form.find('input, button, textarea, select').attr('disabled', 'disabled');

        var profileData = {
            firstName: $form.find("#firstName").val(),
            middleName: $form.find("#middleName").val(),
            lastName: $form.find("#lastName").val(),
            dateOfBirth: $form.find("#dateOfBirth").val(),
            email: $form.find("#email").val(),
            mobile: $form.find("#mobile").val(),
            address: $form.find("#address").val(),
            companyName: $form.find("#companyName").val(),
            companyAddress: $form.find("#companyAddress").val(),
            companyEmail: $form.find("#companyEmail").val(),
            companyPhone: $form.find("#companyPhone").val()
        };


        var onSuccess = function (data, textStatus, xhr) {
            if (xhr.status == 200) {
                $form.find('input, button, textarea, select').removeAttr('disabled', 'disabled');
                $form.addClass('loading').removeClass('editField showSubmit');
                showSuccessMessage('Profile Updated', 'Your profile has been updated successfully');
            }
        };

        var onFail = function (jqXHR, textStatus) {
            $form.removeClass('loading');
            $form.find('input, button, textarea, select').removeAttr('disabled');

            console.log(jqXHR);
            console.log(textStatus);

            alert('ops!! call failed :(');
        };

        execAjaxCall("accounts/update", "POST", profileData, onSuccess, onFail);
    };

    this.addMember = function ($form) {
        var _this = this;
        $form.addClass('loading');
        $form.find('input, button, textarea, select').attr('disabled', 'disabled');

        var firstName = $form.find("input[name=firstName]").val(),
            lastName = $form.find("input[name=lastName]").val(),
            email = $form.find("input[name=email]").val(),
            mobile = $form.find("input[name=mobile]").val(),
            address = $form.find("input[name=address]").val(),
            dateOfBirth = $form.find("input[name=dateOfBirth]").val();

        var request = $.ajax({
            url: apiBaseUrl + 'accounts/addMember',
            method: "POST",
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify({
                firstName: firstName,
                lastName: lastName,
                email: email,
                mobile: mobile,
                address: address,
                dateOfBirth: dateOfBirth
            }),
            xhrFields: {
                withCredentials: true
            }
        });

        request.done(function (data, textStatus, xhr) {
            if (xhr.status == 200) {
                $form.removeClass('loading');
                $form.find('input, button, textarea, select').removeAttr('disabled', 'disabled');

                var $membersList = $container.find(".profileDashboard__members");
                var $memberTemplate = _this.profileMemberTemplate.clone(true);

                $memberTemplate.find(".profileDashboard__members-item-name").text(firstName + ' ' + lastName);
                $memberTemplate.find(".profileDashboard__members-item-phone").text(mobile);
                $memberTemplate.find(".profileDashboard__members-item-email").text(email);
                $memberTemplate.find(".profileDashboard__members-item-phone").text(mobile);
                $memberTemplate.find(".profileDashboard__members-item-birth-value").text(dateToString(dateOfBirth, 'mm/dd/yyy'));
                $memberTemplate.find(".profileDashboard__members-item-address-value").text(address);

                $membersList.append($memberTemplate);

                $(".profileDashboard__add-members-input-header.js-acc-title").trigger("click");

                $form.find("input[name=firstName]").val("");
                $form.find("input[name=lastName]").val("");
                $form.find("input[name=email]").val("");
                $form.find("input[name=mobile]").val("");
                $form.find("input[name=address]").val("");
                $form.find("input[name=dateOfBirth]").val("");

                showSuccessMessage('Member Added', 'Member has been added successfully');
            }
        });

        request.fail(function (jqXHR, textStatus) {
            $form.removeClass('loading');
            $form.find('input, button, textarea, select').removeAttr('disabled');

            console.log(jqXHR);
            console.log(textStatus);

            alert('ops!! call failed :(');
        });
    };

    this.deleteMember = function ($button) {
        var request = $.ajax({
            url: apiBaseUrl + 'accounts/deleteMember/' + $button.data("mid"),
            method: "GET",
            crossDomain: true,
            xhrFields: {
                withCredentials: true
            }
        });

        request.done(function (data, textStatus, xhr) {
            if (xhr.status == 200) {
                $button.parents(".profileDashboard__members-item").remove();
                showSuccessMessage('Member Deleted', 'Member has been deleted successfully');
            }
        });

        request.fail(function (jqXHR, textStatus) {
            console.log(jqXHR);
            console.log(textStatus);

            alert('ops!! call failed :(');
        });
    };

}).apply(flyerModule.profile);

//flight requests
(function () {
    this.flightsRequestsListTemplate = null;
    this.flightsRequestsListItemTemplate = null;

    this.init = function () {
        var _this = this;

        var setFlightsRequetsView = function () {
            var setView = function (flightsRequestsListTemplate, flightsRequestsListItemTemplate) {
                var $flightsRequestsListTemplate = $($.parseHTML(flightsRequestsListTemplate));

                var $tabContent = $(".dashboardBlock");

                $flightsRequestsListTemplate.find(".js-tabRequestsNavItem").click(function () {
                    if ($(this).data("id") == "active") {
                        bindData(true, $tabContent);
                    }
                    else {
                        bindData(false, $tabContent);
                    }
                });

                $flightsRequestsListTemplate.find(".requestsDashboardDetail__bottom").remove();
                $flightsRequestsListTemplate.find("#newBookingPopup").remove();

                $tabContent.append($flightsRequestsListTemplate);

                requestDashboardTabs();

                bindData(true, $tabContent);
            };

            var bindData = function (viewCurrent, $tabContent) {

                var request = $.ajax({
                    url: apiBaseUrl + 'bookings/flightsrequests/list/' + viewCurrent,
                    method: "GET",
                    crossDomain: true,
                    contentType: "application/json",
                    xhrFields: {
                        withCredentials: true
                    }
                });

                request.done(function (data, textStatus, xhr) {
                    if (xhr.status == 200) {

                        var $flightsRequestsListItemTemplate = $($.parseHTML(_this.flightsRequestsListItemTemplate));
                        var $requestsList;

                        if (viewCurrent) {
                            $requestsList = $tabContent.find(".requestsDashboard__table--current .requestsDashboard__table-body");
                        }
                        else {
                            $requestsList = $tabContent.find(".requestsDashboard__table--historical .requestsDashboard__table-body");
                        }

                        $requestsList.find(".requestsDashboard__table-row").remove();

                        $.each(data, function () {
                            var $flightReq = $flightsRequestsListItemTemplate.clone();

                            $flightReq.find(".requestsDashboard__table-index").text(this.number);
                            $flightReq.find(".requestsDashboard__table-name").text(this.fullName);
                            $flightReq.find(".requestDate").text(dateToString(this.createdOn, 'mm/dd/yyyy'));
                            $flightReq.find(".departure").text(this.departure);
                            $flightReq.find(".arrival").text(this.arrival);
                            $flightReq.find(".departureDate").text(dateToString(this.departureDate, 'mm/dd/yyyy'));
                            $flightReq.find(".returnDate").text(this.returnDate == null ? "" : dateToString(this.returnDate, 'mm/dd/yyyy'));

                            var $status = $flightReq.find(".requestStatus");

                            if (this.status == requestStatuses.pending) {
                                $status.text("Pending");
                            }
                            else if (this.status == requestStatuses.canceled) {
                                $status.text("Canceled");
                            }
                            else if (this.status == requestStatuses.completed) {
                                $status.text("Completed");
                            }

                            $flightReq.find(".js-popup").data("req", JSON.stringify(this));

                            $flightReq.find(".js-popup").click(function (e) {
                                e.preventDefault();
                                e.stopPropagation();

                                var $details = $tabContent.find('#flightRequestDetails');
                                var request = JSON.parse($(this).data("req"));

                                $details.find(".number").text(request.number);
                                $details.find(".requesterName").text(request.fullName);

                                if (request.direction == bookingDirection.oneway) {
                                    $details.find(".direction").text("One-way");
                                }
                                else {
                                    $details.find(".direction").text("Round-trip");
                                }

                                var bookingTypesText = [];

                                if ((request.bookingType & bookingTypes.charterAircraft) == bookingTypes.charterAircraft) {
                                    bookingTypesText.push("Charter Aircraft");
                                }

                                if ((request.bookingType & bookingTypes.charterAircraftSeat) == bookingTypes.charterAircraftSeat) {
                                    bookingTypesText.push("Charter Seat");
                                }

                                if ((request.bookingType & bookingTypes.commercialSeat) == bookingTypes.commercialSeat) {
                                    bookingTypesText.push("Commercial Seat");
                                }

                                $details.find(".bookingType").text(bookingTypesText.join(", "));
                                $details.find(".departure").text(request.departure);
                                $details.find(".arrival").text(request.arrival);
                                $details.find(".departureDate").text(dateToString(request.departureDate, 'mm/dd/yyyy'));
                                $details.find(".returnDate").text(request.returnDate == null ? "" : dateToString(request.returnDate, 'mm/dd/yyyy'));
                                $details.find(".paxNo").text(request.pax);

                                var aircraftTypesText = [];
                                if ((request.aircraftType & aircraftTypes.VeryLightJet) == aircraftTypes.VeryLightJet) {
                                    aircraftTypesText.push("Very light jet");
                                }

                                if ((request.aircraftType & aircraftTypes.LightJet) == aircraftTypes.LightJet) {
                                    aircraftTypesText.push("Light jet");
                                }

                                if ((request.aircraftType & aircraftTypes.MidSizeJet) == aircraftTypes.MidSizeJet) {
                                    aircraftTypesText.push("Midsize jet");
                                }

                                if ((request.aircraftType & aircraftTypes.SuperMidSizeJet) == aircraftTypes.SuperMidSizeJet) {
                                    aircraftTypesText.push("Super midsize jet");
                                }

                                if ((request.aircraftType & aircraftTypes.HeavyJet) == aircraftTypes.HeavyJet) {
                                    aircraftTypesText.push("Heavy jet");
                                }

                                if (aircraftTypesText.length != 0) {
                                    $details.find(".aircraftType").text(aircraftTypesText.join(", "));
                                }

                                var $priceRange = $details.find(".priceRange");
                                if (request.maxPrice != null && request.minPrice != null) {
                                    $priceRange.text(request.minPrice + " - " + request.maxPrice)
                                }
                                else if (request.maxPrice != null) {
                                    $priceRange.text("max price" + request.maxPrice)
                                }
                                else if (request.minPrice != null) {
                                    $priceRange.text("min price" + request.minPrice)
                                }

                                var $status = $details.find(".requestStatus");
                                if (request.status == requestStatuses.pending) {
                                    $status.text("Pending");
                                }
                                else if (request.status == requestStatuses.canceled) {
                                    $status.text("Canceled");
                                }
                                else if (request.status == requestStatuses.completed) {
                                    $status.text("Completed");
                                }

                                $details.find(".requestDate").text(dateToString(request.createdOn, 'mm/dd/yyyy'));

                                app.utils.responseForm('#flightRequestDetails');
                            });

                            $requestsList.append($flightReq);
                        });

                        customScrollInit();
                    }
                });

                request.fail(function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);

                    alert('ops!! call failed :(');
                });
            }

            if (_this.flightsRequestsListTemplate == null) {
                $.get("/templates/flightsRequestsList.html?_=" + new Date().getTime(), function (flightsRequestsListTemplate) {
                    $.get("/templates/flightsRequestsListItem.html?_=" + new Date().getTime(), function (flightsRequestsListItemTemplate) {
                        _this.flightsRequestsListTemplate = flightsRequestsListTemplate;
                        _this.flightsRequestsListItemTemplate = flightsRequestsListItemTemplate;

                        setView(flightsRequestsListTemplate, flightsRequestsListItemTemplate);
                    });
                });
            }
            else {
                setView(_this.flightsRequestsListTemplate, _this.flightsRequestsListItemTemplate);
            }
        }

        flyerModule.dashboard.initContainer(setFlightsRequetsView, "flightReqs");
    };

}).apply(flyerModule.flightRequests);

//flights
(function () {

    this.flightsListTemplate = null;
    this.flightsListItemTemplate = null;
    this.historicalFlightsListItemTemplate = null;

    this.init = function () {
        var _this = this;

        var setFlightsView = function () {
            var setView = function () {
                var $flightsListTemplate = $($.parseHTML(_this.flightsListTemplate));

                var $tabContent = $(".dashboardBlock");

                $tabContent.append($flightsListTemplate);

                bindFlightsData(filterFlightsBy.current, $tabContent);
                //bindHistoricalFlightsData($tabContent);
            };

            var bindFlightsData = function (filterBy, $tabContent) {
                var onSuccess = function (returnedData, textStatus, xhr) {
                    if (xhr.status == 200) {

                        var $flightsListItemTemplate = $($.parseHTML(_this.flightsListItemTemplate));
                        var $flightsList;

                        if (filterBy == filterFlightsBy.current) {
                            $flightsList = $tabContent.find("#currentFlights");
                        }
                        else {
                            $flightsList = $tabContent.find("#upcomingFlights");
                        }

                        $flightsList.children().remove();

                        $.each(returnedData, function () {
                            var $flights = $flightsListItemTemplate.clone();

                            $flights.find(".departureName").text(this.departure);

                            var departureDateTimeText = dateToString(this.departureDate, "mm/dd/yyyy");

                            if (this.departureTime != null) {
                                departureDateTimeText = this.departureTime + "<br/>" + departureDateTimeText;
                            }

                            $flights.find(".departureDateAndTime").html(departureDateTimeText);

                            $flights.find(".arrivalName").text(this.arrival);

                            var arrivalDateTimeText = dateToString(this.arrivalDate, "mm/dd/yyyy");

                            if (this.arrivalTime != null) {
                                arrivalDateTimeText = this.arrivalTime + "<br/>" + arrivalDateTimeText;
                            }

                            $flights.find(".arrivalDateAndTime").html(arrivalDateTimeText);

                            if (this.durationHours != 0 && this.durationMinutes != 0) {
                                $flights.find(".duration").text(this.durationHours + "H" + this.durationMinutes + "MIN");
                            }
                            else if (this.durationHours != 0) {
                                $flights.find(".duration").text(this.durationHours + "H");
                            }
                            else {
                                $flights.find(".duration").text(this.durationMinutes + "MIN");
                            }


                            $flightsList.append($flights);
                        });

                        tabsInit();
                        customScrollInit();
                    }
                };

                var onFail = function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);
                    //flights upcoming/historical flyer dash
                    //alert('ops!! call failed :(');
                };

                execAjaxCall("bookings/flights/" + filterBy, "GET", null, onSuccess, onFail);
            }

            var bindHistoricalFlightsData = function ($tabContent) {
                var onSuccess = function (returnedData, textStatus, xhr) {
                    if (xhr.status == 200) {

                        var $flightsListItemTemplate = $($.parseHTML(_this.flightsListItemTemplate));
                        var $flightsList = $tabContent.find(".bookingDashboard.bookingDashboard--flyer.bookingDashboard--list .bookingDashboard__table-body");

                        $.each(returnedData, function () {
                            var $flights = $bookingsListItemTemplate.clone();

                            $booking.find(".bookingNumber").text(this.number);
                            $booking.find(".bookingDate").text(dateToString(this.createdOn, "mm/dd/yyyy"));

                            $flightsList.append($booking);
                        });

                        customScrollInit();
                    }
                };

                var onFail = function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);

                    alert('ops!! call failed :(');
                };

                execAjaxCall("bookings/flights/" + filterFlightsBy.historical, "GET", null, onSuccess, onFail);
            }

            if (_this.flightsListTemplate == null) {
                $.get("/templates/flyer/flights.html?_=" + new Date().getTime(), function (flightsListTemplate) {
                    $.get("/templates/flyer/flightsListItem.html?_=" + new Date().getTime(), function (flightsListItemTemplate) {
                        $.get("/templates/flyer/historicalFlightsListItem.html?_=" + new Date().getTime(), function (historicalFlightsListItemTemplate) {
                            _this.flightsListTemplate = flightsListTemplate;
                            _this.flightsListItemTemplate = flightsListItemTemplate;
                            _this.historicalFlightsListItemTemplate = historicalFlightsListItemTemplate;

                            setView();
                        });
                    });
                });
            }
            else {
                setView();
            }
        }

        flyerModule.dashboard.initContainer(setFlightsView, "flights");
    };

}).apply(flyerModule.flights);


//route Alerts

(function () {

    this.routeAlertsListTemplate = null;
    this.routeAlertsListItemTemplate = null;

    this.init = function () {
        var _this = this;

        var setRouteAlertsView = function () {
            var setView = function () {
                var $routeAlertsListTemplate = $($.parseHTML(_this.routeAlertsListTemplate));

                var $tabContent = $(".dashboardBlock");

                $tabContent.append($routeAlertsListTemplate);

                bindRouteAlertsData($tabContent);
            };

            var bindRouteAlertsData = function ($tabContent) {
                var onSuccess = function (returnedData, textStatus, xhr) {
                    if (xhr.status == 200) {

                        var $routeAlertsListItemTemplate = $($.parseHTML(_this.routeAlertsListItemTemplate));
                        var $routeAlertsList = $tabContent.find(".alertsDashboard__list");

                        $routeAlertsList.children().remove();

                        $.each(returnedData, function () {
                            var $routeAlert = $routeAlertsListItemTemplate.clone();
                            //console.log({returnedData, this:this})
                            //info text - departure/return days (of week), list until - check for specific dates here too poss
                            // num new - check vs last login? available on account table... check vs creation date on flights if avail. or capture time on email send vs last login. 
                           $routeAlert.find("#route-alert-departure-title").text(this.DepartureName);
                           $routeAlert.find("#route-alert-arrival-title").text(this.ArrivalName);
                           //$routeAlert.find("#num-new-alerts").text(this.);
                           // $routeAlert.find("#info-text").text(this.);
                           // to parse date => var departureDateTimeText = dateToString(this.departureDate, "mm/dd/yyyy");


                            $routeAlertsList.append($routeAlert);
                        });

                        customScrollInit();


                        var $form = $tabContent.find('.form--addAlert');
                        //     $BookingType = $form.find('input[name=aircraftProvider]'),
                        //     $aircraftTailNumber = $form.find('input[name=aircraftTailNumber]');
                        changeRoundTrip($form);
                        checkboxChange();
                        radioChange();
                        tabsInit();

                        var departureId = $form.find("#departureId").val(),
                            departureName = $form.find("#departure").val(),
                            arrivalId = $form.find("#arrivalId").val(),
                            arrivalName = $form.find("#arrival").val();

                            var $departure = $form.find("#departure");
                            var $arrival = $form.find("#arrival");

                            $departure.val(departureName);
                            $form.find("#departureId").val(departureId);
                            $arrival.val(arrivalName);
                            $form.find("#arrivalId").val(arrivalId);

                        var locations = new Bloodhound({
                            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                            queryTokenizer: Bloodhound.tokenizers.whitespace,
                            remote: {
                                url: apiBaseUrl + 'locations/search/tree/2/true/%QUERY',
                                wildcard: '%QUERY'
                            }
                        });
                
                        $departure.typeahead(null, {
                            name: 'departureLocations',
                            display: 'name',
                            source: locations,
                            minLength: 3
                        }).bind("typeahead:selected", function (obj, datum, name) {
                            $form.find("#departureId").val(datum.id);
                        });
                
                        $arrival.typeahead(null, {
                            name: 'arrivalLocations',
                            display: 'name',
                            source: locations,
                            minLength: 3
                        }).bind("typeahead:selected", function (obj, datum, name) {
                            $form.find("#arrivalId").val(datum.id);
                        });
                
                        $departure.blur(function () {
                            if ($(this).val() == "") {
                                $departure.val("");
                            }
                        });
                
                        $arrival.blur(function () {
                            if ($(this).val() == "") {
                                $arrival.val("");
                            }
                        });

                        $form.on('submit', function() {
                            event.preventDefault();

                            var formData = new FormData();

                            
                            var $selectedBookingOptions = $form.find("input[name='options']:checked");
                            var bookingType = $selectedBookingOptions.length === 1 ? bookingTypes[$selectedBookingOptions[0].value] : 64;
                           
                            var maxPrice = $form.find("input[name='price']")[0].value;

                            var listUntil = $form.find("input[name='list-until']:checked")[0].value;
                            listUntil = listUntil === "Forever" ? null : listUntil;
                            
                            formData.append("Direction", ($form.find("input[name='type']:checked")[0].value));
                            formData.append("BookingType", bookingType)
                            formData.append("DepartureId", null)
                            formData.append("ArrivalId", null)
                            formData.append("SpecificDates", null)
                            formData.append("Dates", null)
                            formData.append("DepartureDays", null)
                            formData.append("MaxPrice", maxPrice)
                            formData.append("ListUntil", listUntil)
                            console.log(formData.get("BookingType"), formData.get("Direction"), formData.get("MaxPrice"), formData.get("ListUntil"))
                        })

                    }

                };

                var onFail = function (jqXHR, textStatus) {
                    //console.log(jqXHR);
                    //console.log(textStatus);

                    //alert('call failed');
                };

                execAjaxCall("routealert/list/", "GET", null, onSuccess, onFail);
            }

            if (_this.routeAlertsListTemplate == null || _this.routeAlertsListItemTemplate == null) {
                $.get("/templates/flyer/routeAlerts.html?_=" + new Date().getTime(), function (routeAlertsListTemplate) {
                    $.get("/templates/flyer/RouteAlertsListItem.html?_=" + new Date().getTime(), function (routeAlertsListItemTemplate) {
                            _this.routeAlertsListTemplate = routeAlertsListTemplate;
                            _this.routeAlertsListItemTemplate = routeAlertsListItemTemplate;

                            setView();
                    });
                });
            }
            else {
                setView();
            }
        }

        flyerModule.dashboard.initContainer(setRouteAlertsView, "routealerts");
    };

}).apply(flyerModule.routeAlerts);


/*******************************Flyer Module End****************************************/

/*******************************Admin Module Start****************************************/

var adminModule = adminModule || {};

adminModule.dashboard = {};
adminModule.flightRequests = {};
adminModule.networkActivities = {};
adminModule.bookings = {};
adminModule.confirmedBookings = {};
adminModule.aircraftProvidersSignupRequests = {};


//dashbaord
(function () {
    this.innerTemplate = null;
    this.dashboardTemplate = null;

    this.initContainer = function (callback, activateDashbaordTab = false) {

        var $dashboardBlockAdmin = $container.find(".dashboardBlock--admin");

        if ($dashboardBlockAdmin.length != 0) {
            $dashboardBlockAdmin.find(".dashboardBlock__content").remove();

            if(activateDashbaordTab) {
                $dashboardBlockAdmin.find(".dashboardBlock__nav-item--active").removeClass("dashboardBlock__nav-item--active");

                $dashboardBlockAdmin.find(".dashboardBlock__nav-item[data-tab=dashboard]").addClass("dashboardBlock__nav-item--active");
            }

            callback();
            return;
        }

        var setView = function (template) {
            var $template = $($.parseHTML(template));

            $("#flyerHeaderMenue, #aircraftProviderHeadrMenue").remove();

            $container.html($template);

            $(".dashboardBlock__nav-item, #adminHeaderMenue .header__login-menu-list-item").click(function () {
                var $dashboardBlockAdmin = $template.find(".dashboardBlock--admin");

                $dashboardBlockAdmin.find(".dashboardBlock__nav-item--active").removeClass("dashboardBlock__nav-item--active");

                $dashboardBlockAdmin.find("[data-tab=" + $(this).data("tab") + "]").addClass("dashboardBlock__nav-item--active");

              switch ($(this).data("tab")) {
                case "dashboard":
                  adminModule.dashboard.init();
                  notificationCountHandler(notifications, currentUser.type);
                  if(notifications.length == 0) {
                    $("#header__notification__count").css({display: "none"})
                  }
                  break;
                case "profile":
                  break;
                case "network":
                  adminModule.networkActivities.init();
                  if(notifications.length == 0) {
                    $("#header__notification__count").css({display: "none"})
                  }
                  break;
                case "settings":
                  commonModule.settings.init();
                  break;
                case "apRequests":
                  adminModule.aircraftProvidersSignupRequests.init();
                  if(notifications.length == 0) {
                    $("#header__notification__count").css({display: "none"})
                  }
                  break;
                case "flightReqs":
                  adminModule.flightRequests.init();
                  break;
                case "flights":
                  break;
                case "auctions":
                  break;
                case "messages":
                  break;
                case "requests":
                  break;
                case "auctions":
                  break;
                case "reservations":
                  adminModule.bookings.init(false, bookingTypes.charterAircraftSeat, bookingTypes.charterFlightSeat)
                  break;
                case "confirmed-reservations":
                  adminModule.bookings.init(true, bookingTypes.charterAircraftSeat, bookingTypes.charterFlightSeat)
                  break
                case "bookings":
                  adminModule.bookings.init(false, bookingTypes.charterAircraft, bookingTypes.charterFlight);
                  break;
                case "confirmations":
                  adminModule.bookings.init(true, bookingTypes.charterAircraft, bookingTypes.charterFlight)
                  break;
                default:
                  break;
              }
            });
        };

        if (this.innerTemplate == null) {
            $.get("/templates/admin/inner.html?_=" + new Date().getTime(), function (template) {
                this.innerTemplate = template;

                setView(this.innerTemplate);
                callback();
            });
        }
        else {
            setView(this.innerTemplate);
            callback();
        }
    };

    this.init = function () {
        var _this = this;

        var setDashboardView = function () {

            var setView = function (template) {
                var $template = $($.parseHTML(template));

                var $tabContent = $(".dashboardBlock");

                $tabContent.append($template);

                customScrollInit();
            };

            if (_this.dashboardTemplate == null) {
                $.get("/templates/admin/dashboard.html?_=" + new Date().getTime(), function (template) {
                    _this.dashboardTemplate = template;

                    setView(_this.dashboardTemplate);
                });
            }
            else {
                setView(_this.dashboardTemplate);
            }

        };

        this.initContainer(setDashboardView, true);
    };

}).apply(adminModule.dashboard);

//flight requests
(function () {
    this.flightsRequestsListTemplate = null;
    this.flightsRequestsListItemTemplate = null;

    this.init = function () {
        var _this = this;

        var setFlightsRequetsView = function () {
            var setView = function (flightsRequestsListTemplate, flightsRequestsListItemTemplate) {
                var $flightsRequestsListTemplate = $($.parseHTML(flightsRequestsListTemplate));

                var $tabContent = $(".dashboardBlock");

                $flightsRequestsListTemplate.find(".js-tabRequestsNavItem").click(function () {
                    if ($(this).data("id") == "active") {
                        bindData(true, $tabContent);
                    }
                    else {
                        bindData(false, $tabContent);
                    }
                });

                var $newBooking = $flightsRequestsListTemplate.find("#newBooking");

                $newBooking.click(function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    var $popUp = $tabContent.find('#newBookingPopup'),
                        $form = $popUp.find('.form--newBooking'),
                        $datepicker = $form.find('.js-gmi-datepicker'),
                        $locations = $form.find('.js-tabContentItem .js-typeahead'),
                        $aircraftProviders = $form.find('input[name=aircraftProvider]'),
                        $aircraftTailNumber = $form.find('input[name=aircraftTailNumber]');

                    changeRoundTrip($form);

                    $oneway = $form.find(".js-changeWay[value=" + bookingDirection.oneway + "]");


                    $oneway.click(function () {
                        $form.find(".js-tabNavItem[data-id='outbound']").trigger("click");
                    });

                    requestDashboardTabs();
                    tabsInit();

                    var aircraftProviderId;

                    var aircraftProviders = new Bloodhound({
                        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                        queryTokenizer: Bloodhound.tokenizers.whitespace,
                        remote: {
                            url: apiBaseUrl + 'accounts/autocomplete/' + userTypes.aircraftProvider,
                            wildcard: '%QUERY',
                            prepare: function (query, settings) {
                                settings.url += '/' + query;

                                settings.xhrFields = {
                                    withCredentials: true
                                };

                                return settings;
                            }
                        }
                    });

                    $aircraftProviders.typeahead(null, {
                        name: 'aircraftProviders',
                        display: 'name',
                        source: aircraftProviders,
                        minLength: 2,
                        limit: 10
                    }).bind("typeahead:selected", function (obj, datum, name) {
                        aircraftProviderId = datum.id;

                        $($popUp.find("input[name=aircraftProvider]")).data("id", aircraftProviderId);
                    });


                    var aircrafts = new Bloodhound({
                        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                        queryTokenizer: Bloodhound.tokenizers.whitespace,
                        remote: {
                            url: apiBaseUrl + 'aircrafts/autocomplete/',
                            wildcard: '%QUERY',
                            prepare: function (query, settings) {
                                settings.url += aircraftProviderId + '/' + query;

                                settings.xhrFields = {
                                    withCredentials: true
                                };

                                return settings;
                            }
                        }
                    });

                    $aircraftTailNumber.typeahead(null, {
                        name: 'aircrafts',
                        display: 'name',
                        source: aircrafts,
                        minLength: 2,
                        limit: 10
                    }).bind("typeahead:selected", function (obj, datum, name) {
                        $($popUp.find("input[name=aircraftTailNumber]")).data("id", datum.id);
                    });


                    var filterLocations = locationsTypes.Airport;

                    var locations = new Bloodhound({
                        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                        queryTokenizer: Bloodhound.tokenizers.whitespace,
                        remote: {
                            url: apiBaseUrl + 'locations/search/tree/' + filterLocations + '/true',
                            wildcard: '%QUERY',
                            prepare: function (query, settings) {
                                settings.url += '/' + query;

                                settings.xhrFields = {
                                    withCredentials: true
                                };

                                return settings;
                            }
                        }
                    });

                    $locations.typeahead(null, {
                        name: 'departureLocations',
                        display: 'name',
                        source: locations,
                        minLength: 2,
                        limit: 10
                    }).bind("typeahead:selected", function (obj, datum, name) {
                        $($popUp.find("input[name=" + obj.currentTarget.name + "]")).data("id", datum.id);
                    });

                    $datepicker.gmiDatepicker({
                        type: 'datetime-range',
                        readonly: true,
                        format: 'MM/dd/yyyy HH:mm',
                        placeholder: 'click to change'
                    });

                    var $createOfflineBooking = $popUp.find("#createOfflineBooking");

                    $createOfflineBooking.data("reqid", $(this).data("reqid"));

                    $createOfflineBooking.click(function () {
                        var $form = $popUp.find("#newBookingForm");

                        $form.addClass('loading');
                        $form.find('input, button, textarea, select').attr('disabled', 'disabled');

                        var direction = parseInt($($popUp.find(".js-changeWay:checked")).val());
                        var outboundDates = $popUp.find("input[name=outboundDate]").val().split(" - ");
                        var inboundDates = $popUp.find("input[name=inboundDate]").val().split(" - ");
                        var bookingPax = parseint($("#pax").html());
                        var request = $.ajax({
                            url: apiBaseUrl + 'bookings/createofflinebooking',
                            method: "POST",
                            crossDomain: true,
                            data: JSON.stringify({
                                flightRequestId: $(this).data("reqid"),
                                aircraftProviderId: $($popUp.find("input[name=aircraftProvider]")).data("id"),
                                aircraftId: $($popUp.find("input[name=aircraftTailNumber]")).data("id"),
                                pax: $($popUp.find("input[name=pax]")).val(),
                                bookingType: bookingTypes.charterAircraft,
                                direction: direction,
                                outboundFlightDepartureId: $($popUp.find("input[name=outboundDeparture]")).data("id"),
                                outboundFlightArrivalId: $($popUp.find("input[name=outboundArrival]")).data("id"),
                                outboundFlightDepartureDate: outboundDates[0],
                                outboundFlightArrivalDate: outboundDates[1],
                                inboundFlightDepartureId: direction == bookingDirection.oneway ? null : $($popUp.find("input[name=inboundArrival]")).data("id"),
                                inboundFlightArrivalId: direction == bookingDirection.oneway ? null : $($popUp.find("input[name=inboundArrival]")).data("id"),
                                inboundFlightDepartureDate: direction == bookingDirection.oneway ? null : inboundDates[0],
                                inboundFlightArrivalDate: direction == bookingDirection.oneway ? null : inboundDates[1],
                                exclusiveBookingCost: $($popUp.find("input[name=cost]")).val(),
                                bookingPax
                            }),
                            contentType: "application/json",
                            xhrFields: {
                                withCredentials: true
                            }
                        });

                        request.done(function (data, textStatus, xhr) {
                            if (xhr.status == 200) {

                                $form.removeClass('loading');
                                $form.find('input, button, textarea, select').removeAttr('disabled');

                                showSuccessMessage('Booking Created', 'The booking has been updated successfully');
                            }
                        });

                        request.fail(function (jqXHR, textStatus) {
                            console.log(jqXHR);
                            console.log(textStatus);

                            $form.removeClass('loading');
                            $form.find('input, button, textarea, select').removeAttr('disabled');

                            alert('ops!! call failed :(');
                        });
                    });

                    app.utils.responseForm('#newBookingPopup');
                });

                $tabContent.append($flightsRequestsListTemplate);

                requestDashboardTabs();

                bindData(true, $tabContent);
            };

            var bindData = function (viewCurrent, $tabContent) {

                var request = $.ajax({
                    url: apiBaseUrl + 'bookings/flightsrequests/list/' + viewCurrent,
                    method: "GET",
                    crossDomain: true,
                    contentType: "application/json",
                    xhrFields: {
                        withCredentials: true
                    }
                });

                request.done(function (data, textStatus, xhr) {
                    if (xhr.status == 200) {

                        var $flightsRequestsListItemTemplate = $($.parseHTML(_this.flightsRequestsListItemTemplate));
                        var $requestsList;

                        if (viewCurrent) {
                            $requestsList = $tabContent.find(".requestsDashboard__table--current .requestsDashboard__table-body");
                        }
                        else {
                            $requestsList = $tabContent.find(".requestsDashboard__table--historical .requestsDashboard__table-body");
                        }

                        $requestsList.find(".requestsDashboard__table-row").remove();

                        $.each(data, function () {
                            var $flightReq = $flightsRequestsListItemTemplate.clone();

                            $flightReq.find(".requestsDashboard__table-index").text(this.number);
                            $flightReq.find(".requestsDashboard__table-name").text(this.fullName);
                            $flightReq.find(".requestDate").text(dateToString(this.createdOn, 'mm/dd/yyyy'));
                            $flightReq.find(".departure").text(this.departure);
                            $flightReq.find(".arrival").text(this.arrival);
                            $flightReq.find(".departureDate").text(dateToString(this.departureDate, 'mm/dd/yyyy'));
                            $flightReq.find(".returnDate").text(this.returnDate == null ? "" : dateToString(this.returnDate, 'mm/dd/yyyy'));

                            var $status = $flightReq.find(".requestStatus");

                            if (this.status == requestStatuses.pending) {
                                $status.text("Pending");
                            }
                            else if (this.status == requestStatuses.canceled) {
                                $status.text("Canceled");
                            }
                            else if (this.status == requestStatuses.completed) {
                                $status.text("Completed");
                            }

                            $flightReq.find(".js-popup").data("req", JSON.stringify(this));

                            $flightReq.find(".js-popup").click(function (e) {
                                e.preventDefault();
                                e.stopPropagation();

                                var $details = $tabContent.find('#flightRequestDetails');
                                var request = JSON.parse($(this).data("req"));

                                $details.find("#newBooking").data("reqid", request.id);

                                $details.find(".number").text(request.number);
                                $details.find(".requesterName").text(request.fullName);

                                if (request.direction == bookingDirection.oneway) {
                                    $details.find(".direction").text("One-way");
                                }
                                else {
                                    $details.find(".direction").text("Round-trip");
                                }

                                var bookingTypesText = [];

                                if ((request.bookingType & bookingTypes.charterAircraft) == bookingTypes.charterAircraft) {
                                    bookingTypesText.push("Charter Aircraft");
                                }

                                if ((request.bookingType & bookingTypes.charterAircraftSeat) == bookingTypes.charterAircraftSeat) {
                                    bookingTypesText.push("Charter Seat");
                                }

                                if ((request.bookingType & bookingTypes.commercialSeat) == bookingTypes.commercialSeat) {
                                    bookingTypesText.push("Commercial Seat");
                                }
                              if(request.bookingType == bookingTypes.charterAircraftOrSeat) {
                                bookingTypesText.push("Charter Aircraft", "Charter Seat");
                              }
                              if(request.bookingType == bookingTypes.charterAircraftOrComm) {
                                bookingTypesText.push("Charter Aircraft", "Commercial Seat")
                              };
                              if(request.bookingType == bookingTypes.charterSeatOrComm) {
                                bookingTypesText.push("Charter Seat", "Commercial Seat");
                              };
                              if (request.bookingType == bookingTypes.any) {
                                bookingTypesText.push("Charter Aircraft", "Charter Seat", "Commercial Seat")
                              }

                                $details.find(".bookingType").text(bookingTypesText.join(", "));
                                $details.find(".departure").text(request.departure);
                                $details.find(".arrival").text(request.arrival);
                                $details.find(".departureDate").text(dateToString(request.departureDate, 'mm/dd/yyyy'));
                                $details.find(".returnDate").text(request.returnDate == null ? "" : dateToString(request.returnDate, 'mm/dd/yyyy'));
                                $details.find(".paxNo").text(request.pax);

                                var aircraftTypesText = [];
                                if ((request.aircraftType & aircraftTypes.VeryLightJet) == aircraftTypes.VeryLightJet) {
                                    aircraftTypesText.push("Very light jet");
                                }

                                if ((request.aircraftType & aircraftTypes.LightJet) == aircraftTypes.LightJet) {
                                    aircraftTypesText.push("Light jet");
                                }

                                if ((request.aircraftType & aircraftTypes.MidSizeJet) == aircraftTypes.MidSizeJet) {
                                    aircraftTypesText.push("Midsize jet");
                                }

                                if ((request.aircraftType & aircraftTypes.SuperMidSizeJet) == aircraftTypes.SuperMidSizeJet) {
                                    aircraftTypesText.push("Super midsize jet");
                                }

                                if ((request.aircraftType & aircraftTypes.HeavyJet) == aircraftTypes.HeavyJet) {
                                    aircraftTypesText.push("Heavy jet");
                                }

                                if (aircraftTypesText.length != 0) {
                                    $details.find(".aircraftType").text(aircraftTypesText.join(", "));
                                }

                                var $priceRange = $details.find(".priceRange");
                                if (request.maxPrice != null && request.minPrice != null) {
                                    $priceRange.text(request.minPrice + " - " + request.maxPrice)
                                }
                                else if (request.maxPrice != null) {
                                    $priceRange.text("max price" + request.maxPrice)
                                }
                                else if (request.minPrice != null) {
                                    $priceRange.text("min price" + request.minPrice)
                                }

                                var $status = $details.find(".requestStatus");
                                if (request.status == requestStatuses.pending) {
                                    $status.text("Pending");
                                }
                                else if (request.status == requestStatuses.canceled) {
                                    $status.text("Canceled");
                                }
                                else if (request.status == requestStatuses.completed) {
                                    $status.text("Completed");
                                }

                                $details.find(".requestDate").text(dateToString(request.createdOn, 'mm/dd/yyyy'));

                                app.utils.responseForm('#flightRequestDetails');
                            });

                            $requestsList.append($flightReq);
                        });

                        customScrollInit();
                    }
                });

                request.fail(function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);

                    alert('ops!! call failed :(');
                });
            }

            if (_this.flightsRequestsListTemplate == null) {
                $.get("/templates/flightsRequestsList.html?_=" + new Date().getTime(), function (flightsRequestsListTemplate) {
                    $.get("/templates/flightsRequestsListItem.html?_=" + new Date().getTime(), function (flightsRequestsListItemTemplate) {
                        _this.flightsRequestsListTemplate = flightsRequestsListTemplate;
                        _this.flightsRequestsListItemTemplate = flightsRequestsListItemTemplate;

                        setView(flightsRequestsListTemplate, flightsRequestsListItemTemplate);
                    });
                });
            }
            else {
                setView(_this.flightsRequestsListTemplate, _this.flightsRequestsListItemTemplate);
            }
        }

        adminModule.dashboard.initContainer(setFlightsRequetsView);
    };

}).apply(adminModule.flightRequests);

//network activities
(function () {
    this.networkActivitiesListTemplate = null;
    this.networkActivitiesListItemTemplate = null;

    this.init = function () {
        var _this = this;

        var setNetworkActivitiesView = function () {
            var setView = function () {
                var $networkActivitiesListTemplate = $($.parseHTML(_this.networkActivitiesListTemplate));

                var $tabContent = $(".dashboardBlock");

                $networkActivitiesListTemplate.find(".js-tabNavItem").click(function () {
                    if ($(this).data("id") == "flyers") {

                        $("#flyersList").remove();

                        $(".networkDashboard__content-item[data-id=flyers] .networkDashboard__table")
                            .append('<div class="networkDashboard__table-body js-customScroll" id="flyersList"></div>');

                        bindData(true, $tabContent);
                    }
                    else {

                        $("#aircraftProvidersList").remove();

                        $(".networkDashboard__content-item[data-id=aircraft-providers] .networkDashboard__table")
                            .append('<div class="networkDashboard__table-body js-customScroll" id="aircraftProvidersList"></div>');

                        bindData(false, $tabContent);
                    }
                });

                $networkActivitiesListTemplate.find("#newAircraftProvider").click(function () {

                });

                $tabContent.append($networkActivitiesListTemplate);

                tabsInit();

                bindData(true, $tabContent);
            };

            var bindData = function (showFlyers, $tabContent) {

                var request = $.ajax({
                    url: apiBaseUrl + 'accounts/list/' + (showFlyers ? userTypes.flyer : userTypes.aircraftProvider),
                    method: "GET",
                    crossDomain: true,
                    contentType: "application/json",
                    xhrFields: {
                        withCredentials: true
                    }
                });

                request.done(function (data, textStatus, xhr) {
                    if (xhr.status == 200) {

                        var $networkActivitiesListItemTemplate = $($.parseHTML(_this.networkActivitiesListItemTemplate));
                        var $accountsList;

                      if (showFlyers) {
                        $accountsList = $tabContent.find("#flyersList");
                        notifications = notifications.filter(notification => notification.text != "New Flyer");
                        $("#header__notification__count").text(notifications.length)
                      }
                      else {
                            $accountsList = $tabContent.find("#aircraftProvidersList");
                        }

                        $accountsList.children().remove();

                        $.each(data, function () {
                            var $account = $networkActivitiesListItemTemplate.clone();

                            $account.find(".accountNumber").text(this.number);
                            $account.find(".accountShortName").text(this.firstName + " " + this.lastName);
                            $account.find(".accountEmail").text(this.email);
                            $account.find(".accountMobile").text(this.mobile);
                            $account.find(".accountCreatedOn").text(dateToString(this.createdOn, "mm/dd/yyyy"));

                            $accountsList.append($account);
                        });

                        customScrollInit();
                    }
                });

                request.fail(function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);

                    alert('ops!! call failed :(');
                });
            }

            if (_this.networkActivitiesListTemplate == null) {
                $.get("/templates/admin/networkActivities.html?_=" + new Date().getTime(), function (networkActivitiesListTemplate) {
                    $.get("/templates/admin/networkActivitiesListItem.html?_=" + new Date().getTime(), function (networkActivitiesListItemTemplate) {
                        _this.networkActivitiesListTemplate = networkActivitiesListTemplate;
                        _this.networkActivitiesListItemTemplate = networkActivitiesListItemTemplate;

                        setView();
                    });
                });
            }
            else {
                setView();
            }
        }

        adminModule.dashboard.initContainer(setNetworkActivitiesView);
    };

}).apply(adminModule.networkActivities);

//bookings
(function () {
  this.newBookingsTemplate = null;
  this.newBookingsListItemTemplate = null;
  this.bookingDetailTemplate = null;

  this.init = function(confirmed, bookingType, alternative) {
    var _this = this;

    var setView = function(bookingData) {
      var prepareContent = function() {
        var $newBookingTemplate = $($.parseHTML(_this.newBookingsTemplate))
        var $newBookingListItemTemplate = $($.parseHTML(_this.newBookingsListItemTemplate))
        var $tabContent = $(".dashboardBlock");
        var $list = $($newBookingTemplate.find(".bookingDashboard__table-body"));
        $list.children().remove(); 
        $tabContent.append($newBookingTemplate);
        bindData($list, $newBookingListItemTemplate);
      }

      function bindData(container, content) {
        if (bookingData.length != 0) {
          $.each(bookingData, function() {
            let $li = content.clone();

            $li.attr("data-bookingId", this.id);
            $li.find(".bookingDashboard__table-name").text(`${this.createdBy}`);
            $li.find(".bookingDashboard__table-caption").text(`${this.number}`);
            $li.find(".bookingDashboard__table-date").text(`${this.createdOn.split("T")[0]}`)
            $li.find(".bookingDashboard__table-detail").click(() => {
              _this.newBookingsTemplate = null;
              _this.newBookingsListItemTemplate = null;
              $(".dashboardBlock__content").empty();
              renderDetails(this.id);
            })
            container.append($li);
          })

          customScrollInit();
          
        }
      }
      //render flight details
      const renderDetails = (id) => {
        $.get(`/templates/admin/adminBookingConfirm.html?=${new Date().getTime()}`, (detailTemplate) => {
          _this.bookingDetailTemplate = detailTemplate;
          $(".dashboardBlock__content").append(detailTemplate)
          tabsInit();
          customScrollInit();
        })
        const request = $.ajax({
          url: `${apiBaseUrl}bookings/final-booking-info/${id}`,
          method: "GET",
          crossDomain: true,
          contentType: "application/json",
          xhrFields: {
            withCredentials: true
          }
        })
        request.done(({ aircraft, bookingFlights, arrival, booking, departure, flight, model, provider, travelers }) => {
          const { tailNumber,  maxPassengers, pricePerHour } = aircraft;
          const { displayName: arrivalName } = arrival;
          const { displayName: departureName } = departure;
          const { id, bookingType, direction, totalExclusiveCost, totalFees, totalTaxes, flyer: { email, firstName, lastName } } = booking;
          const { departureDate, arrivalDate, number } = flight;
          const { name } = model;
          const { companyName } = provider;
          const [{ flight: outboundFlight }, ...rest] = bookingFlights
          $("#outbound-booking-flight-nav").attr("data-id", tailNumber);
          $("#outbound-tail-number").text(tailNumber);
          $("#outbound-booking-flight-confirmation").attr("data-id", tailNumber);
          $("#outbound-airport-departure").val(departureName);
          $("#outbound-airport-date").val(departureDate.split("T")[0]);
          $("#outbound-aircraft-provider").val(companyName);
          $("#outbound-departure-aircraft").val(name);
          $("#outbound-departure-pax").val(booking.numPax);
          $("#outbound-departure-max-pax").val(maxPassengers);

          $("#outbound-airport-arrival").val(arrivalName);
          $("#outbound-arrival-date").val(arrivalDate.split("T")[0]);
          $("#outbound-arrival-provider").val(companyName);
          $("#outbound-arrival-aircraft").val(name);
          $("#outbound-arrival-pax").val(maxPassengers);
          $("#total-booking-cost").val(`$${formatMoney(totalExclusiveCost)}`)
          
          if (travelers.length) {
            for (let i = 0 ; i < travelers.length ; i ++) {
              $("#travelers").append($(`<div>${travelers[i].firstName} ${travelers[i].lastName}</div>`))
            }
          } else {
          }

          //check if there's another flight after destructuring out the first flight
          if(!rest.length) {
            $("#inbound-departure").css({display: "none"})
            $("#inbound-arrival").css({display: "none"})
          } else {
            
            const [{ flight: { departureDate: arrivalFlightDeparture, arrivalDate: arrivalFlightArrival, departure: { displayName: arrivalDepartureName }, arrival: { displayName: arrivalArrivalName }, aircraft: { model: { name: arrivalModel } } } }] = rest
            $("#inbound-departure-airport").val(arrivalDepartureName)
            $("#inbound-departure-date").val(arrivalFlightDeparture.split("T")[0])
            $("#inbound-departure-aircraft-provider").val(companyName)
            $("#inbound-departure-aircraft").val(arrivalModel)
            $("#inbound-departure-pax").val(maxPassengers)

            $("#inbound-arrival-airport").val(arrivalArrivalName)
            $("#inbound-arrival-date").val(arrivalFlightArrival.split("T")[0])
            $("#inbound-arrival-aircraft").val(arrivalModel)
            $("#inbound-arrival-aircraft-provider").val(companyName)
            $("#inbound-arrival-pax").val(maxPassengers)
          }

          //TODO
          //1. if any edits need to be made, make them, then save them to db.
          //2. clicking the confirm button sends an email to the flyer
          const submit = $("#start-checkout");
          submit.click(() => {
            const request = confirmBookingAndCharge(id, email, firstName, lastName);
            request.done((data) => {
              showSuccessMessage('Booking Confirmation Sent', 'Flyer is confirming');
            })
            request.fail((err) => {
              console.log('nonono', err)
            })
          })
        })

        request.fail((err) => {
          console.log('we didn\'t do it...', err)
        })
      }

      if (_this.newBookingsTemplate == null) {
        $.get(`/templates/admin/bookingList.html?_=${new Date().getTime()}`, (bookingListTemplate) => {
          $.get(`/templates/admin/bookingListItem.html?_=${new Date().getTime()}`, (bookingListItemTemplate) => {
            _this.newBookingsTemplate = bookingListTemplate;
            _this.newBookingsListItemTemplate = bookingListItemTemplate;
            prepareContent();
          })
        })
      } else {
        prepareContent();
      }

    }
      var getBookingsToRender = function() {
        const request = $.ajax({
          url: `${apiBaseUrl}bookings/list/${confirmed ? 'confirmed/' : ''}${bookingType}/${alternative}`,
          method: "GET",
          crossDomain: true,
          contentType: "application/json",
          xhrFields: {
            withCredentials: true
          }
        });

        request.done((data, textStatus, xhr) => {
          if (xhr.status == 200) {
            setView(data);
            notifications = notifications.filter(notification => notification.text != "New Booking");
            $("#header__notification__count").text(notifications.length);
          }
        })

        request.fail((jqXHR, textStatus) => {
          console.log("nonononono", jqXHR);
          console.log(textStatus)
        })
      }
    // this sends the email to the flyer
    var confirmBookingAndCharge = (bookingId, email, firstName, lastName) => {
      return $.ajax({
        url: `${apiBaseUrl}bookings/finalize`,
        method: "POST",
        data: JSON.stringify({
          bookingId,
          email,
          firstName,
          lastName
        }),
        contentType: "application/json",
        xhrFields: {
          withCredentials: true
        }
      })
    }

    //build a renderer for specific flight details

    adminModule.dashboard.initContainer(getBookingsToRender);
  }
}).apply(adminModule.bookings);

//aircraft providers signup requests
(function () {
    this.signupRequestsTemplate = null;

    this.init = function () {
        var _this = this;

        var setView = function (aircraftProvidersData) {
            var prepareContent = function () {
                var $signupRequestsTemplate = _this.signupRequestsTemplate.clone();

                var $tabContent = $(".dashboardBlock");

                var $list = $($signupRequestsTemplate.find(".signUpDashboard__table-body"));
                var $listItem = $($list.find(".signUpDashboard__table-row"));

                $list.children().remove();
                
                $tabContent.append($signupRequestsTemplate);

                bindData($list, $listItem);

            };

            var bindData = function ($list, $listItem) {
                if (aircraftProvidersData.length != 0) {

                    $.each(aircraftProvidersData, function () {
                        var $li = $listItem.clone();

                        $li.attr("data-accId", this.id);
                        $li.find(".accountNumber").text(this.number);
                        $li.find(".accountFullName").text(this.firstName + ' ' + this.lastName);
                        $li.find(".accountEmail").text(this.email);
                        $li.find(".accountMobile").text(this.mobile);
                        $li.find(".accountCompany").text(this.companyName);
                        $li.find(".accountCreatedOn").text(dateToString(this.createdOn, "mm/dd/yyyy"));
                        $li.find(".accountRequestInfo").attr("href", "mailto:" + this.email);

                        $list.append($li);
                    });

                    $list.find(".accountAccept").click(function () {
                        adminModule.aircraftProvidersSignupRequests.acceptSignupRequest($(this).closest(".signUpDashboard__table-row").attr("data-accId"));
                    });

                  $(".js-acc-title").click(function() {

                    var $item = $(this).closest('.js-acc-item'),
                      $items = $('.js-acc-item'),
                      $content = $item.find('.signUpDashboard__table-row-control'),
                      $contents = $('.js-acc-content');

                    $items.not($item).removeClass('open mutation');
                    $contents.not($content).stop().slideUp(250);

                    if (!$item.hasClass('open')) {
                      $item.addClass('mutation');
                      $content.stop().slideDown(250, function () {
                        $item.addClass('open');
                      });
                    } else {
                      $item.removeClass('open mutation');
                      $content.stop().slideUp(250);
                    }
                  })
                  
                  $('.js-acc-close').click(function(event) {
                    if ($(event.target).closest('.js-acc-item').length != 0) return;

                    $('.js-acc-item').removeClass('open mutation');
                    $('.js-acc-content').stop().slideUp(400);
                  })

                    customScrollInit();
                }
            }

            if (_this.networkActivitiesListTemplate == null) {
                $.get("/templates/admin/aircraftProvidersSignupRequests.html?_=" + new Date().getTime(), function (template) {
                    _this.signupRequestsTemplate = $($.parseHTML(template));

                    prepareContent();
                });
            }
            else {
                prepareContent();
            }
        }

        var getData = function () {

            var request = $.ajax({
                url: apiBaseUrl + 'accounts/apsPendingApproval',
                method: "GET",
                crossDomain: true,
                contentType: "application/json",
                xhrFields: {
                    withCredentials: true
                }
            });

            request.done(function (data, textStatus, xhr) {
                if (xhr.status == 200) {
                    setView(data);
                    notifications = notifications.filter(notification => notification.text != "New Aircraft Provider");
                    $("#header__notification__count").text(notifications.length)

                }
            });

            request.fail(function (jqXHR, textStatus) {
                console.log(jqXHR);
                console.log(textStatus);

                alert('ops!! call failed :(');
            });
        }

        adminModule.dashboard.initContainer(getData);
    };

    this.acceptSignupRequest = function (accountId) {
        var onSuccess = function (returnedData, textStatus, xhr) {
            if (xhr.status == 200) {
                $(".signUpDashboard__table-row[data-accId=" + accountId + "]").remove();

                showSuccessMessage('Request Accepted', 'The aircraft provider is accepted successfully');
            }
        };

        var onFail = function (jqXHR, textStatus) {
            console.log(jqXHR);
            console.log(textStatus);

            alert('ops!! call failed :(');
        };

        var requestData = {
            accountId: accountId
        };

        execAjaxCall("accounts/acceptSignupRequest", "POST", requestData, onSuccess, onFail);
    };

}).apply(adminModule.aircraftProvidersSignupRequests);

/*******************************Admin Module End****************************************/

/*******************************Aircraft Provider Module  Start****************************************/

var aircraftProviderModule = aircraftProviderModule || {};

aircraftProviderModule.dashboard = {};
aircraftProviderModule.profile = {};
aircraftProviderModule.aircrafts = {};
aircraftProviderModule.availability = {};
aircraftProviderModule.flightsAvailability = {};
aircraftProviderModule.bookings = {};
aircraftProviderModule.flights = {};


//dashbaord
(function () {
    this.innerTemplate = null;
    this.dashboardTemplate = null;

    this.initContainer = function (callback, activateDashbaordTab = false) {

        var $dashboardBlockAdmin = $container.find(".dashboardBlock--provider");

        if ($dashboardBlockAdmin.length != 0) {
            $dashboardBlockAdmin.find(".dashboardBlock__content").remove();

            if (activateDashbaordTab) {
                $dashboardBlockAdmin.find(".dashboardBlock__nav-item--active").removeClass("dashboardBlock__nav-item--active");

                $dashboardBlockAdmin.find(".dashboardBlock__nav-item[data-tab=dashboard]").addClass("dashboardBlock__nav-item--active");
            }

            callback();
            return;
        }

        var setView = function (template) {
            var $template = $($.parseHTML(template)).clone();

            $("#flyerHeaderMenue, #adminHeaderMenue").remove();

            $container.html($template);

            $(".dashboardBlock__nav-item, #aircraftProviderHeadrMenue .header__login-menu-list-item").click(function () {
                var $dashboardBlockAdmin = $(".dashboardBlock--provider");

                $dashboardBlockAdmin.find(".dashboardBlock__nav-item--active").removeClass("dashboardBlock__nav-item--active");

                $dashboardBlockAdmin.find(".dashboardBlock__nav-item[data-tab=" + $(this).data("tab") + "]").addClass("dashboardBlock__nav-item--active");

                switch ($(this).data("tab")) {
                    case "dashboard":
                        aircraftProviderModule.dashboard.init();
                        break;
                    case "profile":
                        aircraftProviderModule.profile.init();
                        break;
                    case "settings":
                        commonModule.settings.init();
                        break;
                    case "aircrafts":
                        aircraftProviderModule.aircrafts.init();
                        break;
                    case "charterUploads":
                        aircraftProviderModule.availability.init();
                        break;
                    case "flightUploads":
                        aircraftProviderModule.flightsAvailability.init();
                        break;
                    case "reservations":
                      aircraftProviderModule.bookings.init(bookingTypes.charterAircraftSeat, bookingTypes.charterFlightSeat)
                    break
                    case "bookings":
                        aircraftProviderModule.bookings.init(bookingTypes.charterAircraft, bookingTypes.charterFlight);
                        break;
                    case "flights":
                        aircraftProviderModule.flights.init();
                        break;
                    case "payMethods":
                        commonModule.paymentMethods.init();
                        break;
                    default:
                        break;
                }
            });
        };

        if (this.innerTemplate == null) {
            $.get("/templates/aircraftProvider/inner.html?_=" + new Date().getTime(), function (template) {
                this.innerTemplate = template;

                setView(this.innerTemplate);
                callback();
            });
        }
        else {
            setView(this.innerTemplate);
            callback();
        }
    };

    this.init = function () {
        var _this = this;

        var setDashboardView = function () {

            var setView = function (template) {
                var $template = $($.parseHTML(template));

                var $tabContent = $(".dashboardBlock");

                $tabContent.append($template);

                customScrollInit();
            };

            if (_this.dashboardTemplate == null) {
                $.get("/templates/aircraftProvider/dashboard.html?_=" + new Date().getTime(), function (template) {
                    _this.dashboardTemplate = template;

                    setView(_this.dashboardTemplate);
                });
            }
            else {
                setView(_this.dashboardTemplate);
            }

        };

        this.initContainer(setDashboardView, true);
    };

}).apply(aircraftProviderModule.dashboard);

//profile
(function () {
    this.profileTemplate = null;

    this.init = function () {
        var _this = this;

        var setProfileView = function (profileData) {

            var setView = function () {
                var $profileTemplate = _this.profileTemplate.clone();
                var $form = $profileTemplate.find("#providerProfileForm");

                var today = new Date();
                $form.find('.js-datepicker').datepicker({
                    showAnim: 'fade',
                    changeMonth: true,
                    changeYear: true,
                    yearRange: (today.getFullYear() - 100) + ":" + today.getFullYear()
                });

                var $editBtn = $form.find('.js-editForm');

                $editBtn.on('click', function () {
                    $form.addClass('editField showSubmit');
                });

                $form.find("#saveProfile").click(function () {
                    _this.update($form);
                });

                $form.find("#firstName").val(profileData.firstName);
                $form.find("#middleName").val(profileData.middleName);
                $form.find("#lastName").val(profileData.lastName);
                $form.find("#dateOfBirth").datepicker('setDate', new Date(profileData.dateOfBirth));
                $form.find("#email").val(profileData.email);
                $form.find("#mobile").val(profileData.mobile);
                $form.find("#companyName").val(profileData.companyName);
                $form.find("#companyAddress").val(profileData.companyAddress);
                $form.find("#companyEmail").val(profileData.companyEmail);
                $form.find("#companyPhone").val(profileData.companyPhone);

                var $tabContent = $(".dashboardBlock");

                $tabContent.find(".dashboardBlock__content").remove();
                $tabContent.append($profileTemplate);
            };

            if (_this.profileTemplate == null) {
                $.get("/templates/aircraftProvider/profile.html?_=" + new Date().getTime(), function (template) {
                    _this.profileTemplate = $($.parseHTML(template));

                    setView();
                });
            }
            else {
                setView();
            }

        };

        var getData = function () {

            var onSuccess = function (returnedData, textStatus, xhr) {
                if (xhr.status == 200) {
                    setProfileView(returnedData);
                }
            };

            var onFail = function (jqXHR, textStatus) {
                console.log(jqXHR);
                console.log(textStatus);

                alert('ops!! call failed :(');
            };

            execAjaxCall("accounts/get", "GET", null, onSuccess, onFail);

        }

        aircraftProviderModule.dashboard.initContainer(getData);
    };

    this.update = function ($form) {
        $form.addClass('loading');
        $form.find('input, button, textarea, select').attr('disabled', 'disabled');

        var profileData = {
            firstName: $form.find("#firstName").val(),
            middleName: $form.find("#middleName").val(),
            lastName: $form.find("#lastName").val(),
            dateOfBirth: $form.find("#dateOfBirth").val(),
            email: $form.find("#email").val(),
            mobile: $form.find("#mobile").val(),
            companyName: $form.find("#companyName").val(),
            companyAddress: $form.find("#companyAddress").val(),
            companyEmail: $form.find("#companyEmail").val(),
            companyPhone: $form.find("#companyPhone").val()
        };


        var onSuccess = function (data, textStatus, xhr) {
            if (xhr.status == 200) {
                $form.find('input, button, textarea, select').removeAttr('disabled', 'disabled');
                $form.addClass('loading').removeClass('editField showSubmit');
                showSuccessMessage('Profile Updated', 'Your profile has been updated successfully');
            }
        };

        var onFail = function (jqXHR, textStatus) {
            $form.removeClass('loading');
            $form.find('input, button, textarea, select').removeAttr('disabled');

            console.log(jqXHR);
            console.log(textStatus);

            alert('ops!! call failed :(');
        };

        execAjaxCall("accounts/update", "POST", profileData, onSuccess, onFail);

    };

}).apply(aircraftProviderModule.profile);

//aircrafts
(function () {
    this.aircraftsListTemplate = null;
    this.aircraftsListItemTemplate = null;
    this.aircraftDetailsTemplate = null;

    this.init = function () {
        var _this = this;

        var setAircraftView = function () {

            var setView = function () {
                var $aircraftsListTemplate = _this.aircraftsListTemplate;

                var $tabContent = $(".dashboardBlock");

                $aircraftsListTemplate.find("#newAircraft").click(function () {
                    aircraftProviderModule.aircrafts.new();
                });

                $tabContent.append($aircraftsListTemplate);

                bindData($tabContent);
            };

            if (_this.aircraftsListTemplate == null) {
                $.get("/templates/aircraftProvider/aircrafts.html?_=" + new Date().getTime(), function (aircraftsListTemplate) {
                    _this.aircraftsListTemplate = $($.parseHTML(aircraftsListTemplate));
                    _this.aircraftsListItemTemplate = $(_this.aircraftsListTemplate.find(".bookingDashboard__table-row"));

                    $(_this.aircraftsListTemplate.find(".bookingDashboard__table-body")).children().remove();

                    setView();
                });
            }
            else {
                setView();
            }

        };

        var bindData = function ($tabContent) {

            var onSuccess = function (returnedData, textStatus, xhr) {
                if (xhr.status == 200) {
                    $aircraftsList = $($tabContent.find(".bookingDashboard__table-body"));

                    $aircraftsList.children().remove();

                    $.each(returnedData, function () {
                        var $aircraft = _this.aircraftsListItemTemplate.clone();

                        $aircraft.find(".aircraftNumber").text(this.tailNumber);
                        $aircraft.find(".aircraftModel").text(this.modelName);
                        $aircraft.find(".aircraftType").prepend(this.typeName);
                        $aircraft.find(".bookingDashboard__table-detail").data("id", this.aircraftId);

                        $aircraftsList.append($aircraft);
                    });

                    customScrollInit();

                    $tabContent.find(".bookingDashboard__table-detail").click(function () {
                        editAircraft($(this).data("id"));
                    });
                }
            };

            var onFail = function (jqXHR, textStatus) {
                console.log(jqXHR);
                console.log(textStatus);

                alert('ops!! call failed :(');
            };

            execAjaxCall("aircrafts/list", "GET", null, onSuccess, onFail);

        }

        aircraftProviderModule.dashboard.initContainer(setAircraftView);
    }

    this.new = function () {
        editAircraft(null);
    };

    this.edit = function (aircraftId) {
        editAircraft(aircraftId);
    };

    this.save = function (aircraftId) {

        var $tabContent = $(".dashboardBlock");
        var $form = $tabContent.find("#fleetForm");

        var isValid = $form.valid();

        if (isValid == false) {
            return;
        }
            
        $form.addClass('loading');
        $form.find('input, button, textarea, select').attr('disabled', 'disabled');

        var tailNumber = $tabContent.find("#tailNumber").val();
        var modelId = $tabContent.find("#aircraftsModelId").val();
        var typeId = $tabContent.find("#aircraftsTypeId").val();
        var homebaseId = $tabContent.find("#homebaseId").val();
        var argusSafetyRating = $tabContent.find("#argusSafetyRating").val();
        var wyvernSafetyRating = $tabContent.find("#wyvernSafetyRating").val();
        var yearOfMan = $tabContent.find("#yearOfMan").val();
        var lastIntRefurbish = $tabContent.find("#lastIntRefurbish").val();
        var lastExtRefurbish = $tabContent.find("#lastExtRefurbish").val();
        var maxPax = $tabContent.find("#maxPax").val();
        var hoursFlown = $tabContent.find("#hoursFlown").val();
        var speed = $tabContent.find("#speed").val();
        var range = $tabContent.find("#range").val();
        var cargoCapability = $tabContent.find("#cargoCapability").val();
        var wifi = $tabContent.find("input[name=wifi]:checked").val();
        var television = $tabContent.find("input[name=tv]:checked").val();
        var televisionsNum = $tabContent.find("#tvCount").val();
        var pricePerHour = $tabContent.find("#pricePerHour").val();
        var bookableDemo = $tabContent.find("input[name=bookableDemo]:checked").val();

        if (television == "no") televisionsNum = null;

        var photos = [];

        $.each($tabContent.find(".js-aircraftPhotos .swiper-slide"), function () {
            var dataId = $(this).data("id");
            var photoName = $tabContent.find(".js-aircraftPhotos-caption[data-id=" + dataId + "]").data("name");
            var photo = $(this).find("input[name=photo]")[0];

            if (photo.files.length != 0) {
                photos.push({
                    name: photoName,
                    file: photo.files[0],
                    order: dataId
                });
            }
        });

        var airwothinessCertificate = $tabContent.find("#airwothinessCertificate")[0];
        var insuranceDocuments = $tabContent.find("#insuranceDocuments")[0];

        var saveAircraft = function (aircraftId, tailNumber, modelId, typeId, homebaseId, argusSafetyRating,
            wyvernSafetyRating, yearOfMan, lastIntRefurbish, lastExtRefurbish, maxPax, hoursFlown, speed, range,
            cargoCapability, wifi, bookableDemo, televisionsNum, pricePerHour, savedPhotos, savedDocuments) {

            var onFail = function (jqXHR, textStatus) {
                $form.removeClass('loading');
                $form.find('input, button, textarea, select').removeAttr('disabled');

                console.log(jqXHR);
                console.log(textStatus);

                alert('ops!! call failed :(');
            };

            var onSuccess = function (returnedData, textStatus, xhr) {
                if (xhr.status == 200) {
                    $form.removeClass('loading');
                    $form.find('input, button, textarea, select').removeAttr('disabled');

                    showSuccessMessage('Aircraft Created', 'The aircraft has been created successfully');

                    aircraftProviderModule.aircrafts.init();
                }
            };

            var aircraftData = {
                aircraftId: aircraftId,
                tailNumber: tailNumber,
                modelId: modelId,
                typeId: typeId,
                homebaseId: homebaseId,
                argusSafetyRating: argusSafetyRating,
                wyvernSafetyRating: wyvernSafetyRating,
                manufactureYear: yearOfMan,
                lastIntRefurbish: lastIntRefurbish,
                lastExtRefurbish: lastExtRefurbish,
                MaxPassengers: maxPax,
                hoursFlown: hoursFlown,
                speed: speed,
                range: range,
                cargoCapability: cargoCapability,
                wifi: wifi,
                bookableDemo: bookableDemo,
                numberOfTelevision: televisionsNum,
                pricePerHour: pricePerHour,
                images: savedPhotos,
                documents: savedDocuments
            };

            execAjaxCall("aircrafts/save", "POST", aircraftData, onSuccess, onFail);
        };

        var uploadPhoto = function (name, file, order) {
            var formData = new FormData();

            formData.append("Name", name);
            formData.append("File", file);
            formData.append("Order", order);

            $.ajax({
                method: "POST",
                url: apiBaseUrl + "aircrafts/uploadphoto",
                data: formData,
                processData: false,
                contentType: false,
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                },
                success: function (data) {

                    savedPhotos.push({
                        name: name,
                        fileName: data.fileName,
                        order: order
                    });

                    if (photosIndex <= photos.length - 1) {
                        var photo = photos[photosIndex];
                        photosIndex++;

                        uploadPhoto(photo.name, photo.file, photo.order);
                    }
                    else {

                        $.each(airwothinessCertificate.files, function () {
                            documentsToUpload.push({
                                file: this,
                                type: aircraftDocumentTypes.airwothinessCertificate
                            });
                        });

                        $.each(insuranceDocuments.files, function () {
                            documentsToUpload.push({
                                file: this,
                                type: aircraftDocumentTypes.insuranceDocument
                            });
                        });

                        if (documentsToUpload.length != 0) {
                            uploadFiles = true;

                            var document = documentsToUpload[documentsIndex];
                            documentsIndex++;

                            uploadDocument(document.file, document.type);
                        }
                        else {
                            saveAircraft(aircraftId, tailNumber, modelId, typeId, homebaseId, argusSafetyRating,
                                wyvernSafetyRating, yearOfMan, lastIntRefurbish, lastExtRefurbish, maxPax, hoursFlown,
                                speed, range, cargoCapability, wifi, bookableDemo, televisionsNum, pricePerHour, savedPhotos, savedDocuments);
                        }
                    }

                },
                error: function (e) {

                    //alert("files upload error");

                }
            });
        }

        var uploadDocument = function (file, type) {
            var formData = new FormData();

            formData.append("File", file);
            formData.append("Name", "");

            $.ajax({
                method: "POST",
                url: apiBaseUrl + "aircrafts/uploaddocument",
                data: formData,
                processData: false,
                contentType: false,
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                },
                success: function (data) {

                    savedDocuments.push({
                        fileName: data.fileName,
                        type: type
                    });

                    if (documentsIndex <= documentsToUpload.length - 1) {
                        var document = documentsToUpload[documentsIndex];
                        documentsIndex++;

                        uploadDocument(document.file, document.type);
                    }
                    else {
                        saveAircraft(aircraftId, tailNumber, modelId, typeId, homebaseId, argusSafetyRating,
                            wyvernSafetyRating, yearOfMan, lastIntRefurbish, lastExtRefurbish, maxPax, hoursFlown,
                            speed, range, cargoCapability, wifi, bookableDemo, televisionsNum, pricePerHour, savedPhotos, savedDocuments);
                    }

                },
                error: function (e) {

                    //alert("files upload error");

                }
            });
        }

        var uploadFiles = false;
        var photosIndex = 0;
        var savedPhotos = [];
        var documentsIndex = 0;
        var savedDocuments = [];
        var documentsToUpload = [];

        //upload files
        if (photos.length != 0) {
            uploadFiles = true;

            var photo = photos[photosIndex];
            photosIndex++;

            uploadPhoto(photo.name, photo.file, photo.order);
        }
        else {
            $.each(airwothinessCertificate.files, function () {
                documentsToUpload.push({
                    file: this,
                    type: aircraftDocumentTypes.airwothinessCertificate
                });
            });

            $.each(insuranceDocuments.files, function () {
                documentsToUpload.push({
                    file: this,
                    type: aircraftDocumentTypes.insuranceDocument
                });
            });

            if (documentsToUpload.length != 0) {
                uploadFiles = true;

                var document = documentsToUpload[documentsIndex];
                documentsIndex++;

                uploadDocument(document.file, document.type);
            }
        }

        if (uploadFiles == false) {
            saveAircraft(aircraftId, tailNumber, modelId, typeId, homebaseId, argusSafetyRating,
                wyvernSafetyRating, yearOfMan, lastIntRefurbish, lastExtRefurbish, maxPax, hoursFlown,
                speed, range, cargoCapability, wifi, bookableDemo, televisionsNum, pricePerHour, savedPhotos, savedDocuments);
        }
    };

    var editAircraft = function (aircraftId) {
        var _this = this;
        var _aircraftId = aircraftId;

        var setAircraftsView = function () {

            var setView = function () {
                var $aircraftTemplate = $($.parseHTML(_this.aircraftTemplate));
                var $tabContent = $(".dashboardBlock");

                $aircraftTemplate.find("#saveAircraft").click(function () {
                    aircraftProviderModule.aircrafts.save(_aircraftId);
                });

                $tabContent.append($aircraftTemplate);

                var $form = $tabContent.find("#fleetForm");

                var validator = $form.validate({
                    rules: {
                        tvCount: {
                            required: function () {
                                return $("input[name=tv]:checked").val() == "yes";
                            }
                        }
                    },
                    messages: {
                    }
                });

                fleetDashboardSlider();
                fleetDashboardForm();
                radioChange();
                bindData($tabContent);
            };

            if (_this.aircraftTemplate == null) {
                $.get("/templates/aircraftProvider/aircraftDetails.html?_=" + new Date().getTime(), function (aircraftTemplate) {
                    _this.aircraftTemplate = aircraftTemplate;

                    setView();
                });
            }
            else {
                setView(_this.aircraftTemplate);
            }

        };

        var bindData = function ($tabContent) {
            var onFail = function (jqXHR, textStatus) {
                console.log(jqXHR);
                console.log(textStatus);

                alert('ops!! call failed :(');
            };

            var onGetAircraftSuccess = function (returnedData, textStatus, xhr) {
                if (xhr.status == 200) {

                    var aircraftData = returnedData;

                    $tabContent.find("#tailNumber").val(aircraftData.tailNumber);
                    $tabContent.find("input[name=aircraftsModels]").val(aircraftData.modelName);
                    $tabContent.find("#aircraftsModelId").val(aircraftData.modelId);
                    $tabContent.find("input[name=aircraftsTypes]").val(aircraftData.typeName);
                    $tabContent.find("#aircraftsTypeId").val(aircraftData.typeId);
                    $tabContent.find("input[name=homebase]").val(aircraftData.homebaseName);
                    $tabContent.find("#homebaseId").val(aircraftData.homebaseId);
                    $tabContent.find("#argusSafetyRating").val(aircraftData.argusSafetyRating);
                    $tabContent.find("#wyvernSafetyRating").val(aircraftData.wyvernSafetyRating);
                    $tabContent.find("#yearOfMan").val(aircraftData.manufactureYear);
                    $tabContent.find("#lastIntRefurbish").val(aircraftData.lastIntRefurbish);
                    $tabContent.find("#lastExtRefurbish").val(aircraftData.lastExtRefurbish);
                    $tabContent.find("#maxPax").val(aircraftData.maxPassengers);
                    $tabContent.find("#hoursFlown").val(aircraftData.hoursFlown);
                    $tabContent.find("#speed").val(aircraftData.speed);
                    $tabContent.find("#range").val(aircraftData.range);
                    $tabContent.find("#cargoCapability").val(aircraftData.cargoCapability);
                      $tabContent.find("#removeAircraft").click(() => {
                        const request = $.ajax({
                          url: `${apiBaseUrl}aircrafts/availability/remove`,
                          method: "PATCH",
                          data: JSON.stringify({
                            aircraftId: aircraftData.aircraftId
                          }),
                          contentType: 'application/json',
                          crossDomain: true,
                          xhrFields: {
                            withCredentials: true
                          }
                        });

                        request.done((data) => {
                          aircraftProviderModule.aircrafts.init()
                        })
                        request.fail(err => {
                          showSuccessMessage("Something Went Wrong!", "We apologize. Please Try Again")
                        })
                      });

                    if (aircraftData.wifi == true) {
                        $tabContent.find("#wifi-yes").prop("checked", true)
                        $tabContent.find("#wifi-no").prop("checked", false)
                    }
                    else {
                        $tabContent.find("#wifi-no").prop("checked", true)
                        $tabContent.find("#wifi-yes").prop("checked", false)
                    }

                    if (aircraftData.bookableDemo == true) {
                        $tabContent.find("#bookableDemo-yes").prop("checked", true)
                        $tabContent.find("#bookableDemo-no").prop("checked", false)
                    }
                    else {
                        $tabContent.find("#bookableDemo-no").prop("checked", true)
                        $tabContent.find("#bookableDemo-yes").prop("checked", false)

                    }

                    if (aircraftData.numberOfTelevision != null && aircraftData.numberOfTelevision > 0) {
                        $tabContent.find("#tvCount").val(aircraftData.numberOfTelevision);
                    }
                    else {
                    }

                    $tabContent.find("#pricePerHour").val(aircraftData.pricePerHour);

                    if (aircraftData.images != null && aircraftData.images.length != 0) {
                        $.each(aircraftData.images, function () {
                            var navItem = $($tabContent.find(".fleetDashboard__photos-list-item[data-name='" + this.name + "']"));
                            var sliderItem = $($tabContent.find(".swiper-slide[data-id=" + navItem.data("id") + "]"));

                            navItem.addClass("valid");

                            $(sliderItem.find(".form__file--photos")).css("visibility", "hidden");

                            var image = $(sliderItem.find(".fleetDashboard__photos-slider-img"));

                            image.attr("href", this.url);
                            image.css("background-image", "url(" + this.url + ")");
                        });
                    }

                    customSelectInit();
                    customScrollInit();
                }
            };

            var locations = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                remote: {
                    url: apiBaseUrl + 'locations/search/tree/2' + '/true/%QUERY',
                    wildcard: '%QUERY'
                }
            });

            $tabContent.find("#homebase").typeahead(null, {
                name: 'homebaseLocation',
                display: 'name',
                source: locations,
                minLength: 2,
                limit: 10
            }).bind("typeahead:selected", function (obj, datum, name) {
                $tabContent.find("#homebaseId").val(datum.id);
            });

            var types = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                remote: {
                    url: apiBaseUrl + 'aircrafts/types/%QUERY',
                    wildcard: '%QUERY'
                }
            });

            $tabContent.find("#aircraftsTypes").typeahead(null, {
                name: 'types',
                display: 'name',
                source: types,
                minLength: 2,
                limit: 10
            }).bind("typeahead:selected", function (obj, datum, name) {
                $tabContent.find("#aircraftsTypeId").val(datum.id);

                models.remote.url = apiBaseUrl + 'aircrafts/models/' + datum.id + '/%QUERY';
            });

            var models = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                remote: {
                    url: apiBaseUrl + 'aircrafts/models/' + $($tabContent.find("#aircraftsTypeId")).val() + '/%QUERY',
                    wildcard: '%QUERY'
                }
            });

            $tabContent.find("#aircraftsModels").typeahead(null, {
                name: 'models',
                display: 'name',
                source: models,
                minLength: 2,
                limit: 10
            }).bind("typeahead:selected", function (obj, datum, name) {
                $tabContent.find("#aircraftsModelId").val(datum.id);
            });

            if (_aircraftId != null) {
                execAjaxCall("aircrafts/" + _aircraftId, "GET", null, onGetAircraftSuccess, onFail);
            }
            else {
                customSelectInit();
                customScrollInit();
            }
        }

        aircraftProviderModule.dashboard.initContainer(setAircraftsView);
    }

}).apply(aircraftProviderModule.aircrafts);

//availability
(function () {
    this.availabilityListTemplate = null;
    this.availabilityListItemTemplate = null;
    this.availabilityDetailsTemplate = null;

    this.init = function () {
        var _this = this;

        var setAvailabilityView = function () {

            var setView = function () {
                var $availabilityListTemplate = _this.availabilityListTemplate;

                var $tabContent = $(".dashboardBlock");

                $availabilityListTemplate.find("#newAvailability").click(function () {
                    aircraftProviderModule.availability.new();
                });

                $tabContent.append($availabilityListTemplate);

                bindData($tabContent);
            };

            if (_this.availabilityTemplate == null) {
                $.get("/templates/aircraftProvider/availability.html?_=" + new Date().getTime(), function (availabilityListTemplate) {
                    _this.availabilityListTemplate = $($.parseHTML(availabilityListTemplate));
                    _this.availabilityListItemTemplate = $(_this.availabilityListTemplate.find(".bookingDashboard__table-row"));

                    $(_this.availabilityListTemplate.find(".bookingDashboard__table-body")).children().remove();

                    setView();
                });
            }
            else {
                setView();
            }

        };

        var bindData = function ($tabContent) {

            var onSuccess = function (returnedData, textStatus, xhr) {
                if (xhr.status == 200) {

                    $availabilityList = $($tabContent.find(".bookingDashboard__table-body"));

                    $availabilityList.children().remove();

                    $.each(returnedData, function () {
                        var $availability = _this.availabilityListItemTemplate.clone();

                        $availability.find(".aircraftNumber").text(this.aircraftNumber);
                        $availability.find(".aircraftModel").text(this.aircraftModel);
                        $availability.find(".aircraftType").prepend(this.aircraftType);
                        $availability.find(".bookingDashboard__table-detail").data("id", this.availabilityId);

                        $availabilityList.append($availability);
                    });

                    customScrollInit();

                    $tabContent.find(".bookingDashboard__table-detail").click(function () {
                        editAvailability($(this).data("id"));
                    });
                }
            };

          var onFail = function (jqXHR, textStatus) {
            console.log(jqXHR);
            console.log(textStatus);

            showSuccessMessage("Something Went Wrong!", "We apologize. Please Try Again")
          };

            execAjaxCall("aircrafts/availability/list", "GET", null, onSuccess, onFail);

        }

        aircraftProviderModule.dashboard.initContainer(setAvailabilityView);
    }

    this.new = function () {
        editAvailability(null);
    };

    this.edit = function (availabilityId) {
        editAvailability(availabilityId);
    };

    this.save = function () {


    };

    var editAvailability = function (availabilityId) {
        var _this = this;
        var _availabilityId = availabilityId;

        var setAvailabilityView = function () {
            var $tabContent = $(".dashboardBlock");

            var setView = function () {
                var $availabilityDetailsTemplate = $($.parseHTML(_this.availabilityDetailsTemplate));

              $availabilityDetailsTemplate.find("#removeAvailability").click(function() {
                const request = $.ajax({
                  url: `${apiBaseUrl}aircrafts/availability/remove-availability`,
                  method: "PATCH",
                  data: JSON.stringify({
                    availabilityId: _availabilityId
                  }),
                  crossOrigin: true,
                  contentType: "application/json",
                  xhrFields: {
                    withCredentials: true
                  }
                })

                request.done(data => {
                  aircraftProviderModule.availability.init();
                })

                request.fail(err => {
                  console.log('err', err)
                })
              })

                $availabilityDetailsTemplate.find("#saveAvailability").click(function () {
                    var aircraftId = $tabContent.find("#aircrafts").val();
                    var reroutingRadius = $tabContent.find("#reroutingRadius").val();
                    var pricePerHour = $tabContent.find("#pricePerHour").val();
                    var minPrice = $tabContent.find("#minPrice").val();
                    var departures = [];
                    var arrivals = [];
                    var periods = [];

                    $.each($tabContent.find("input[name=departure]"), function () {
                        departures.push({
                            locationTreeId: $(this).data("locid")
                        });
                    });

                    $.each($tabContent.find("input[name=arrival]"), function () {
                        arrivals.push({
                            locationTreeId: $(this).data("locid")
                        });
                    });

                    $.each($tabContent.find("input[name=period]"), function () {
                        var period = $(this).val().split(" - ");

                        periods.push({
                            from: period[0],
                            to: period[1],
                        });
                    });

                    var onSuccess = function (returnedData, textStatus, xhr) {
                        aircraftProviderModule.availability.init();
                    };

                    var onFail = function (jqXHR, textStatus) {
                        console.log(jqXHR);
                      console.log(textStatus);

                      showSuccessMessage("Something Went Wrong!", "We apologize. Please Try Again")
                    };

                  var availabilityData = {
                    aircraftAvailabilityId: _availabilityId,
                    aircraftId: aircraftId,
                    reroutingRadius: reroutingRadius,
                    pricePerHour: pricePerHour,
                    minimumAcceptablePrice: minPrice,
                    departureLocations: departures,
                    arrivalLocations: arrivals,
                    periods: periods,
                    sellCharterSeat: 1 //TODO
                  };

                  execAjaxCall("aircrafts/availability/save", "POST", availabilityData, onSuccess, onFail);

                  availabilityFormInit();

                });

                //- add departure/landing field
                $availabilityDetailsTemplate.find('.js-add-locations').click(function () {
                    var $list = $(this).closest('.js-list-locations'),
                        $wrapper = $list.find('.js-wrapper-locations'),
                        $items = $list.find('.js-item-locations'),
                        limit = $list.attr('data-limit') || 10,
                        type = $list.attr('data-type') || 'departure';

                    $wrapper.append('<label class="js-item-locations"><div class="form__remove js-remove-locations"><svg class="icon__close" width="17px" height="17px"><use xlink:href="#close"></use></svg></div><input class="form__field js-typeahead" type="text" name="' + type + '" value="" placeholder="Enter here" autocomplete="off"></label>');

                    setLocationsLookup($wrapper.children().last().find(".js-typeahead"));

                    if ($items.length === +limit - 1) $list.addClass('limit');
                });

                //- remove departure/landing field
                $(document).on('click', '.js-remove-locations', function () {
                    var $list = $(this).closest('.js-list-locations'),
                        limit = $list.attr('data-limit') || 10;

                    $(this).closest('.js-item-locations').remove();

                    if ($list.find('.js-item-locations').length < +limit) {
                        $list.removeClass('limit');
                    }
                });

                $availabilityDetailsTemplate.find('.js-add-dates').click(function () {
                    var $list = $(this).closest('.js-list-dates'),
                        $wrapper = $list.find('.js-wrapper-dates'),
                        $items = $list.find('.js-item-dates'),
                        limit = $list.attr('data-limit') || 10;

                    $wrapper.append('<label class="js-item-dates"><div class="form__remove js-remove-dates"><svg class="icon__close" width="17px" height="17px"><use xlink:href="#close"></use></svg></div><input class="form__field js-gmi-datepicker" type="text" name="period" placeholder="click to change" required=""></label>');

                    $.each($wrapper.find('.js-gmi-datepicker'), function () {
                        $(this).gmiDatepicker({
                            type: 'date-range',
                            readonly: true,
                            format: 'MM/dd/yyyy',
                            placeholder: 'click to change'
                        });
                    });

                    if ($items.length === +limit - 1) $list.addClass('limit');
                });

                //- remove dates field
                $(document).on('click', '.js-remove-dates', function () {
                    var $list = $(this).closest('.js-list-dates'),
                        limit = $list.attr('data-limit') || 10;

                    $(this).closest('.js-item-dates').remove();

                    if ($list.find('.js-item-dates').length < +limit) {
                        $list.removeClass('limit');
                    }
                });

                $tabContent.append($availabilityDetailsTemplate);

                fleetDashboardSlider();
                fleetDashboardForm();

                bindData($tabContent);
            };

            var bindData = function ($tabContent) {
                var onFail = function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);

                      showSuccessMessage("Something Went Wrong!", "We apologize. Please Try Again")
                };

                var onGetAircraftsSuccess = function (returnedData, textStatus, xhr) {
                    if (xhr.status == 200) {
                        aircrafts = returnedData;

                        if (_availabilityId != null) {
                            execAjaxCall("aircrafts/availability/" + _availabilityId, "GET", null, onGetAvailabilitySuccess, onFail);
                        }
                        else {
                            bindAircrafts();
                            setLocationsLookup();

                            $(".form__field-wrapper.js-wrapper-dates .js-gmi-datepicker").gmiDatepicker({
                                type: 'date-range',
                                readonly: true,
                                format: 'MM/dd/yyyy',
                                placeholder: 'click to change'
                            });

                            customSelectInit();
                            customScrollInit();
                        }
                    }
                };

                var onGetAvailabilitySuccess = function (returnedData, textStatus, xhr) {
                    if (xhr.status == 200) {
                        bindAircrafts();

                        $tabContent.find("#aircrafts").val(returnedData.aircraftId);
                        $tabContent.find("#reroutingRadius").val(returnedData.reroutingRadius);
                        $tabContent.find("#pricePerHour").val(returnedData.pricePerHour);
                        $tabContent.find("#minPrice").val(returnedData.minimumAcceptablePricePerTrip);

                        //bind locations
                        var $deptLocWrapper = $($tabContent.find("#departureLocations"));
                        var $arrLocWrapper = $($tabContent.find("#arrivalLocations"));
                        var $locationTemplate = $($deptLocWrapper.find(".js-item-locations")).clone();

                        $deptLocWrapper.children().remove();
                        $arrLocWrapper.children().remove();

                        $.each(returnedData.departureLocations, function () {
                            var $loc = $locationTemplate.clone();

                            var $input = $loc.find(".js-typeahead");
                            $input.val(this.displayName);
                            $input.data("locid", this.locationTreeId);

                            $deptLocWrapper.append($loc);
                        });

                        $.each(returnedData.arrivalLocations, function () {
                            var $loc = $locationTemplate.clone();

                            var $input = $loc.find(".js-typeahead");
                            $input.attr('name', 'arrival');
                            $input.val(this.displayName);
                            $input.data("locid", this.locationTreeId);

                            $arrLocWrapper.append($loc);
                        });

                        setLocationsLookup();

                        //bind periods
                        var $periodTemplate = $($tabContent.find(".js-item-dates")).clone();

                        var periodsWrapper = $($tabContent.find(".form__field-wrapper.js-wrapper-dates"));

                        periodsWrapper.children().remove();

                        $.each(returnedData.periods, function () {
                            var $period = $periodTemplate.clone();

                            var dp = $period.find(".js-gmi-datepicker").gmiDatepicker({
                                type: 'date-range',
                                readonly: true,
                                format: 'MM/dd/yyyy',
                                placeholder: 'click to change',
                                defaultValue: this.from + ' - ' + this.to
                            });

                            periodsWrapper.append($period);
                        });

                        customSelectInit();
                        customScrollInit();
                    }
                };

                var aircrafts = [];

                var bindAircrafts = function () {
                    var $aircrafts = $tabContent.find("#aircrafts");

                    $.each(aircrafts, function () {
                        var o = new Option(this.tailNumber, this.aircraftId);

                        $aircrafts.append(o);
                    });
                };

                execAjaxCall("aircrafts/list", "GET", null, onGetAircraftsSuccess, onFail);
            }

            var setLocationsLookup = function (selector = null) {
                var locations = new Bloodhound({
                    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    remote: {
                        url: apiBaseUrl + 'locations/search/tree/126' + '/false/%QUERY',
                        wildcard: '%QUERY'
                    }
                });

                if (selector == null) {
                    selector = $tabContent.find(".js-typeahead");
                }

                selector.typeahead(null, {
                    name: 'potentialLocations',
                    display: 'name',
                    source: locations,
                    minLength: 2,
                    limit: 10
                }).bind("typeahead:selected", function (obj, datum, name) {
                    $(obj.currentTarget).data("locid", datum.id);
                });
            };

            if (_this.availabilityDetailsTemplate == null) {
                $.get("/templates/aircraftProvider/availabilityDetails.html?_=" + new Date().getTime(), function (availabilityDetailsTemplate) {
                    _this.availabilityDetailsTemplate = availabilityDetailsTemplate;

                    setView();
                });
            }
            else {
                setView();
            }

        };

        aircraftProviderModule.dashboard.initContainer(setAvailabilityView);
    }

}).apply(aircraftProviderModule.availability);

//flights availability
(function () {
    this.flightsAvailabilityTemplate = null;
    this.flightAvailabilityDetailsTemplate = null;

    this.init = function () {
        var _this = this;

        var setFlightsAvailabilityView = function () {

            var setView = function () {
                var $flightsAvailabilityTemplate = _this.flightsAvailabilityTemplate;

                var $tabContent = $(".dashboardBlock");

                $flightsAvailabilityTemplate.find("#newFlightAvailability").click(function () {
                    aircraftProviderModule.flightsAvailability.new();
                });

                $tabContent.find(".dashboardBlock__content").remove();
                $tabContent.append($flightsAvailabilityTemplate);

                bindData($tabContent);
            };

            if (_this.flightsAvailabilityTemplate == null) {
                $.get("/templates/aircraftProvider/flightsAvailability.html?_=" + new Date().getTime(), function (flightsAvailabilityTemplate) {
                    $.get("/templates/aircraftProvider/flightAvailabilityDetails.html?_=" + new Date().getTime(), function (flightAvailabilityDetailsTemplate) {
                        _this.flightsAvailabilityTemplate = $($.parseHTML(flightsAvailabilityTemplate));
                        _this.flightAvailabilityDetailsTemplate = $($.parseHTML(flightAvailabilityDetailsTemplate));

                        setView();
                    });
                });
            }
            else {
                setView();
            }

        };

        var bindData = function ($tabContent) {

            var onSuccess = function (returnedData, textStatus, xhr) {
                if (xhr.status == 200) {

                    var $availabilitysList = $tabContent.find(".bookingDashboard__table-body");
                    var $availabilityListTemplate = $($availabilitysList.find(".bookingDashboard__table-row").first());

                    $availabilitysList.children().remove();

                    $.each(returnedData, function () {
                        var $availability = $availabilityListTemplate.clone();

                        $availability.find(".aircraftNumber").text(this.aircraftNumber);
                        $availability.find(".departureLocation").text(this.departure);
                        $availability.find(".arrivalLocation").text(this.arrival);
                        $availability.find(".departureDate").html(dateToString(this.departureDate) +
                            '<a class="bookingDashboard__table-detail">click for details</a>');
                        $availability.find(".bookingDashboard__table-detail").data("id", this.emptyLegId);

                        $availabilitysList.append($availability);
                    });

                    $availabilitysList.find(".bookingDashboard__table-detail").click(function () {
                        _this.edit($(this).data("id"));
                    });

                  customScrollInit();
                }
            };

            var onFail = function (jqXHR, textStatus) {
                console.log(jqXHR);
                console.log(textStatus);

                alert('ops!! call failed :(');
            };

            execAjaxCall("emptylegs/list", "GET", null, onSuccess, onFail);

        }

        aircraftProviderModule.dashboard.initContainer(setFlightsAvailabilityView);
    }

    this.new = function () {
        editAvailability(this, null);
    };

    this.edit = function (emptyLegId) {
        editAvailability(this, emptyLegId);
    };

    this.save = function () {


    };

    var editAvailability = function (module, availabilityId) {
        var _this = module;
        var _availabilityId = availabilityId;

        var $captionDate;
        var setAvailabilityView = function () {

            var setView = function () {
                var $availabilityDetailsTemplate = _this.flightAvailabilityDetailsTemplate.clone();
                var $tabContent = $(".dashboardBlock");

                $availabilityDetailsTemplate.find("#removeFlightAvailability").click(function() {
                  const request = $.ajax({
                    url: `${apiBaseUrl}emptylegs/remove-availability`,
                    method: "PATCH",
                    data: JSON.stringify({
                      emptyLegId: availabilityId
                    }),
                    crossOrigin: true,
                    contentType: 'application/json',
                    xhrFields: {
                      withCredentials: true
                    }
                  })

                  request.done(data => {
                    aircraftProviderModule.flightsAvailability.init();
                  })

                  request.fail(err => {
                    showSuccessMessage("Something went wrong!", "We apologize. If the problem persists, please email us at administrator@flyjets.com")
                  })
                })

                $availabilityDetailsTemplate.find("#saveFlightAvailability").click(function () {

                    var onSuccess = function (returnedData, textStatus, xhr) {
                        aircraftProviderModule.flightsAvailability.init();
                    };

                    var onFail = function (jqXHR, textStatus) {
                        console.log(jqXHR);
                        console.log(textStatus);

                    showSuccessMessage("Something went wrong!", "We apologize. If the problem persists, please email us at administrator@flyjets.com")
                    };

                    var direction = $tabContent.find("input[name=direction]:checked").val();
                    var dates = [];

                    if (direction == bookingDirection.roundtrip) {
                        var d = $tabContent.find("input[name=dates]").val().split(" - ");
                        dates.push(d[0]);
                        dates.push(d[1]);
                    }
                    else {
                        dates.push($tabContent.find("input[name=dates]").val());
                        dates.push(null);
                    }

                    var availabilityData = {
                        emptyLegId: _availabilityId,
                        aircraftId: $tabContent.find("#aircrafts").val(),
                        direction: direction,
                        departureAirportId: $tabContent.find("input[name=departure]").data("locid"),
                        arrivalAirportId: $tabContent.find("input[name=arrival]").data("locid"),
                        departureDate: dates[0],
                        returnDate: dates[1],
                        exclusiveCost: $tabContent.find("input[name=price]").val()
                    };

                    execAjaxCall("emptylegs/save", "POST", availabilityData, onSuccess, onFail);
                });

                var $form = $availabilityDetailsTemplate.find("#flightAvailabilityForm");

                //--------- calendar ----------
                var $changeWayInputs = $form.find('.js-changeWay'),
                    option = 'date-range';

                $captionDate = $form.find('.js-date-caption');

                if ($changeWayInputs.length != 0) {
                    option = 'datetime-range';
                }

                if (_availabilityId == null) {
                    $.each($changeWayInputs, function () {
                        checkWay($(this), $form);
                    });

                    $changeWayInputs.on('change', function () {
                        $form.find('.js-gmi-datepicker').gmiDatepicker('clear').gmiDatepicker('destroy');
                        checkWay($(this), $form);
                    });
                }

                $tabContent.find(".dashboardBlock__content").remove();
                $tabContent.append($availabilityDetailsTemplate);

              changeRoundTrip($form)
              radioChange();
                bindData($tabContent);
            };

            setView();

        };

        var checkWay = function checkWay($input, $container, departureDate = null, returnDate = null) {
            if ($input[0].checked === true) {
                var text = $input.attr('data-text') || 'From-To:',
                    type = $input.attr('data-type') || 'round';

                var defaultValue = null;

                if (type == 'round') {
                    if (departureDate != null && returnDate != null) {
                        defaultValue = departureDate + ' - ' + returnDate;
                    }

                    $container.find('.js-gmi-datepicker').gmiDatepicker({
                        type: 'datetime-range',
                        readonly: true,
                        format: 'MM/dd/yyyy',
                        placeholder: 'click to change',
                        defaultValue: defaultValue
                    });
                } else {

                    if (departureDate != null) {
                        defaultValue = departureDate;
                    }

                    $container.find('.js-gmi-datepicker').gmiDatepicker({
                        type: 'datetime',
                        readonly: true,
                        format: 'MM/dd/yyyy',
                        placeholder: 'click to change',
                        defaultValue: defaultValue
                    });
                }

                $captionDate.text(text);
            }
        };

        var bindData = function ($tabContent) {
            var onFail = function (jqXHR, textStatus) {
                console.log(jqXHR);
                console.log(textStatus);

                    showSuccessMessage("Something went wrong!", "We apologize. If the problem persists, please email us at administrator@flyjets.com")
            };

            var onGetAircraftsSuccess = function (returnedData, textStatus, xhr) {
                if (xhr.status == 200) {
                    aircrafts = returnedData;

                    if (_availabilityId != null) {
                        execAjaxCall("emptyLegs/" + _availabilityId, "GET", null, onGetAvailabilitySuccess, onFail);
                    }
                    else {
                        bindAircrafts();

                        customSelectInit();
                        customScrollInit();
                    }
                }
            };

            var onGetAvailabilitySuccess = function (returnedData, textStatus, xhr) {
                if (xhr.status == 200) {
                    bindAircrafts();

                    var $tabContent = $(".dashboardBlock");

                    $tabContent.find("#aircrafts").val(returnedData.aircraftId);
                    $tabContent.find("#departure").val(returnedData.departure);
                    $tabContent.find("#departure").data("locid", returnedData.departureId);
                    $tabContent.find("#arrival").val(returnedData.arrival);
                    $tabContent.find("#arrival").data("locid", returnedData.arrivalId);
                    $tabContent.find("#price").val(returnedData.exclusiveCost);

                    $tabContent.find(".js-changeWay:checked").attr('checked', 'false');

                    if (returnedData.direction == bookingDirection.roundtrip) {

                        checkWay($tabContent.find(".js-changeWay[data-type=round]"), $tabContent,
                            returnedData.departureDate, returnedData.returnDate);
                    }
                    else {

                        checkWay($tabContent.find(".js-changeWay[data-type=one]"), $tabContent,
                            returnedData.departureDate);
                    }

                    $tabContent.find(".js-changeWay").on('change', function () {
                        $tabContent.find('.js-gmi-datepicker').gmiDatepicker('clear').gmiDatepicker('destroy');
                        checkWay($(this), $tabContent);
                    });

                    customSelectInit();
                    customScrollInit();
                }
            };

            var aircrafts = [];

            var bindAircrafts = function () {
                var $aircrafts = $tabContent.find("#aircrafts");

                $.each(aircrafts, function () {
                    var o = new Option(this.tailNumber, this.aircraftId);

                    $aircrafts.append(o);
                });
            };

            var locations = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                remote: {
                    url: apiBaseUrl + 'locations/search/tree/2' + '/true/%QUERY',
                    wildcard: '%QUERY'
                }
            });

            $tabContent.find(".js-typeahead").typeahead(null, {
                name: 'potentialLocations',
                display: 'name',
                source: locations,
                minLength: 2,
                limit: 10
            }).bind("typeahead:selected", function (obj, datum, name) {
                $(obj.currentTarget).data("locid", datum.id);
            });

            execAjaxCall("aircrafts/list", "GET", null, onGetAircraftsSuccess, onFail);
        }

        aircraftProviderModule.dashboard.initContainer(setAvailabilityView);
    }

}).apply(aircraftProviderModule.flightsAvailability);

//bookings
(function () {

    this.bookingsListTemplate = null;
    this.bookingsListItemTemplate = null;

    this.init = function (bookingType, alternate) {
        var _this = this;

        var setBookingsView = function () {
          var setView = function () {
            var $bookingListTemplate = $($.parseHTML(_this.bookingsListTemplate))
            var $bookingListItemTemplate = $($.parseHTML(_this.bookingsListItemTemplate))
            var $tabContent = $(".dashboardBlock");
            var $list = $($bookingListTemplate.find(".bookingDashboard__table-body"));
            $list.children().remove(); 
            $tabContent.append($bookingListTemplate);
          bindData($list, $bookingListItemTemplate);
          };

            var bindData = function (container, content) {

                var onSuccess = function (returnedData, textStatus, xhr) {
                    if (xhr.status == 200) {
                        $.each(returnedData, function () {
                            var $booking = content.clone();

                            $booking.find(".bookingNumber").text(this.number);
                            $booking.find(".flyerName").text(this.createdBy);
                            $booking.find(".bookingDate").prepend(dateToString(this.createdOn, "mm/dd/yyyy"));

                            container.append($booking);
                        });

                        customScrollInit();
                    }
                };

                var onFail = function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);

                    showSuccessMessage("Something went wrong!", "We apologize. If the problem persists, please email us at administrator@flyjets.com")
                };


              const request = $.ajax({
                url: `${apiBaseUrl}bookings/list/confirmed/${bookingType}/${alternate}`,
                method: "GET",
                crossOrigin: true,
                contentType: "application/json",
                xhrFields: {
                  withCredentials: true
                }
              });

              request.done(onSuccess);
              request.fail(onFail);
            }

            if (_this.bookingsListTemplate == null) {
                $.get("/templates/aircraftProvider/bookings.html?_=" + new Date().getTime(), function (bookingsListTemplate) {
                  $.get(`/templates/aircraftProvider/bookingsListItem.html?_=${new Date().getTime()}`, function(bookingsListItemTemplate) {
                    _this.bookingsListTemplate = bookingsListTemplate;
                    _this.bookingsListItemTemplate = bookingsListItemTemplate;
                    setView();
                  })
                });
            }
            else {
                setView();
            }
        }

        aircraftProviderModule.dashboard.initContainer(setBookingsView);
    };

}).apply(aircraftProviderModule.bookings);

//flights
(function () {

    this.flightsListTemplate = null;
    this.flightDetailsTemplate = null;

    this.init = function () {
        var _this = this;

        var getData = function (filterBy = filterFlightsBy.current) {
            var onSuccess = function (returnedData, textStatus, xhr) {
                if (xhr.status == 200) {
                    setFlightsView(returnedData, filterBy);
                }
            };

            var onFail = function (jqXHR, textStatus) {
                console.log(jqXHR);
                console.log(textStatus);

                    showSuccessMessage("Something went wrong!", "We apologize. If the problem persists, please email us at administrator@flyjets.com")
            };

            execAjaxCall("bookings/flights/list/" + filterBy, "GET", null, onSuccess, onFail);
        }

        var setFlightsView = function (flightsData, filterBy) {
            var setView = function (flightsData, tabId = filterFlightsBy.current) {
                var $tabContent = $(".dashboardBlock");
                var $template = _this.flightsListTemplate.clone();
                var tabId;

                if (filterBy == filterFlightsBy.current) {
                    tabId = "current";
                }
                else if (filterBy == filterFlightsBy.upcoming) {
                    tabId = "upcoming";
                }
                else {
                    tabId = "historical";
                }

                $template.find(".flightsDashboard__nav-item[data-id=" + tabId + "]").addClass("active");

                var $listTemplate = $template.find(".flightsDashboard__content-item[data-id=" + tabId + "]");
                var $listItemTemplate = $template.find(".flightsDashboard__list-item").clone();

                $template.find(".flightsDashboard__list-item").remove();

                $.each(flightsData, function () {
                    var $item = $listItemTemplate.clone();

                    $item.find(".flightNumber").text(this.flightNumber);
                    $item.find(".departureDate").text(dateToString(this.departureDate, "mm/dd/yyyy"));
                    $item.find(".bookingNumber").text(this.bookingNumber);
                    $item.find(".departureLocation").text(this.departure);
                    $item.find(".arrivalDate").text(dateToString(this.arrivalDate, "mm/dd/yyyy"));
                    //$item.find(".flyerName").text(this.flyerName);
                    $item.find(".arrivalLocation").text(this.arrival);
                    $item.find(".flightsDashboard__list-item-link").data("id", this.bookingFlightId);

                    $listTemplate.append($item);
                });

                $template.find(".flightsDashboard__list-item-link").click(function () {
                    _this.viewDetails($(this).data("id"));
                });

                $template.find(".flightsDashboard__nav-item").click(function () {
                    var filterBy;

                    if ($(this).data("id") == "current") {
                        filterBy = filterFlightsBy.current;
                    }
                    else if ($(this).data("id") == "upcoming") {
                        filterBy = filterFlightsBy.upcoming;
                    }
                    else {
                        filterBy = filterFlightsBy.historical;
                    }

                    getData(filterBy);
                });

                $tabContent.find(".dashboardBlock__content").remove();
                $tabContent.append($template);

                tabsInit();
                customScrollInit();
            };

            if (_this.flightsListTemplate == null) {
                $.get("/templates/aircraftProvider/flights.html?_=" + new Date().getTime(), function (flightsListTemplate) {
                    _this.flightsListTemplate = $($.parseHTML(flightsListTemplate));

                    setView(flightsData);
                });
            }
            else {
                setView(flightsData);
            }
        }

        aircraftProviderModule.dashboard.initContainer(getData);
    };

    this.viewDetails = function (bookingFlightId) {
        var _this = this;

        var onSuccess = function (returnedData, textStatus, xhr) {
            if (xhr.status == 200) {
                setFlightView(returnedData);
            }
        };

        var onFail = function (jqXHR, textStatus) {
            console.log(jqXHR);
            console.log(textStatus);

                    showSuccessMessage("Something went wrong!", "We apologize. If the problem persists, please email us at administrator@flyjets.com")
        };

        var setFlightView = function (flightData) {
            var setView = function (flightsData) {
                var $tabContent = $(".dashboardBlock");
                var $template = _this.flightDetailsTemplate.clone();

                $template.find("#flightNumber").text(flightData.flightNumber);
                $template.find("#bookingNumber").text(flightData.bookingNumber);
                $template.find("#flyerName").text(flightData.flyerName);
                $template.find("#aircraftModel").text(flightData.aircraftModel);
                $template.find("#departure").text(flightData.departure);
                $template.find("#departureDate").text(dateToString(flightData.departureDate, "mm/dd/yyyy"));

                if (flightData.departureTime != null) {
                    $template.find("#departureTime").text(flightData.departureTime);
                }

                $template.find("#arrival").text(flightData.arrival);
                $template.find("#arrivalDate").text(dateToString(flightData.arrivalDate, "mm/dd/yyyy"));

                if (flightData.arrivalTime != null) {
                    $template.find("#arrivalTime").text(flightData.arrivalTime);
                }

                $template.find("#flightDuration").text(flightData.duration);
                
                $tabContent.find(".dashboardBlock__content").remove();
                $tabContent.append($template);

                customScrollInit();
            };

            if (_this.flightDetailsTemplate == null) {
                $.get("/templates/aircraftProvider/flightDetails.html?_=" + new Date().getTime(), function (flightDetailsTemplate) {
                    _this.flightDetailsTemplate = $($.parseHTML(flightDetailsTemplate));

                    setView(flightData);
                });
            }
            else {
                setView(flightData);
            }
        }

        execAjaxCall("bookings/flights/" + bookingFlightId, "GET", null, onSuccess, onFail);
    };

}).apply(aircraftProviderModule.flights);

/*******************************Aircraft Provider Module End****************************************/

/*******************************Common Module Start****************************************/
var commonModule = commonModule || {};

commonModule.paymentMethods = {};
commonModule.settings = {};

//payment methods
(function () {
    this.paymentMethodsTemplate = null;
    this.paymentMethodsCreditCardListItemTemplate = null;
    this.paymentMethodsBankAccountListItemTemplate = null;

    this.init = function () {
        var _this = this;

        var setContentView = function () {
            var setView = function (paymentMethodsTemplate, paymentMethodsCreditCardListItem,
                paymentMethodsBankAccountListItemTemplate) {

                var $paymentMethodsTemplate = $($.parseHTML(paymentMethodsTemplate)),
                    $paymentMethodsCreditCardListItem = $($.parseHTML(paymentMethodsCreditCardListItem)),
                    $paymentMethodsBankAccountListItemTemplate = $($.parseHTML(paymentMethodsBankAccountListItemTemplate))
                $tabContent = $(".dashboardBlock"),
                    usedFor = paymentMethodUsedFor.pay;

                $paymentMethodsTemplate.find(".js-tabNavItem").click(function () {
                    if ($(this).data("id") == "pay") {
                        usedFor = paymentMethodUsedFor.pay;
                        bindData(usedFor, $tabContent, $paymentMethodsCreditCardListItem, $paymentMethodsBankAccountListItemTemplate);
                    }
                    else {
                        usedFor = paymentMethodUsedFor.getPaid;
                        bindData(usedFor, $tabContent, $paymentMethodsCreditCardListItem, $paymentMethodsBankAccountListItemTemplate);
                    }
                });

                $paymentMethodsTemplate.find("#addCreditCard").click(function () {
                    var $form = $tabContent.find(".form--addNewCardMethod");

                    $form.addClass('loading');
                    $form.find('input, button, textarea, select').attr('disabled', 'disabled');

                    var number = $tabContent.find("input[name=ccNumber]").val(),
                        expiryMonth = $tabContent.find("input[name=ccExpMonth]").val(),
                        expiryYear = $tabContent.find("input[name=ccExpYear]").val(),
                        cvv = $tabContent.find("input[name=ccCvv]").val();

                    var $payCards = $tabContent.find("#payCardInfo");

                    var request = $.ajax({
                        url: apiBaseUrl + 'accounts/paymethods/creatcc',
                        method: "POST",
                        crossDomain: true,
                        contentType: "application/json",
                        data: JSON.stringify({
                            number: number,
                            expiryMonth: expiryMonth,
                            expiryYear: expiryYear,
                            cvv: cvv,
                            usedFor: usedFor
                        }),
                        xhrFields: {
                            withCredentials: true
                        }
                    });

                    request.done(function (data, textStatus, xhr) {
                        if (xhr.status == 200) {
                            var $card = $paymentMethodsCreditCardListItem.clone();

                            $card.find(".ccInfo").html(data.creditCardBrand + " ending in <b>" + data.creditCardLast4 + "</b>");
                            $card.find(".js-popup").data("card", JSON.stringify(data));

                            $card.find(".js-popup").click(function (e) {
                                e.preventDefault();
                                e.stopPropagation();

                                var $ccDetails = $tabContent.find("#creditCardDetail");
                                var card = JSON.parse($(this).data("card"));

                                $ccDetails.find(".ccBrand").text(card.creditCardBrand);
                                $ccDetails.find(".ccNumber").text('************' + card.creditCardLast4);
                                $ccDetails.find(".ccExpDate").text(card.creditCardExpMonth + "/" + card.creditCardExYear);

                                app.utils.responseForm('#creditCardDetail');
                            });

                            $payCards.append($card);

                            $tabContent.find("input[name=ccNumber]").val("");
                            $tabContent.find("input[name=ccExpMonth]").val("");
                            $tabContent.find("input[name=ccExpYear]").val("");
                            $tabContent.find("input[name=ccCvv]").val("");

                            $form.find('input, button, textarea, select').removeAttr('disabled', 'disabled');
                            $form.removeClass('loading');
                            showSuccessMessage('Card Added', 'Your card has been added successfully');
                        }
                    });

                    request.fail(function (jqXHR, textStatus) {
                        console.log(jqXHR);
                        console.log(textStatus);

                    showSuccessMessage("Something went wrong!", "We apologize. If the problem persists, please email us at administrator@flyjets.com")
                    });
                });

                $paymentMethodsTemplate.find("#addBankAccount").click(function () {
                    var $form = $tabContent.find("#payAddNewBankMethod");

                    $form.addClass('loading');
                    $form.find('input, button, textarea, select').attr('disabled', 'disabled');

                    var holderName = $form.find("#holderName").val(),
                        holderType = $form.find("input[name=holderType]").val(),
                        routingNumber = $form.find("#routingNumber").val(),
                        accountNumber = $form.find("#accountNumber").val();

                    var $payBankInfo = $tabContent.find("#payBankInfo");

                    var request = $.ajax({
                        url: apiBaseUrl + 'accounts/paymethods/creatbankacc',
                        method: "POST",
                        crossDomain: true,
                        contentType: "application/json",
                        data: JSON.stringify({
                            accountHolderName: holderName,
                            accountHolderType: holderType,
                            routingNumber: routingNumber,
                            accountNumber: accountNumber,
                            usedFor: usedFor
                        }),
                        xhrFields: {
                            withCredentials: true
                        }
                    });

                    request.done(function (data, textStatus, xhr) {
                        if (xhr.status == 200) {
                            var $account = $paymentMethodsBankAccountListItemTemplate.clone();

                            $account.find(".baInfo").html("Account ending in <b>" + data.accountLast4 + "</b>");
                            $account.find(".js-popup").data("account", JSON.stringify(data));

                            $account.find(".js-popup").click(function (e) {
                                e.preventDefault();
                                e.stopPropagation();

                                var $baDetails = $tabContent.find("#bankAccountDetail");
                                var account = JSON.parse($(this).data("account"));

                                $baDetails.find("#bankName").text(account.bankName);
                                $baDetails.find("#holderName").text(account.holderName);
                                $baDetails.find("#routingNumber").text(account.routingNumber);
                                $baDetails.find("#accountNumber").text('************' + account.accountLast4);

                                app.utils.responseForm('#bankAccountDetail');
                            });

                            $payBankInfo.append($account);

                            $form.find("#holderName").val("");
                            $form.find("input[name=holderType]").val("");
                            $form.find("#routingNumber").val("");
                            $form.find("#accountNumber").val("");

                            $form.find('input, button, textarea, select').removeAttr('disabled', 'disabled');
                            $form.removeClass('loading');
                            showSuccessMessage('Bank Account Added', 'Your bank account has been added successfully');
                        }
                    });

                    request.fail(function (jqXHR, textStatus) {
                        console.log(jqXHR);
                        console.log(textStatus);

                    showSuccessMessage("Something went wrong!", "We apologize. If the problem persists, please email us at administrator@flyjets.com")
                    });
                });

                $tabContent.append($paymentMethodsTemplate);

                tabsInit();

                bindData(usedFor, $tabContent, $paymentMethodsCreditCardListItem, $paymentMethodsBankAccountListItemTemplate);
            };

            var bindData = function (usedFor, $tabContent, $paymentMethodsCreditCardListItem,
                $paymentMethodsBankAccountListItemTemplate) {

                var $payCards = $tabContent.find("#payCardInfo"),
                    $payBanks = $tabContent.find("#payBankInfo"),
                    $getPaymentBanks = $tabContent.find("#getPaymentBankInfo");

                $payCards.children().remove();
                $payBanks.children().remove();
                $getPaymentBanks.children().remove();

                var request = $.ajax({
                    url: apiBaseUrl + 'accounts/paymethods/' + usedFor,
                    method: "GET",
                    crossDomain: true,
                    contentType: "application/json",
                    xhrFields: {
                        withCredentials: true
                    }
                });

                request.done(function (data, textStatus, xhr) {
                    if (xhr.status == 200) {

                        if (usedFor == paymentMethodUsedFor.pay) {
                            if (data.creditCards.length != 0) {
                                $.each(data.creditCards, function () {
                                    var $card = $paymentMethodsCreditCardListItem.clone();

                                    $card.find(".ccInfo").html(this.creditCardBrand + " ending in <b>" + this.creditCardLast4 + "</b>");
                                    $card.find(".js-popup").data("card", JSON.stringify(this));

                                    $card.find(".js-popup").click(function (e) {
                                        e.preventDefault();
                                        e.stopPropagation();

                                        var $ccDetails = $tabContent.find("#creditCardDetail");
                                        var card = JSON.parse($(this).data("card"));

                                        $ccDetails.find(".ccBrand").text(card.creditCardBrand);
                                        $ccDetails.find(".ccNumber").text('************' + card.creditCardLast4);
                                        $ccDetails.find(".ccExpDate").text(card.creditCardExpMonth + "/" + card.creditCardExYear);

                                        app.utils.responseForm('#creditCardDetail');
                                    });

                                    $payCards.append($card);
                                });
                            }

                            if (data.bankAccounts.length != 0) {
                                $.each(data.bankAccounts, function () {
                                    var $bAccount = $paymentMethodsBankAccountListItemTemplate.clone();

                                    $bAccount.find(".baInfo").html("Account ending in <b>" + this.accountLast4 + "</b>");
                                    $bAccount.find(".js-popup").data("account", JSON.stringify(this));

                                    $bAccount.find(".js-popup").click(function (e) {
                                        e.preventDefault();
                                        e.stopPropagation();

                                        var $baDetails = $tabContent.find("#bankAccountDetail");
                                        var bAccount = JSON.parse($(this).data("account"));

                                        $baDetails.find("#bankName").text(bAccount.bankName);
                                        $baDetails.find("#holderName").text(bAccount.holderName);
                                        $baDetails.find("#routingNumber").text(bAccount.routingNumber);
                                        $baDetails.find("#accountNumber").text('************' + bAccount.accountLast4);

                                        app.utils.responseForm('#bankAccountDetail');
                                    })

                                    $payBanks.append($bAccount);
                                });
                            }
                        }
                        else {
                            $.each(data.bankAccounts, function () {
                                var $bAccount = $paymentMethodsBankAccountListItemTemplate.clone();

                                $bAccount.find(".baInfo").html("Account ending in <b>" + this.accountLast4 + "</b>");
                                $bAccount.find(".js-popup").data("account", JSON.stringify(this));

                                $bAccount.find(".js-popup").click(function (e) {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    var $baDetails = $tabContent.find("#bankAccountDetail");
                                    var bAccount = JSON.parse($(this).data("account"));

                                    $baDetails.find(".baBankName").text(bAccount.bankName);
                                    $baDetails.find(".baHolderName").text(bAccount.holderName);
                                    $baDetails.find(".baRoutingNumber").text(bAccount.routingNumber);
                                    $baDetails.find(".baNumber").text('************' + bAccount.accountLast4);

                                    app.utils.responseForm('#bankAccountDetail');
                                })

                                $getPaymentBanks.append($bAccount);
                            });
                        }

                        customScrollInit();
                    }
                });

                request.fail(function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);

                    showSuccessMessage("Something went wrong!", "We apologize. If the problem persists, please email us at administrator@flyjets.com")
                });
            }

            if (_this.paymentMethodsTemplate == null) {
                $.get("/templates/paymentMethods.html?_=" + new Date().getTime(), function (paymentMethodsTemplate) {
                    $.get("/templates/paymentMethodsCreditCardListItem.html?_=" + new Date().getTime(), function (paymentMethodsCreditCardListItemTemplate) {
                        $.get("/templates/paymentMethodsBankAccountListItem.html?_=" + new Date().getTime(), function (paymentMethodsBankAccountListItemTemplate) {
                            _this.paymentMethodsTemplate = paymentMethodsTemplate;
                            _this.paymentMethodsCreditCardListItem = paymentMethodsCreditCardListItemTemplate;
                            _this.paymentMethodsBankAccountListItemTemplate = paymentMethodsBankAccountListItemTemplate;

                            setView(_this.paymentMethodsTemplate, _this.paymentMethodsCreditCardListItem,
                                _this.paymentMethodsBankAccountListItemTemplate);
                        });
                    });
                });
            }
            else {
                setView(_this.paymentMethodsTemplate, _this.paymentMethodsCreditCardListItem,
                    _this.paymentMethodsBankAccountListItemTemplate);
            }
        };

        if (currentUser.type == userTypes.flyer) {
            flyerModule.dashboard.initContainer(setContentView, "payMethods");
        }
        else if (currentUser.type == userTypes.aircraftProvider) {
            aircraftProviderModule.dashboard.initContainer(setContentView);
        }
    };

}).apply(commonModule.paymentMethods);

//settings
(function () {
    this.settingsTemplate = null;

    this.init = function () {
        var _this = this;

        var setSettingsView = function () {
            var setView = function (settingsTemplate) {
                var $settingsTemplate = $($.parseHTML(settingsTemplate));

                var $tabContent = $(".dashboardBlock");

                var request = $.ajax({
                    url: apiBaseUrl + 'accounts/getnotchannel',
                    method: "GET",
                    crossDomain: true,
                    contentType: "application/json",
                    xhrFields: {
                        withCredentials: true
                    }
                });

                request.done(function (data, textStatus, xhr) {
                    if (xhr.status == 200) {
                        var $alertsForm = $settingsTemplate.find(".form--typeAlerts");

                        if (data != null) {
                            if ((data & notificationTypes.inApp) == notificationTypes.inApp) {
                            }

                            if ((data & notificationTypes.email) == notificationTypes.email) {
                            }

                            if ((data & notificationTypes.textMessage) == notificationTypes.textMessage) {
                            }
                        }

                        var $form = $settingsTemplate.find('.form--changePassword'),
                            $oldPassword = $form.find('input[name=oldPassword]'),
                            $newPassword = $form.find('input[name=newPassword]'),
                            $passwordLabel = $newPassword.parents(".form__label--password"),
                            $confirmPassword = $form.find('input[name=confirmPassword]'),
                            $confirmLabel = $confirmPassword.parents(".form__label--confirm"),
                            $submit = $form.find('#changePassword');

                        $newPassword.on('keyup', function () {
                            if ($(this).val().length < 6) {
                                $passwordLabel.addClass('invalid');
                                $confirmLabel.addClass('disabled');
                                $confirmPassword.attr('disabled', 'disabled');

                                if ($(this).val().length == 0) {
                                    $passwordLabel.removeClass('invalid');
                                }
                            } else {
                                $passwordLabel.removeClass('invalid');
                                $confirmLabel.removeClass('disabled');
                                $confirmPassword.removeAttr('disabled');
                            }
                        });

                        $confirmPassword.on('keyup', function () {
                            if ($newPassword.val() != $(this).val()) {
                                $confirmLabel.addClass('invalid');
                                $submit.attr('disabled', 'disabled');

                                if ($(this).val().length == 0) {
                                    $confirmLabel.removeClass('invalid');
                                }
                            } else {
                                $confirmLabel.removeClass('invalid');
                                $submit.removeAttr('disabled');
                            }
                        });

                        $submit.click(function () {

                            $form.addClass('loading');
                            $form.find('input, button, textarea, select').attr('disabled', 'disabled');

                            var request = $.ajax({
                                url: apiBaseUrl + 'accounts/changepass',
                                method: "POST",
                                crossDomain: true,
                                contentType: "application/json",
                                data: JSON.stringify({
                                    oldPassword: $oldPassword.val(),
                                    newPassword: $newPassword.val()
                                }),
                                xhrFields: {
                                    withCredentials: true
                                }
                            });

                            request.done(function (data, textStatus, xhr) {
                                if (xhr.status == 200) {
                                    $form.removeClass('loading');
                                    $form.find('input, button, textarea, select').removeAttr('disabled');

                                    $oldPassword.val("");
                                    $newPassword.val("");
                                    $confirmPassword.val("");

                                    $confirmLabel.addClass('disabled');
                                    $confirmPassword.attr('disabled', 'disabled');
                                    $submit.attr('disabled', 'disabled');

                                    showSuccessMessage('Password Changed', 'Your password has been changed successfully');
                                }
                            });

                            request.fail(function (jqXHR, textStatus) {
                                console.log(jqXHR);
                                console.log(textStatus);

                                $form.removeClass('loading');
                                $form.find('input, button, textarea, select').removeAttr('disabled');

                                if (jqXHR.status = 403 && jqXHR.responseJSON != '' && jqXHR.responseJSON[0] == "InvalidPassword") {
                                    alert('Incorrect old password');
                                }
                                else {
                                    alert('ops!! call failed :(');
                                }
                            });

                        });

                        $alertsForm.find("input[type=checkbox]").click(function () {
                            var selected = $alertsForm.find("input[type=checkbox]:checked");
                            var channels = 0;
                            $.each(selected, function () {
                                if ($(this).val() == "inApp") {
                                    channels += notificationTypes.inApp;
                                }
                                else if ($(this).val() == "email") {
                                    channels += notificationTypes.email;
                                }
                                else if ($(this).val() == "sms") {
                                    channels += notificationTypes.textMessage;
                                }
                            });

                            if (channels == 0) channels = null;

                            var request = $.ajax({
                                url: apiBaseUrl + 'accounts/updatenotchannel',
                                method: "POST",
                                crossDomain: true,
                                contentType: "application/json",
                                data: JSON.stringify({
                                    channel: channels
                                }),
                                xhrFields: {
                                    withCredentials: true
                                }
                            });

                            request.done(function (data, textStatus, xhr) {
                                if (xhr.status == 200) {

                                }
                            });

                            request.fail(function (jqXHR, textStatus) {
                                console.log(jqXHR);
                                console.log(textStatus);

                                alert('ops!! call failed :(');
                            });
                        });

                        $tabContent.append($settingsTemplate);

                        tabsInit();

                        customScrollInit();
                    }
                });

                request.fail(function (jqXHR, textStatus) {
                    console.log(jqXHR);
                    console.log(textStatus);

                    alert('ops!! call failed :(');
                });
            };

            if (this.settingsTemplate == null) {
                $.get("/templates/settings.html?_=" + new Date().getTime(), function (template) {
                    setView(template);
                });
            }
            else {
                setView(this.settingsTemplate);
            }
        }

        if (currentUser.type == userTypes.flyer) {
            flyerModule.dashboard.initContainer(setSettingsView, "settings");
        }
        else if (currentUser.type == userTypes.aircraftProvider) {
            aircraftProviderModule.dashboard.initContainer(setSettingsView);
        }
        else {
            adminModule.dashboard.initContainer(setSettingsView);
        }
    };

    this.changePassword = function () {

    };

    this.updateNotificationsChannles = function () {

    }

}).apply(commonModule.settings);
/*******************************Common Module End****************************************/

function goToUserHomePage() {
    if (currentUser.type == userTypes.flyer) {
        flyerModule.booking.init();

        $("#showDashboard").click(function () {
            flyerModule.dashboard.init();
        });
    }
    else if (currentUser.type == userTypes.aircraftProvider) {
        aircraftProviderModule.dashboard.init();

        $("#showDashboard").click(function () {
            aircraftProviderModule.dashboard.init();
        });
    }
    else if (currentUser.type == userTypes.admin) {
        adminModule.dashboard.init();

        $("#showDashboard").click(function () {
            adminModule.dashboard.init();
            notificationCountHandler(notifications, currentUser.type);
        });
    }
}

$(document).ready(function () {
    bounds = new google.maps.LatLngBounds();
    $container = $(".content__inner");

    checkLoggedInUser(function () {

        goToUserHomePage();

        $(".goToUserHomePage").click(function () {
            goToUserHomePage();
            notificationCountHandler(notifications, currentUser.type);
        });

    }, function () { window.location = "/"; });
});
