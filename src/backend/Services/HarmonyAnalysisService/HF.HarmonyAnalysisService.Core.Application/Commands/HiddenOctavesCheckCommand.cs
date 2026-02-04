using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Commands;

public class HiddenOctavesCheckCommand : IHarmonyCheckCommand
{
    public string Title => "Скрытые октавы";
    public string Feedback => "Обнаружены скрытые октавы: крайние голоса движутся в одном направлении к интервалу октавы.";
    public SeverityLevel Severity => SeverityLevel.Medium;

    public IReadOnlyList<(int MeasureIndex, int StaffEntryIndex)> Execute(IReadOnlyList<VerticalSlice> slices)
    {
        var mistakes = new List<(int MeasureIndex, int StaffEntryIndex)>();
        if (slices == null || slices.Count < 2) return mistakes;

        for (int s = 0; s < slices.Count - 1; s++)
        {
            var curr = slices[s];
            var next = slices[s + 1];
            if (curr.VoicePitches.Count < 2 || next.VoicePitches.Count < 2) continue;

            var currOrdered = curr.VoicePitches.OrderBy(v => v.MidiPitch).ToList();
            int currLow = currOrdered[0].MidiPitch;
            int currHigh = currOrdered[currOrdered.Count - 1].MidiPitch;
            var lowVoice = (currOrdered[0].PartIndex, currOrdered[0].VoiceIndex);
            var highVoice = (currOrdered[currOrdered.Count - 1].PartIndex, currOrdered[currOrdered.Count - 1].VoiceIndex);
            var nextByVoice = next.VoicePitches.ToDictionary(v => (v.PartIndex, v.VoiceIndex), v => v.MidiPitch);
            if (!nextByVoice.TryGetValue(lowVoice, out int nextLow) || !nextByVoice.TryGetValue(highVoice, out int nextHigh))
                continue;
            int intervalNext = nextHigh - nextLow;
            int motionLow = nextLow - currLow;
            int motionHigh = nextHigh - currHigh;
            bool sameDirection = (motionLow > 0 && motionHigh > 0) || (motionLow < 0 && motionHigh < 0);
            bool hasMotion = motionLow != 0 || motionHigh != 0;
            bool isOctave = intervalNext == 12 || intervalNext == -12;
            if (isOctave && sameDirection && hasMotion)
                mistakes.Add((next.MeasureIndex, next.StaffEntryIndex));
        }
        return mistakes;
    }
}
