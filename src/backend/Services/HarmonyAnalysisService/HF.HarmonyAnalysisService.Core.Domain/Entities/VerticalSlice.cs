namespace HF.HarmonyAnalysisService.Core.Domain.Entities;

public class VerticalSlice
{
    public int MeasureIndex { get; set; }
    public int StaffEntryIndex { get; set; }
    public List<VoicePitch> VoicePitches { get; set; } = new();
}
