using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Domain.Interfaces.Repositories;

public interface ILearningArticleRepository : IRepository<LearningArticle>
{
    Task<IList<LearningArticle>> GetByModuleIdAsync(Guid moduleId, CancellationToken cancellationToken = default);
}
