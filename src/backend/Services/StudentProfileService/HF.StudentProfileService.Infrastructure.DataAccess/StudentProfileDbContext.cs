using HF.StudentProfileService.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HF.StudentProfileService.Infrastructure.DataAccess;

public class StudentProfileDbContext : DbContext
{
    public StudentProfileDbContext(DbContextOptions<StudentProfileDbContext> options)
        : base(options)
    {
    }

    public DbSet<Student> Students => Set<Student>();
    public DbSet<LearningItemStatus> LearningItemStatuses => Set<LearningItemStatus>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Student>(entity =>
        {
            entity.ToTable("Students");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedNever();
            entity.Property(e => e.UserId).IsRequired();
            entity.HasIndex(e => e.UserId).IsUnique();
        });

        modelBuilder.Entity<LearningItemStatus>(entity =>
        {
            entity.ToTable("LearningItemStatuses");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedNever();
            entity.Property(e => e.LearningItemId).IsRequired();
            entity.Property(e => e.LearningItemType).IsRequired();
            entity.Property(e => e.DateTime).IsRequired();
            entity.Property(e => e.IsCompleted).IsRequired();
            
            entity.HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey("StudentId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            entity.HasIndex("StudentId", "LearningItemId", "LearningItemType");
        });
    }
}

