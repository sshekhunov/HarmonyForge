using System.ComponentModel.DataAnnotations;

namespace HF.LearningCourseService.Core.Domain.DTO;

public class LearningArticleContentSectionDto
{
    [Required(ErrorMessage = "Title is required")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Title must be between 1 and 200 characters")]
    public string Title { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "Order must be non-negative")]
    public int Order { get; set; } = 0;

    public ICollection<LearningArticleContentItemDto> ContentItems { get; set; } = [];
}
