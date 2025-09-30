namespace HF.LearningCourseService.Core.Domain.DTO;

public class LearningModuleDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ICollection<LearningModuleItemDto> Items { get; set; } = [];
}
