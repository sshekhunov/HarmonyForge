using HF.LearningCourseService.Core.Domain.DTO;
using HF.LearningCourseService.Core.Domain.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace HF.LearningCourseService.Host.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LearningItemsController : ControllerBase
    {
        private readonly ILearningItemService _service;
        private readonly ILogger<LearningItemsController> _logger;

        public LearningItemsController(ILearningItemService service, ILogger<LearningItemsController> logger)
        {
            _service = service;
            _logger = logger;
        }

        [HttpGet("module/{moduleId:guid}")]
        [ProducesResponseType(typeof(IList<LearningItemDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetByModuleId(Guid moduleId, CancellationToken cancellationToken)
        {
            try
            {
                var items = await _service.GetItemsByModuleIdAsync(moduleId, cancellationToken);
                return Ok(items);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Operation was cancelled while getting learning items for module ID: {ModuleId}", moduleId);
                return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid argument provided while getting learning items for module ID: {ModuleId}", moduleId);
                return BadRequest($"Invalid request: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while getting learning items for module ID: {ModuleId}", moduleId);
                return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while retrieving learning items");
            }
        }
    }
}

