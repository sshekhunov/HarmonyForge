using HF.HarmonyAnalysisService.Core.Application.Commands;
using HF.HarmonyAnalysisService.Core.Application.Services;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Host.Api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowLocalhost4200", policy =>
                {
                    policy.WithOrigins("http://localhost:4200")
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });

            builder.Services.AddScoped<IMusicXmlParser, MusicXmlParser>();
            builder.Services.AddScoped<IHarmonyCheckCommand, ParallelOctavesCheckCommand>();
            builder.Services.AddScoped<IHarmonyCheckCommand, ParallelFifthsCheckCommand>();
            builder.Services.AddScoped<IHarmonyCheckCommand, VoiceCrossoverCheckCommand>();
            builder.Services.AddScoped<IHarmonyCheckCommand, HiddenOctavesCheckCommand>();
            builder.Services.AddScoped<IHarmonyCheckCommand, SpacingCheckCommand>();
            builder.Services.AddScoped<IHarmonyCheckCommand, ParallelUnisonsCheckCommand>();
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
