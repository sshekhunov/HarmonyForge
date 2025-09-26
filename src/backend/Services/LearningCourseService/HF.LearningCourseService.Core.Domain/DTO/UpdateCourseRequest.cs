namespace HF.LearningCourseService.Core.Domain.DTO;

public class UpdateCourseRequest
{
    public Guid Id { get; set; } = Guid.Empty;

    public string Title { get; set; } = string.Empty;
	public string Description { get; set; } = string.Empty;
}


