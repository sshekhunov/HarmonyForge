namespace HF.LearningCourseService.Core.Domain.Entities;

public class LearningModuleItem : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty; 
    public ModuleItemType Type { get; set; }
}

public enum ModuleItemType
{
    Article,
    Excercise,
    Test
}