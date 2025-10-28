namespace HF.HarmonyAnalysisService.Core.Domain.Entities;

public class MusicXmlScore
{
    public string Title { get; set; } = string.Empty;
    public string Composer { get; set; } = string.Empty;
    public List<Note> Notes { get; set; } = new();
    public int PartCount { get; set; }
}
