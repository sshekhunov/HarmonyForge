using HF.StudentProfileService.Core.Domain.Entities;

namespace HF.StudentProfileService.Core.Domain.DTO;

public class GetLearningItemStatusesRequest
{
    public Guid UserId { get; set; }
    public List<Guid> LearningItemIds { get; set; } = new();
    public LearningItemType LearningItemType { get; set; }
}

public class GetMultipleLearningItemStatusesRequest
{
    public Guid UserId { get; set; }
    public List<LearningItemStatusRequestItem> Items { get; set; } = new();
}

public class LearningItemStatusRequestItem
{
    public Guid LearningItemId { get; set; }
    public LearningItemType LearningItemType { get; set; }
}

