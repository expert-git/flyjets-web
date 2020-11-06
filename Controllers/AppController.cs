using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace FlyJetsV2.Web.Controllers
{
  public class AppController : Controller
  {
    private IConfiguration _config;

    public AppController(IConfiguration config)
    {
      _config = config;
    }

    public IActionResult Index()
    {
      SetApiBaseUrl();

      return View();
    }

    public IActionResult Main()
    {
      SetApiBaseUrl();

      return View();
    }

    public IActionResult ForgotPassword()
    {
      SetApiBaseUrl();
      return View();
    }

    public IActionResult Verify()
    {
      SetApiBaseUrl();
      return View();
    }

    public IActionResult Checkout()
    {
      SetApiBaseUrl();
      return View();
    }

    public IActionResult Terms()
    {
      return View();
    }

    public IActionResult Privacy()
    {
      return View();
    }

    public IActionResult Disclaimer()
    {
      return View();
    }

    public IActionResult About()
    {
      return View();
    }

    public IActionResult CompleteBooking(Guid bookingId)
    {
      SetApiBaseUrl();

      ViewData["CompleteBookingForBookingId"] = bookingId;
      return View("Main");
    }

    private void SetApiBaseUrl()
    {
      ViewData["ApiBaseUrl"] = _config["EnvUrl"];
    }
  }
}
