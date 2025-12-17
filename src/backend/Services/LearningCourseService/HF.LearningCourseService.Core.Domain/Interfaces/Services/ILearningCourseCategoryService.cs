using HF.LearningCourseService.Core.Domain.DTO;

namespace HF.LearningCourseService.Core.Domain.Interfaces.Services;

public interface ILearningCourseCategoryService
{
    Task<IList<LearningCourseCategoryDto>> GetAllAsync(CancellationToken cancellationToken);

    Task<LearningCourseCategoryDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<Guid> AddAsync(CreateLearningCourseCategoryDto request, CancellationToken cancellationToken);

    Task UpdateAsync(UpdateLearningCourseCategoryDto request, CancellationToken cancellationToken);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

