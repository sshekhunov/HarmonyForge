using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace HF.LearningCourseService.Host.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LearningCourseCategoriesController : ControllerBase
{
    private readonly ILearningCourseCategoryService _service;
    private readonly ILogger<LearningCourseCategoriesController> _logger;

    public LearningCourseCategoriesController(ILearningCourseCategoryService service, ILogger<LearningCourseCategoriesController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IList<LearningCourseCategoryDto>), StatusCodes.Status200OK)]
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
            _logger.LogWarning("Operation was cancelled while getting all learning course categories");
            return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while getting all learning course categories");
            return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while retrieving learning course categories");
        }
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(LearningCourseCategoryDto), StatusCodes.Status200OK)]
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
                return NotFound($"Learning course category with ID {id} not found");
            }
            return Ok(item);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Operation was cancelled while getting learning course category with ID: {CategoryId}", id);
            return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument provided while getting learning course category with ID: {CategoryId}", id);
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while getting learning course category with ID: {CategoryId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while retrieving the learning course category");
        }
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Create([FromBody] CreateLearningCourseCategoryDto request, CancellationToken cancellationToken)
    {
        try
        {
            var categoryId = await _service.AddAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = categoryId }, new { id = categoryId, message = "Learning course category created successfully" });
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Operation was cancelled while creating learning course category");
            return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
        }
        catch (ArgumentNullException ex)
        {
            _logger.LogWarning(ex, "Null request provided while creating learning course category");
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument provided while creating learning course category");
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while creating learning course category");
            return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while creating the learning course category");
        }
    }

    [HttpPut]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Update([FromBody] UpdateLearningCourseCategoryDto request, CancellationToken cancellationToken)
    {
        try
        {
            await _service.UpdateAsync(request, cancellationToken);
            return NoContent();
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Operation was cancelled while updating learning course category with ID: {CategoryId}", request?.Id);
            return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
        }
        catch (ArgumentNullException ex)
        {
            _logger.LogWarning(ex, "Null request provided while updating learning course category");
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument provided while updating learning course category with ID: {CategoryId}", request?.Id);
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
        {
            _logger.LogWarning("Learning course category with ID {CategoryId} not found for update", request?.Id);
            return NotFound($"Learning course category with ID {request?.Id} not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating learning course category with ID: {CategoryId}", request?.Id);
            return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while updating the learning course category");
        }
    }

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
            _logger.LogWarning("Operation was cancelled while deleting learning course category with ID: {CategoryId}", id);
            return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument provided while deleting learning course category with ID: {CategoryId}", id);
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while deleting learning course category with ID: {CategoryId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while deleting the learning course category");
        }
    }
}

