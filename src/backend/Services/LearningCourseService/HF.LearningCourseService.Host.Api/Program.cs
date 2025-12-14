
using HF.LearningCourseService.Core.Domain.Interfaces.Repositories;
using HF.LearningCourseService.Core.Domain.Interfaces.Services;
using HF.LearningCourseService.Infrastructure.DataAccess;
using HF.LearningCourseService.Infrastructure.DataAccess.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HF.LearningCourseService.Host.Api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            builder.Services.AddControllers();
            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            builder.Services.AddOpenApi();

            // Add CORS services
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowLocalhost4200", policy =>
                {
                    policy.WithOrigins("http://localhost:4200")
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });

            // MongoDB EF Core DbContext registration
            var mongoConnectionString = builder.Configuration.GetSection("MongoDb:ConnectionString").Get<string?>();
            var mongoDatabase = builder.Configuration.GetSection("MongoDb:Database").Get<string?>();

            if (string.IsNullOrWhiteSpace(mongoConnectionString))
            {
                throw new InvalidOperationException("MongoDb:ConnectionString is not configured.");
            }
            if (string.IsNullOrWhiteSpace(mongoDatabase))
            {
                throw new InvalidOperationException("MongoDb:Database is not configured.");
            }

            builder.Services.AddDbContext<LearningCourseDbContext>(options =>
                options.UseMongoDB(mongoConnectionString!, mongoDatabase!));

            builder.Services.AddScoped<ILearningCourseRepository, LearningCourseRepository>();
            builder.Services.AddScoped<ILearningCourseService, Core.Application.Services.LearningCourseService>();
            
            builder.Services.AddScoped<ILearningArticleRepository, LearningArticleRepository>();
            builder.Services.AddScoped<ILearningArticleService, Core.Application.Services.LearningArticleService>();
            
            builder.Services.AddScoped<ILearningExerciseRepository, LearningExerciseRepository>();
            builder.Services.AddScoped<ILearningExerciseService, Core.Application.Services.LearningExerciseService>();

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
