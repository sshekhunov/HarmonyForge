using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Domain.Interfaces.Repositories;

public interface ILearningExerciseRepository : IRepository<LearningExcercise>
{
    Task<IList<LearningExcercise>> GetByModuleIdAsync(Guid moduleId, CancellationToken cancellationToken = default);
}

