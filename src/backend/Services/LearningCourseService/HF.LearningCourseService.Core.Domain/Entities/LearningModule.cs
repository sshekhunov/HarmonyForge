namespace HF.LearningCourseService.Core.Domain.Entities;

public class LearningModule
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public ICollection<LearningModuleItem> Items { get; set; } = [];
}