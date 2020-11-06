using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FlyJetsV2.Web
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            //services.Configure<CookiePolicyOptions>(options =>
            //{
            //    // This lambda determines whether user consent for non-essential cookies is needed for a given request.
            //    options.CheckConsentNeeded = context => true;
            //    options.MinimumSameSitePolicy = SameSiteMode.None;
            //});


            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_2);
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
                app.UseHttpsRedirection();
            }

            app.UseStaticFiles();

            app.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "Default",
                    template: "{controller=App}/{action=Index}");

                routes.MapRoute(
                    name: "Main",
                    template: "{controller=App}/{action=Main}");

                routes.MapRoute(
                    name: "Terms",
                    template: "{controller=App}/{action=Terms}");

                routes.MapRoute(
                    name: "Privacy",
                    template: "{controller=App}/{action=Privacy}");

                routes.MapRoute(
                    name: "Disclaimer",
                    template: "{controller=App}/{action=Disclaimer}");

                /* routes.MapRoute( */
                /*     name: "About", */
                /*     template: "{controller=App}/{action=About}"); */

                routes.MapRoute(
                    name: "ForgotPassword",
                    template: "{controller=App}/{action=ForgotPassword}/{id?}");

                routes.MapRoute(
                    name: "CompleteBooking",
                    template: "{controller=App}/{action=CompleteBooking}/{bookingId}");

                routes.MapRoute(
                    name: "Checkout",
                    template: "{controller=App}/{action=Checkout}/{bookingId}");
            });
        }
    }
}
