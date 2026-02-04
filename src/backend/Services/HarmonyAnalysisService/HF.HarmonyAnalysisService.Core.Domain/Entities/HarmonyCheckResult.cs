namespace HF.HarmonyAnalysisService.Core.Domain.Entities;

public class HarmonyCheckResult
{
    public IReadOnlyList<AnaysisResultPosition> Positions { get; init; } = [];
    public int TotalMistakeCount { get; init; }
}
