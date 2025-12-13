namespace HF.StudentProfileService.Core.Domain.Entities;

public class LearningItemStatus: BaseEntity
{
    public Student Student { get; set; } = null!;

    public Guid LearningItemId { get; set; }

    public LearningItemType LearningItemType { get; set; }

    public DateTime DateTime { get; set; }

    public bool IsCompleted { get; set; }

    public double? Score { get; set; }
}

public enum LearningItemType
{    
    Article,
    Excercise,
    Test
}