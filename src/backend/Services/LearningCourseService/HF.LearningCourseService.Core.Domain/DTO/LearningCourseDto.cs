namespace HF.LearningCourseService.Core.Domain.DTO;

public class LearningCourseDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ICollection<LearningModuleDto> Modules { get; set; } = [];
}
