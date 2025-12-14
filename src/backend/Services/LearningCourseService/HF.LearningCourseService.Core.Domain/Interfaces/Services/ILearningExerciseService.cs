using HF.LearningCourseService.Core.Domain.DTO;

namespace HF.LearningCourseService.Core.Domain.Interfaces.Services;

public interface ILearningExerciseService
{
    Task<IList<LearningExerciseDto>> GetAllAsync(CancellationToken cancellationToken);

    Task<LearningExerciseDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<IList<LearningExerciseDto>> GetByModuleIdAsync(Guid moduleId, CancellationToken cancellationToken);

    Task<Guid> AddAsync(CreateLearningExerciseDto request, CancellationToken cancellationToken);

    Task UpdateAsync(UpdateLearningExerciseDto request, CancellationToken cancellationToken);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

