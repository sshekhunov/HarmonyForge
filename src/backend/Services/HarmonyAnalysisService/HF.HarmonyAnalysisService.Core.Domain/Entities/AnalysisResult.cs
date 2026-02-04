namespace HF.HarmonyAnalysisService.Core.Domain.Entities;

public class AnalysisResult
{
    public double Score { get; set; }
    public string Feedback { get; set; } = string.Empty;

    public IEnumerable<AnaysisResultPosition> Positions { get; set; } = [];
}
