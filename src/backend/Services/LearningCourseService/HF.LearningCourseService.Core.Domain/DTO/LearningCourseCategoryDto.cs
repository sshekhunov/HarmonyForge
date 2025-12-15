namespace HF.LearningCourseService.Core.Domain.DTO;

public class LearningCourseCategoryDto
{
    public Guid? Id { get; set; }
    
    public string Name { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
}

