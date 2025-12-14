using System.ComponentModel.DataAnnotations;
using HF.LearningCourseService.Core.Domain.Entities;

namespace HF.LearningCourseService.Core.Domain.DTO;

public class CreateLearningExerciseDto
{
    [Required(ErrorMessage = "LearningModuleId is required")]
    public Guid LearningModuleId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int Number { get; set; } = 0;

    public ExcerciseAppType AppType { get; set; }

    public string AppVersion { get; set; } = string.Empty;

    public ICollection<LearningContentItemDto> TaskContentItems { get; set; } = [];

    public string TaskAppSettings { get; set; } = string.Empty;
}

