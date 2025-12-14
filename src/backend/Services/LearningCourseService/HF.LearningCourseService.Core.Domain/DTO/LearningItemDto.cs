namespace HF.LearningCourseService.Core.Domain.DTO;

public class LearningItemDto
{
    public Guid Id { get; set; }
    public Guid LearningModuleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int Number { get; set; } = 0;
    public LearningItemType ItemType { get; set; }
}

public enum LearningItemType
{
    Article = 0,
    Exercise = 1
}

