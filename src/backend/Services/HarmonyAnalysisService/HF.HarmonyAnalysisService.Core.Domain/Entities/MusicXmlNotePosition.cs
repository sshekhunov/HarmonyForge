namespace HF.HarmonyAnalysisService.Core.Domain.Entities;

public class MusicXmlNotePosition
{
    public int MeasureArrayIndex { get; set; }
    public int MeasureIndex { get; set; }
    public int StaffEntryIndex { get; set; }
    public int VoiceEntryIndex { get; set; }
    public int NoteIndex { get; set; }
}
