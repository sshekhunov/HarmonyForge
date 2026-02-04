using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Commands;

public class SpacingCheckCommand : IHarmonyCheckCommand
{
    public string Title => "Нарушение интервалов между голосами";
    public string Feedback => "Обнаружено нарушение тесситуры: интервал между соседними голосами превышает октаву.";
    public SeverityLevel Severity => SeverityLevel.Medium;

    public IReadOnlyList<(int MeasureIndex, int StaffEntryIndex)> Execute(IReadOnlyList<VerticalSlice> slices)
    {
        var mistakes = new List<(int MeasureIndex, int StaffEntryIndex)>();
        if (slices == null) return mistakes;

        foreach (var slice in slices)
        {
            if (slice.VoicePitches.Count < 2) continue;
            var ordered = slice.VoicePitches.OrderBy(v => v.MidiPitch).ToList();
            for (int i = 0; i < ordered.Count - 1; i++)
            {
                int interval = ordered[i + 1].MidiPitch - ordered[i].MidiPitch;
                if (interval > 12)
                {
                    mistakes.Add((slice.MeasureIndex, slice.StaffEntryIndex));
                    break;
                }
            }
        }
        return mistakes;
    }
}
