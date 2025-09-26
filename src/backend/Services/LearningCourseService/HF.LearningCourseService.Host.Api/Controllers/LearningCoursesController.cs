using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace HF.LearningCourseService.Host.Api.Controllers
{
	[ApiController]
	[Route("api/[controller]")]
	public class LearningCoursesController : ControllerBase
	{
		private readonly ILearningCourseService _service;

		public LearningCoursesController(ILearningCourseService service)
		{
			_service = service;
		}

		[HttpGet]
		public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
		{
			var items = await _service.GetAllAsync(cancellationToken);
			return Ok(items);
		}

		[HttpGet("{id:guid}")]
		public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
		{
			var item = await _service.GetByIdAsync(id, cancellationToken);
			if (item is null)
			{
				return NotFound();
			}
			return Ok(item);
		}

		[HttpPost]
		public async Task<IActionResult> Create([FromBody] CreateCourseRequest request, CancellationToken cancellationToken)
		{
			var Id = await _service.AddAsync(request, cancellationToken);
			return CreatedAtAction(nameof(GetById), new { id = Id }, null);
		}

		[HttpPut()]
		public async Task<IActionResult> Update([FromBody] UpdateCourseRequest request, CancellationToken cancellationToken)
		{
            await _service.UpdateAsync(request, cancellationToken);
            return NoContent();
		}

		[HttpDelete("{id:guid}")]
		public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
		{
			await _service.DeleteAsync(id, cancellationToken);
			return NoContent();
		}
	}
}


