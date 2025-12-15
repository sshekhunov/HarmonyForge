using System.ComponentModel.DataAnnotations;

namespace HF.LearningCourseService.Core.Domain.DTO;

public class CreateCourseDto
{
	[Required(ErrorMessage = "Code is required")]
	[StringLength(50, MinimumLength = 1, ErrorMessage = "Code must be between 1 and 50 characters")]
	public string Code { get; set; } = string.Empty;
	
	[Required(ErrorMessage = "Title is required")]
	[StringLength(200, MinimumLength = 1, ErrorMessage = "Title must be between 1 and 200 characters")]
	public string Title { get; set; } = string.Empty;
	
	[Required(ErrorMessage = "Description is required")]
	[StringLength(1000, MinimumLength = 1, ErrorMessage = "Description must be between 1 and 1000 characters")]
	public string Description { get; set; } = string.Empty;
	
	public Guid? CategoryId { get; set; }
	
	public ICollection<LearningModuleDto> Modules { get; set; } = [];
}
