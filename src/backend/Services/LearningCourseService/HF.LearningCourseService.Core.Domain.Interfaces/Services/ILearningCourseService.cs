using HF.LearningCourseService.Core.Domain.DTO;

namespace HF.LearningCourseService.Core.Domain.Interfaces.Services;

public interface ILearningCourseService
{
    Task<IList<LearningCourseDto>> GetAllAsync(CancellationToken cancellationToken);

    Task<LearningCourseDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<Guid> AddAsync(CreateCourseDto request, CancellationToken cancellationToken);

    Task UpdateAsync(UpdateCourseDto request, CancellationToken cancellationToken);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}