using HF.HarmonyAnalysisService.Core.Domain.Entities;

namespace HF.HarmonyAnalysisService.Core.Domain.DTO;

public class HarmonyAnalysisRequestDto
{
    public string MusicXmlContent { get; set; } = string.Empty;
    public ExerciseType ExerciseType { get; set; } = ExerciseType.Full;
}
