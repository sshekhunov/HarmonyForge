using System.ComponentModel.DataAnnotations;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Domain.DTO;

public class UpdateLearningExerciseDto
{
    [Required(ErrorMessage = "Id is required")]
    public Guid Id { get; set; }
    
    [Required(ErrorMessage = "LearningModuleId is required")]
    public Guid LearningModuleId { get; set; }
    
    [Required(ErrorMessage = "Title is required")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Title must be between 1 and 200 characters")]
    public string Title { get; set; } = string.Empty;
    
    [StringLength(1000, ErrorMessage = "Description must not exceed 1000 characters")]
    public string Description { get; set; } = string.Empty;
    
    [Range(0, int.MaxValue, ErrorMessage = "Number must be non-negative")]
    public int Number { get; set; } = 0;

    public ExcerciseAppType AppType { get; set; }

    public string AppVersion { get; set; } = string.Empty;

    public ICollection<LearningContentItemDto> TaskContentItems { get; set; } = [];

    public string TaskAppSettings { get; set; } = string.Empty;
}

