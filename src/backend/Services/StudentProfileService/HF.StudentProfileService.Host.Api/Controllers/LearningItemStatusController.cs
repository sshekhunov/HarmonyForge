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
            await _service.UpdateLearningItemStatusAsync(request, cancellationToken);
            return Ok(new { success = true });
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Operation was cancelled while updating learning item status");
            return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while updating learning item status");
            return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while updating the learning item status");
        }
    }

    [HttpPost("get-statuses")]
    [ProducesResponseType(typeof(IList<LearningItemStatusDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetLearningItemStatuses(
        [FromBody] GetLearningItemStatusesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var statuses = await _service.GetLearningItemStatusesAsync(request, cancellationToken);
            return Ok(statuses);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Operation was cancelled while getting learning item statuses");
            return StatusCode(StatusCodes.Status499ClientClosedRequest, "Operation was cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while getting learning item statuses");
            return StatusCode(StatusCodes.Status500InternalServerError, "An internal server error occurred while getting learning item statuses");
        }
    }
}

