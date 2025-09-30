using System.ComponentModel.DataAnnotations;

namespace HF.LearningCourseService.Core.Domain.DTO;

public class CreateLearningArticleDto
{
    [Required(ErrorMessage = "LearningModuleId is required")]
    public Guid LearningModuleId { get; set; }
    
    public ICollection<LearningArticleContentItemDto> ContentItems { get; set; } = [];
}
