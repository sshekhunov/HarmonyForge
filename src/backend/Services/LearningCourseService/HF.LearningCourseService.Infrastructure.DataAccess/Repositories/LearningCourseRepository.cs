using HF.LearningCourseService.Core.Domain.Entities;
using HF.LearningCourseService.Core.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HF.LearningCourseService.Infrastructure.DataAccess.Repositories
{
	public class LearningCourseRepository: ILearningCourseRepository
	{
		private readonly LearningCourseDbContext _dbContext;

		public LearningCourseRepository(LearningCourseDbContext dbContext)
		{
			_dbContext = dbContext;
		}

		public async Task<IList<LearningCourse>> GetAllAsync(CancellationToken cancellationToken = default)
		{
			return await _dbContext.LearningCourses.AsNoTracking().ToListAsync(cancellationToken);
		}

		public async Task<LearningCourse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
		{
			return await _dbContext.LearningCourses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
		}

		public async Task<LearningCourse?> GetByIdForUpdateAsync(Guid id, CancellationToken cancellationToken = default)
		{
			return await _dbContext.LearningCourses.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
		}

		public async Task AddAsync(LearningCourse course, CancellationToken cancellationToken = default)
		{
			await _dbContext.LearningCourses.AddAsync(course, cancellationToken);
			await _dbContext.SaveChangesAsync(cancellationToken);
		}

		public async Task UpdateAsync(LearningCourse course, CancellationToken cancellationToken = default)
		{
			_dbContext.LearningCourses.Update(course);
			await _dbContext.SaveChangesAsync(cancellationToken);
		}

		public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
		{
			var entity = await _dbContext.LearningCourses.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
			if (entity is null)
			{
				return;
			}
			_dbContext.LearningCourses.Remove(entity);
			await _dbContext.SaveChangesAsync(cancellationToken);
		}
	}
}
