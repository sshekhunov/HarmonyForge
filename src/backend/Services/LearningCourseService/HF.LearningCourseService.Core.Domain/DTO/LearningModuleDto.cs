namespace HF.LearningCourseService.Core.Domain.DTO;

public class LearningModuleDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public int Number { get; set; } = 0;
}
