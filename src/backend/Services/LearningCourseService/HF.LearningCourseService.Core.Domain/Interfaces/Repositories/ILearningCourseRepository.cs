using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Domain.Interfaces.Repositories;

public interface ILearningCourseRepository: IRepository<LearningCourse>
{
    Task<LearningCourse?> GetByIdForUpdateAsync(Guid id, CancellationToken cancellationToken = default);
}
