using HF.HarmonyAnalysisService.Core.Domain.DTO;

namespace HF.HarmonyAnalysisService.Core.Domain.Interfaces;

public interface IHarmonyAnalysisService
{
    Task<HarmonyAnalysisResponseDto> AnalyseHarmonyAsync(HarmonyAnalysisRequestDto request);
}
