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
		private readonly ILogger<LearningCoursesController> _logger;

		public LearningCoursesController(ILearningCourseService service, ILogger<LearningCoursesController> logger)
		{
			_service = service;
			_logger = logger;
		}

		/// <summary>
		/// Gets all learning courses
		/// </summary>
		/// <param name="cancellationToken">Cancellation token</param>
		/// <returns>List of learning courses</returns>
		[HttpGet]
		[ProducesResponseType(typeof(IList<LearningCourseDto>), StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
		{
			try
			{
				var items = await _service.GetAllAsync(cancellationToken);
				return Ok(items);
			}
			catch (OperationCanceledException)
			{
				_logger.LogWarning("Operation was cancelled while getting all learning courses");
				return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "An error occurred while getting all learning courses");
				return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while retrieving learning courses");
			}
		}

		/// <summary>
		/// Gets a learning course by ID
		/// </summary>
		/// <param name="id">Course ID</param>
		/// <param name="cancellationToken">Cancellation token</param>
		/// <returns>Learning course or 404 if not found</returns>
		[HttpGet("{id:guid}")]
		[ProducesResponseType(typeof(LearningCourseDto), StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status404NotFound)]
		[ProducesResponseType(StatusCodes.Status400BadRequest)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
		{
			try
			{
				var item = await _service.GetByIdAsync(id, cancellationToken);
				if (item is null)
				{
					return NotFound($"Learning course with ID {id} not found");
				}
				return Ok(item);
			}
			catch (OperationCanceledException)
			{
				_logger.LogWarning("Operation was cancelled while getting learning course with ID: {CourseId}", id);
				return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
			}
			catch (ArgumentException ex)
			{
				_logger.LogWarning(ex, "Invalid argument provided while getting learning course with ID: {CourseId}", id);
				return BadRequest($"Invalid request: {ex.Message}");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "An error occurred while getting learning course with ID: {CourseId}", id);
				return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while retrieving the learning course");
			}
		}

		/// <summary>
		/// Creates a new learning course
		/// </summary>
		/// <param name="request">Course creation request</param>
		/// <param name="cancellationToken">Cancellation token</param>
		/// <returns>Created course location or error details</returns>
		[HttpPost]
		[ProducesResponseType(StatusCodes.Status201Created)]
		[ProducesResponseType(StatusCodes.Status400BadRequest)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		public async Task<IActionResult> Create([FromBody] CreateCourseDto request, CancellationToken cancellationToken)
		{
			try
			{
				var courseId = await _service.AddAsync(request, cancellationToken);
				return CreatedAtAction(nameof(GetById), new { id = courseId }, new { id = courseId, message = "Learning course created successfully" });
			}
			catch (OperationCanceledException)
			{
				_logger.LogWarning("Operation was cancelled while creating learning course");
				return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
			}
			catch (ArgumentNullException ex)
			{
				_logger.LogWarning(ex, "Null request provided while creating learning course");
				return BadRequest($"Invalid request: {ex.Message}");
			}
			catch (ArgumentException ex)
			{
				_logger.LogWarning(ex, "Invalid argument provided while creating learning course");
				return BadRequest($"Invalid request: {ex.Message}");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "An error occurred while creating learning course");
				return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while creating the learning course");
			}
		}

		/// <summary>
		/// Updates an existing learning course
		/// </summary>
		/// <param name="request">Course update request</param>
		/// <param name="cancellationToken">Cancellation token</param>
		/// <returns>No content on success or error details</returns>
		[HttpPut()]
		[ProducesResponseType(StatusCodes.Status204NoContent)]
		[ProducesResponseType(StatusCodes.Status400BadRequest)]
		[ProducesResponseType(StatusCodes.Status404NotFound)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		public async Task<IActionResult> Update([FromBody] UpdateCourseDto request, CancellationToken cancellationToken)
		{
			try
			{
				await _service.UpdateAsync(request, cancellationToken);
				return NoContent();
			}
			catch (OperationCanceledException)
			{
				_logger.LogWarning("Operation was cancelled while updating learning course with ID: {CourseId}", request?.Id);
				return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
			}
			catch (ArgumentNullException ex)
			{
				_logger.LogWarning(ex, "Null request provided while updating learning course");
				return BadRequest($"Invalid request: {ex.Message}");
			}
			catch (ArgumentException ex)
			{
				_logger.LogWarning(ex, "Invalid argument provided while updating learning course with ID: {CourseId}", request?.Id);
				return BadRequest($"Invalid request: {ex.Message}");
			}
			catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
			{
				_logger.LogWarning("Learning course with ID {CourseId} not found for update", request?.Id);
				return NotFound($"Learning course with ID {request?.Id} not found");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "An error occurred while updating learning course with ID: {CourseId}", request?.Id);
				return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while updating the learning course");
			}
		}

		/// <summary>
		/// Deletes a learning course by ID
		/// </summary>
		/// <param name="id">Course ID</param>
		/// <param name="cancellationToken">Cancellation token</param>
		/// <returns>No content on success or error details</returns>
		[HttpDelete("{id:guid}")]
		[ProducesResponseType(StatusCodes.Status204NoContent)]
		[ProducesResponseType(StatusCodes.Status400BadRequest)]
		[ProducesResponseType(StatusCodes.Status404NotFound)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
		{
			try
			{
				await _service.DeleteAsync(id, cancellationToken);
				return NoContent();
			}
			catch (OperationCanceledException)
			{
				_logger.LogWarning("Operation was cancelled while deleting learning course with ID: {CourseId}", id);
				return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
			}
			catch (ArgumentException ex)
			{
				_logger.LogWarning(ex, "Invalid argument provided while deleting learning course with ID: {CourseId}", id);
				return BadRequest($"Invalid request: {ex.Message}");
			}
			catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
			{
				_logger.LogWarning("Learning course with ID {CourseId} not found for deletion", id);
				return NotFound($"Learning course with ID {id} not found");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "An error occurred while deleting learning course with ID: {CourseId}", id);
				return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while deleting the learning course");
			}
		}
	}
}


