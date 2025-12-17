namespace HF.HarmonyAnalysisService.Core.Domain.Entities;

public class AnaysisResultPosition
{
    public int Position { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Feedback { get; set; } = string.Empty;
    public SeverityLevel Severity { get; set; }

    public IEnumerable<MusicXmlNotePosition> RelatedNotes { get; set; } = [];
}

public enum SeverityLevel
{
    Low,
    Medium,
    High
}