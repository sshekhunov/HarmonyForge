using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Domain.Interfaces.Services;

public interface ILearningCourseService
{
    Task<IList<LearningCourse>> GetAllAsync(CancellationToken cancellationToken);

    Task<LearningCourse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<Guid> AddAsync(CreateCourseRequest request, CancellationToken cancellationToken);

    Task UpdateAsync(UpdateCourseRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}