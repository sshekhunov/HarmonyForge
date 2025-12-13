using HF.StudentProfileService.Core.Domain.Entities;

namespace HF.StudentProfileService.Core.Domain.DTO;

public class UpdateLearningItemStatusRequest
{
    public Guid UserId { get; set; }
    public Guid LearningItemId { get; set; }
    public LearningItemType LearningItemType { get; set; }
    public bool IsCompleted { get; set; }
}

