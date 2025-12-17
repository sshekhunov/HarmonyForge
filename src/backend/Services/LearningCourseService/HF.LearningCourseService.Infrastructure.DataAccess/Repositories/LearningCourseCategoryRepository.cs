using HF.LearningCourseService.Core.Domain.Entities;
using HF.LearningCourseService.Core.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HF.LearningCourseService.Infrastructure.DataAccess.Repositories;

public class LearningCourseCategoryRepository : ILearningCourseCategoryRepository
{
    private readonly LearningCourseDbContext _dbContext;

    public LearningCourseCategoryRepository(LearningCourseDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IList<LearningCourseCategory>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.LearningCourseCategories.AsNoTracking().ToListAsync(cancellationToken);
    }

    public async Task<LearningCourseCategory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.LearningCourseCategories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    public async Task AddAsync(LearningCourseCategory category, CancellationToken cancellationToken = default)
    {
        await _dbContext.LearningCourseCategories.AddAsync(category, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(LearningCourseCategory category, CancellationToken cancellationToken = default)
    {
        var existingCategory = await _dbContext.LearningCourseCategories.FirstOrDefaultAsync(c => c.Id == category.Id, cancellationToken);
        if (existingCategory is null)
        {
            throw new InvalidOperationException($"Learning course category with ID {category.Id} not found");
        }

        existingCategory.Name = category.Name;
        existingCategory.Description = category.Description;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.LearningCourseCategories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (entity is null)
        {
            return;
        }
        _dbContext.LearningCourseCategories.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}

