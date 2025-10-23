using HF.LearningCourseService.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;

namespace HF.LearningCourseService.Infrastructure.DataAccess
{
	public class LearningCourseDbContext : DbContext
	{
		public LearningCourseDbContext(DbContextOptions<LearningCourseDbContext> options)
			: base(options)
		{
		}

		public DbSet<LearningCourse> LearningCourses => Set<LearningCourse>();
		public DbSet<LearningModule> LearningModules => Set<LearningModule>();
		public DbSet<LearningArticle> LearningArticles => Set<LearningArticle>();		

		protected override void OnModelCreating(ModelBuilder modelBuilder)
		{
			modelBuilder.Entity<LearningCourse>().ToCollection("learning_courses");
			modelBuilder.Entity<LearningModule>().ToCollection("learning_modules");
			modelBuilder.Entity<LearningArticle>().ToCollection("learning_articles");
            
            // Configure relationships
            modelBuilder.Entity<LearningArticle>()
                .HasIndex(a => a.LearningModuleId);
        }
	}
}


