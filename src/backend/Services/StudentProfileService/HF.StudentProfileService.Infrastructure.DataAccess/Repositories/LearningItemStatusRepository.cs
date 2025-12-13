using HF.StudentProfileService.Core.Domain.Entities;
using HF.StudentProfileService.Core.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HF.StudentProfileService.Infrastructure.DataAccess.Repositories;

public class LearningItemStatusRepository : ILearningItemStatusRepository
{
    private readonly StudentProfileDbContext _dbContext;

    public LearningItemStatusRepository(StudentProfileDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IList<LearningItemStatus>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.LearningItemStatuses.AsNoTracking().ToListAsync(cancellationToken);
    }

    public async Task<LearningItemStatus?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.LearningItemStatuses.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<LearningItemStatus?> GetByStudentAndItemAsync(
        Guid studentId,
        Guid learningItemId,
        LearningItemType learningItemType,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.LearningItemStatuses
            .FirstOrDefaultAsync(s =>
                EF.Property<Guid>(s, "StudentId") == studentId &&
                s.LearningItemId == learningItemId &&
                s.LearningItemType == learningItemType,
                cancellationToken);
    }

    public async Task<IList<LearningItemStatus>> GetByStudentAndItemsAsync(
        Guid studentId,
        IEnumerable<Guid> learningItemIds,
        LearningItemType learningItemType,
        CancellationToken cancellationToken = default)
    {
        var itemIdsList = learningItemIds.ToList();
        if (!itemIdsList.Any())
        {
            return new List<LearningItemStatus>();
        }

        return await _dbContext.LearningItemStatuses
            .AsNoTracking()
            .Where(s =>
                EF.Property<Guid>(s, "StudentId") == studentId &&
                itemIdsList.Contains(s.LearningItemId) &&
                s.LearningItemType == learningItemType)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(LearningItemStatus entity, CancellationToken cancellationToken = default)
    {
        await _dbContext.LearningItemStatuses.AddAsync(entity, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(LearningItemStatus entity, CancellationToken cancellationToken = default)
    {
        _dbContext.LearningItemStatuses.Update(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.LearningItemStatuses.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (entity is null)
        {
            return;
        }
        _dbContext.LearningItemStatuses.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}

