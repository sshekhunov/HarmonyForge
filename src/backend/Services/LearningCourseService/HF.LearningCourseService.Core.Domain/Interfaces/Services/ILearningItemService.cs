using HF.LearningCourseService.Core.Domain.DTO;

namespace HF.LearningCourseService.Core.Domain.Interfaces.Services;

public interface ILearningItemService
{
    Task<IList<LearningItemDto>> GetItemsByModuleIdAsync(Guid moduleId, CancellationToken cancellationToken = default);
}

