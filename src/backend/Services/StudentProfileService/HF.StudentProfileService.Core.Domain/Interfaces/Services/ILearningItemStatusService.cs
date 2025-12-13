using HF.StudentProfileService.Core.Domain.DTO;

namespace HF.StudentProfileService.Core.Domain.Interfaces.Services;

public interface ILearningItemStatusService
{
    Task UpdateLearningItemStatusAsync(UpdateLearningItemStatusRequest request, CancellationToken cancellationToken = default);
    Task<IList<LearningItemStatusDto>> GetLearningItemStatusesAsync(GetLearningItemStatusesRequest request, CancellationToken cancellationToken = default);
}

