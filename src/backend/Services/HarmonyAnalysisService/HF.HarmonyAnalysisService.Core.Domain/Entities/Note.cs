namespace HF.HarmonyAnalysisService.Core.Domain.Entities;

public class Note
{
    public string Pitch { get; set; } = string.Empty;
    public int Octave { get; set; }
    public decimal Duration { get; set; }
    public int Staff { get; set; }
    public int Measure { get; set; }
}
