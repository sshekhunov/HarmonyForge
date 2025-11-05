using HF.LearningCourseService.Core.Domain.DTO;

namespace HF.LearningCourseService.Core.Domain.Interfaces.Services;

public interface ILearningArticleService
{
    Task<IList<LearningArticleDto>> GetAllAsync(CancellationToken cancellationToken);

    Task<LearningArticleDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<IList<LearningArticleDto>> GetByModuleIdAsync(Guid moduleId, CancellationToken cancellationToken);

    Task<Guid> AddAsync(CreateLearningArticleDto request, CancellationToken cancellationToken);

    Task UpdateAsync(UpdateLearningArticleDto request, CancellationToken cancellationToken);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}
