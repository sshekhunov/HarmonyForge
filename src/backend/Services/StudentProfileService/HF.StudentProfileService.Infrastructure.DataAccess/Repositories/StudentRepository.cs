using HF.StudentProfileService.Core.Domain.Entities;
using HF.StudentProfileService.Core.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HF.StudentProfileService.Infrastructure.DataAccess.Repositories;

public class StudentRepository : IStudentRepository
{
    private readonly StudentProfileDbContext _dbContext;

    public StudentRepository(StudentProfileDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IList<Student>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Students.AsNoTracking().ToListAsync(cancellationToken);
    }

    public async Task<Student?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
    }

    public async Task<Student?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Students.FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);
    }

    public async Task AddAsync(Student entity, CancellationToken cancellationToken = default)
    {
        await _dbContext.Students.AddAsync(entity, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Student entity, CancellationToken cancellationToken = default)
    {
        _dbContext.Students.Update(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.Students.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (entity is null)
        {
            return;
        }
        _dbContext.Students.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}

