﻿namespace HF.LearningCourseService.Core.Domain.DTO;

public class CreateCourseRequest
{
	public string Title { get; set; } = string.Empty;
	public string Description { get; set; } = string.Empty;
}
