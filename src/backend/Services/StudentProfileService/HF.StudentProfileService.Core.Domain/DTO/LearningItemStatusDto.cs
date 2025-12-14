namespace HF.StudentProfileService.Core.Domain.DTO;

public class LearningItemStatusDto
{
    public Guid LearningItemId { get; set; }
    public bool IsCompleted { get; set; }
    public double? Score { get; set; }
}

