using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace HF.LearningCourseService.Host.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LearningExercisesController : ControllerBase
    {
        private readonly ILearningExerciseService _service;
        private readonly ILogger<LearningExercisesController> _logger;

        public LearningExercisesController(ILearningExerciseService service, ILogger<LearningExercisesController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet]
        [ProducesResponseType(typeof(IList<LearningExerciseDto>), StatusCodes.Status200OK)]
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
                _logger.LogWarning("Operation was cancelled while getting all learning exercises");
                return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while getting all learning exercises");
                return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while retrieving learning exercises");
            }
        }

        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(LearningExerciseDto), StatusCodes.Status200OK)]
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
                    return NotFound($"Learning exercise with ID {id} not found");
                }
                return Ok(item);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Operation was cancelled while getting learning exercise with ID: {ExerciseId}", id);
                return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument provided while getting learning exercise with ID: {ExerciseId}", id);
                return BadRequest($"Invalid request: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while getting learning exercise with ID: {ExerciseId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while retrieving the learning exercise");
            }
        }

        [HttpGet("module/{moduleId:guid}")]
        [ProducesResponseType(typeof(IList<LearningExerciseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetByModuleId(Guid moduleId, CancellationToken cancellationToken)
        {
            try
            {
                var items = await _service.GetByModuleIdAsync(moduleId, cancellationToken);
                return Ok(items);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Operation was cancelled while getting learning exercises for module ID: {ModuleId}", moduleId);
                return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument provided while getting learning exercises for module ID: {ModuleId}", moduleId);
                return BadRequest($"Invalid request: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while getting learning exercises for module ID: {ModuleId}", moduleId);
                return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while retrieving learning exercises");
            }
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateLearningExerciseDto request, CancellationToken cancellationToken)
        {
            try
            {
                var exerciseId = await _service.AddAsync(request, cancellationToken);
                return CreatedAtAction(nameof(GetById), new { id = exerciseId }, new { id = exerciseId, message = "Learning exercise created successfully" });
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Operation was cancelled while creating learning exercise");
                return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
            }
            catch (ArgumentNullException ex)
            {
                _logger.LogWarning(ex, "Null request provided while creating learning exercise");
                return BadRequest($"Invalid request: {ex.Message}");
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument provided while creating learning exercise");
                return BadRequest($"Invalid request: {ex.Message}");
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
            {
                _logger.LogWarning("Learning exercise already exists for module ID {ModuleId}", request?.LearningModuleId);
                return Conflict($"A learning exercise already exists for module ID {request?.LearningModuleId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while creating learning exercise");
                return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while creating the learning exercise");
            }
        }

        [HttpPut()]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update([FromBody] UpdateLearningExerciseDto request, CancellationToken cancellationToken)
        {
            try
            {
                await _service.UpdateAsync(request, cancellationToken);
                return NoContent();
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Operation was cancelled while updating learning exercise with ID: {ExerciseId}", request?.Id);
                return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
            }
            catch (ArgumentNullException ex)
            {
                _logger.LogWarning(ex, "Null request provided while updating learning exercise");
                return BadRequest($"Invalid request: {ex.Message}");
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument provided while updating learning exercise with ID: {ExerciseId}", request?.Id);
                return BadRequest($"Invalid request: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while updating learning exercise with ID: {ExerciseId}", request?.Id);
                return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while updating the learning exercise");
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
                _logger.LogWarning("Operation was cancelled while deleting learning exercise with ID: {ExerciseId}", id);
                return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument provided while deleting learning exercise with ID: {ExerciseId}", id);
                return BadRequest($"Invalid request: {ex.Message}");
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
            {
                _logger.LogWarning("Learning exercise with ID {ExerciseId} not found for deletion", id);
                return NotFound($"Learning exercise with ID {id} not found");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while deleting learning exercise with ID: {ExerciseId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while deleting the learning exercise");
            }
        }
    }
}

