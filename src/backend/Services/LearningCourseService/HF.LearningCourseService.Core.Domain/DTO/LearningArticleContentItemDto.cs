using System.ComponentModel.DataAnnotations;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Domain.DTO;

public class LearningContentItemDto
{
    [Required(ErrorMessage = "Content is required")]
    [StringLength(5000, MinimumLength = 1, ErrorMessage = "Content must be between 1 and 5000 characters")]
    public string Content { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "Order must be non-negative")]
    public int Order { get; set; } = 0;

    [Required(ErrorMessage = "Type is required")]
    public LearningContentItemType Type { get; set; }
}
