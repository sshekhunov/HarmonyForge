using HF.HarmonyAnalysisService.Core.Domain.Entities;

namespace HF.HarmonyAnalysisService.Core.Domain.DTO;

public class HarmonyAnalysisResponseDto
{
    public int NoteCount { get; set; }
    public bool IsSuccessful { get; set; }
    public string? ErrorMessage { get; set; }
    public AnalysisResult? AnalysisResult { get; set; }
}
