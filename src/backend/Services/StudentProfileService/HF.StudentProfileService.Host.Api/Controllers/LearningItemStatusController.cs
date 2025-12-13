using HF.StudentProfileService.Core.Domain.DTO;
using HF.StudentProfileService.Core.Domain.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace HF.StudentProfileService.Host.Api.Controllers;

[ApiController]
[Route("api/learningitemstatus")]
public class LearningItemStatusController : ControllerBase
{
    private readonly ILearningItemStatusService _service;
    private readonly ILogger<LearningItemStatusController> _logger;

    public LearningItemStatusController(
        ILearningItemStatusService service,
        ILogger<LearningItemStatusController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpPost("update")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateLearningItemStatus(
        [FromBody] UpdateLearningItemStatusRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (request == null)
            {
                _logger.LogWarning("Request body is null");
                return BadRequest(new { success = false, error = "Request body is required" });
            }

            if (request.UserId == Guid.Empty)
            {
                _logger.LogWarning("UserId is empty");
                return BadRequest(new { success = false, error = "UserId is required" });
            }

            if (request.LearningItemId == Guid.Empty)
            {
                _logger.LogWarning("LearningItemId is empty");
                return BadRequest(new { success = false, error = "LearningItemId is required" });
            }

            await _service.UpdateLearningItemStatusAsync(request, cancellationToken);
            return Ok(new { success = true });
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Operation was cancelled while updating learning item status");
            return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
        }
        catch (ArgumentNullException ex)
        {
            _logger.LogWarning(ex, "Null request provided while updating learning item status");
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument provided while updating learning item status");
            return BadRequest($"Invalid request: {ex.Message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating learning item status");
            return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while updating the learning item status");
        }
    }
}

