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
	public DbSet<LearningArticle> LearningArticles => Set<LearningArticle>();
	public DbSet<LearningExcercise> LearningExercises => Set<LearningExcercise>();

		protected override void OnModelCreating(ModelBuilder modelBuilder)
		{
		modelBuilder.Entity<LearningCourse>().ToCollection("learning_courses");
		modelBuilder.Entity<LearningArticle>().ToCollection("learning_articles");
		modelBuilder.Entity<LearningExcercise>().ToCollection("learning_exercises");
            
            // Configure relationships
            modelBuilder.Entity<LearningArticle>()
                .HasIndex(a => a.LearningModuleId);
                
            modelBuilder.Entity<LearningExcercise>()
                .HasIndex(e => e.LearningModuleId);
                
            modelBuilder.Entity<LearningCourse>()
                .OwnsMany(c => c.Modules, module =>
                {
                    module.WithOwner().HasForeignKey("LearningCourseId");
                    module.Property(m => m.Id).ValueGeneratedOnAdd();
                });
        }
	}
}


