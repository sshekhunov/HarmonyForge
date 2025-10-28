
using HF.HarmonyAnalysisService.Core.Application.Services;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Host.Api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.Services.AddControllers();

            // Add CORS
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowLocalhost4200", policy =>
                {
                    policy.WithOrigins("http://localhost:4200")
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });

            // Register application services
            builder.Services.AddScoped<IMusicXmlParser, MusicXmlParser>();
            builder.Services.AddScoped<IHarmonyAnalysisService, Core.Application.Services.HarmonyAnalysisService>();
            
            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            builder.Services.AddOpenApi();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
            }

            app.UseHttpsRedirection();

            // Use CORS
            app.UseCors("AllowLocalhost4200");

            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
    }
}
