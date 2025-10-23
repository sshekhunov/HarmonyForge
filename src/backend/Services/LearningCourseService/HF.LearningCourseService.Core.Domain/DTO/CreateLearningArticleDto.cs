using System.ComponentModel.DataAnnotations;

namespace HF.LearningCourseService.Core.Domain.DTO;

public class CreateLearningArticleDto
{
    [Required(ErrorMessage = "LearningModuleId is required")]
    public Guid LearningModuleId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int Number { get; set; } = 0;

    public ICollection<LearningArticleContentSectionDto> ContentSections { get; set; } = [];
}
