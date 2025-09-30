using HF.LearningCourseService.Core.Domain.Entities;
using HF.LearningCourseService.Core.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HF.LearningCourseService.Infrastructure.DataAccess.Repositories
{
    public class LearningArticleRepository : ILearningArticleRepository
    {
        private readonly LearningCourseDbContext _dbContext;

        public LearningArticleRepository(LearningCourseDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IList<LearningArticle>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            return await _dbContext.LearningArticles.AsNoTracking().ToListAsync(cancellationToken);
        }

        public async Task<LearningArticle?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _dbContext.LearningArticles.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        }

        public async Task AddAsync(LearningArticle article, CancellationToken cancellationToken = default)
        {
            await _dbContext.LearningArticles.AddAsync(article, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task UpdateAsync(LearningArticle article, CancellationToken cancellationToken = default)
        {
            _dbContext.LearningArticles.Update(article);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var entity = await _dbContext.LearningArticles.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
            if (entity is null)
            {
                return;
            }
            _dbContext.LearningArticles.Remove(entity);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<IList<LearningArticle>> GetByModuleIdAsync(Guid moduleId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.LearningArticles
                .AsNoTracking()
                .Where(a => a.LearningModuleId == moduleId)
                .ToListAsync(cancellationToken);
        }
    }
}
