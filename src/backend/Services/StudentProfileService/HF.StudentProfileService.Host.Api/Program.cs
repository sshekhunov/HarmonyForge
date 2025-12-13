using HF.StudentProfileService.Core.Domain.Interfaces.Repositories;
using HF.StudentProfileService.Core.Domain.Interfaces.Services;
using HF.StudentProfileService.Infrastructure.DataAccess;
using HF.StudentProfileService.Infrastructure.DataAccess.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HF.StudentProfileService.Host.Api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
                });
            builder.Services.AddOpenApi();

            var connectionString = builder.Configuration.GetConnectionString("StudentProfileDbConnection");
            
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException("ConnectionStrings:StudentProfileDbConnection is not configured.");
            }

            builder.Services.AddDbContext<StudentProfileDbContext>(options =>
                options.UseNpgsql(connectionString));

            builder.Services.AddScoped<IStudentRepository, StudentRepository>();
            builder.Services.AddScoped<ILearningItemStatusRepository, LearningItemStatusRepository>();
            builder.Services.AddScoped<ILearningItemStatusService, Core.Application.Services.LearningItemStatusService>();

            var app = builder.Build();
            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
            }

            app.UseHttpsRedirection();

            app.UseAuthorization();


            app.MapControllers();

            app.Run();
        }
    }
}
