using HF.LearningCourseService.Core.Domain.Entities;
using HF.LearningCourseService.Host.Api.Models;
using HF.LearningCourseService.Infrastructure.DataAccess.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace HF.LearningCourseService.Host.Api.Controllers
{
	[ApiController]
	[Route("api/[controller]")]
	public class LearningCoursesController : ControllerBase
	{
		private readonly LearningCourseRepository _repository;

		public LearningCoursesController(LearningCourseRepository repository)
		{
			_repository = repository;
		}

		[HttpGet]
		public async Task<IActionResult> GetAll()
		{
			var items = await _repository.GetAllAsync();
			return Ok(items);
		}

		[HttpGet("{id:guid}")]
		public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
		{
			var item = await _repository.GetByIdAsync(id, cancellationToken);
			if (item is null)
			{
				return NotFound();
			}
			return Ok(item);
		}

		[HttpPost]
		public async Task<IActionResult> Create([FromBody] CreateCourseRequest request, CancellationToken cancellationToken)
		{
			var entity = new LearningCourse
			{
				Id = Guid.NewGuid(),
				Title = request.Title,
				Description = request.Description
			};

			await _repository.AddAsync(entity, cancellationToken);
			return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
		}

		[HttpDelete("{id:guid}")]
		public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
		{
			await _repository.DeleteAsync(id, cancellationToken);
			return NoContent();
		}
	}
}


