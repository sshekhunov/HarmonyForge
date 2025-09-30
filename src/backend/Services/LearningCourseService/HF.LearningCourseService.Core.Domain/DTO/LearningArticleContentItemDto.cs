using System.ComponentModel.DataAnnotations;

namespace HF.LearningCourseService.Core.Domain.DTO;

public class LearningArticleContentItemDto
{
    [Required(ErrorMessage = "Content is required")]
    [StringLength(5000, MinimumLength = 1, ErrorMessage = "Content must be between 1 and 5000 characters")]
    public string Content { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "Section block number must be non-negative")]
    public int SectionBlockNumber { get; set; } = 0;
}
