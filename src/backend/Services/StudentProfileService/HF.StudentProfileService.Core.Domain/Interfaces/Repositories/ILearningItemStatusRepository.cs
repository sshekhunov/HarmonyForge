using HF.StudentProfileService.Core.Domain.Entities;

namespace HF.StudentProfileService.Core.Domain.Interfaces.Repositories;

public interface ILearningItemStatusRepository : IRepository<LearningItemStatus>
{
    Task<LearningItemStatus?> GetByStudentAndItemAsync(
        Guid studentId,
        Guid learningItemId,
        LearningItemType learningItemType,
        CancellationToken cancellationToken = default);

    Task<IList<LearningItemStatus>> GetByStudentAndItemsAsync(
        Guid studentId,
        IEnumerable<Guid> learningItemIds,
        LearningItemType learningItemType,
        CancellationToken cancellationToken = default);
}

