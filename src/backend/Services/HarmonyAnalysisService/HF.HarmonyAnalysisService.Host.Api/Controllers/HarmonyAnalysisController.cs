using Microsoft.AspNetCore.Mvc;
using HF.HarmonyAnalysisService.Core.Domain.DTO;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Host.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class HarmonyAnalysisController : ControllerBase
    {
        private readonly IHarmonyAnalysisService _harmonyAnalysisService;

        public HarmonyAnalysisController(IHarmonyAnalysisService harmonyAnalysisService)
        {
            _harmonyAnalysisService = harmonyAnalysisService;
        }


        [HttpPost("AnalyseHarmony")]
        public async Task<IActionResult> AnalyseHarmony([FromBody] HarmonyAnalysisRequestDto request)
        {
            try
            {
                var result = await _harmonyAnalysisService.AnalyseHarmonyAsync(request);
                
                if (result.IsSuccessful)
                {
                    return Ok(result);
                }
                else
                {
                    return BadRequest(result);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new HarmonyAnalysisResponseDto
                {
                    IsSuccessful = false,
                    ErrorMessage = $"Internal server error: {ex.Message}"
                });
            }
        }
    }
}
