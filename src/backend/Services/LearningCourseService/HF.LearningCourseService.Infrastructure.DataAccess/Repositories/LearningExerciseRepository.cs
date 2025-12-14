using HF.LearningCourseService.Core.Domain.Entities;
using HF.LearningCourseService.Core.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HF.LearningCourseService.Infrastructure.DataAccess.Repositories
{
    public class LearningExerciseRepository : ILearningExerciseRepository
    {
        private readonly LearningCourseDbContext _dbContext;

        public LearningExerciseRepository(LearningCourseDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IList<LearningExcercise>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            return await _dbContext.LearningExercises.AsNoTracking().ToListAsync(cancellationToken);
        }

        public async Task<LearningExcercise?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _dbContext.LearningExercises.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        }

        public async Task AddAsync(LearningExcercise exercise, CancellationToken cancellationToken = default)
        {
            await _dbContext.LearningExercises.AddAsync(exercise, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task UpdateAsync(LearningExcercise exercise, CancellationToken cancellationToken = default)
        {
            _dbContext.LearningExercises.Update(exercise);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var entity = await _dbContext.LearningExercises.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
            if (entity is null)
            {
                return;
            }
            _dbContext.LearningExercises.Remove(entity);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<IList<LearningExcercise>> GetByModuleIdAsync(Guid moduleId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.LearningExercises
                .AsNoTracking()
                .Where(e => e.LearningModuleId == moduleId)
                .ToListAsync(cancellationToken);
        }
    }
}

