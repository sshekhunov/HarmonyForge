using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Commands;

public class ParallelFifthsCheckCommand : IHarmonyCheckCommand
{
    public string Title => "Параллельные квинты";
    public string Feedback => "Обнаружены параллельные квинты: два голоса движутся в одном направлении, сохраняя интервал квинты.";
    public SeverityLevel Severity => SeverityLevel.High;

    public IReadOnlyList<(int MeasureIndex, int StaffEntryIndex)> Execute(IReadOnlyList<VerticalSlice> slices)
    {
        var mistakes = new List<(int MeasureIndex, int StaffEntryIndex)>();
        if (slices == null || slices.Count < 2) return mistakes;

        for (int s = 0; s < slices.Count - 1; s++)
        {
            var curr = slices[s];
            var next = slices[s + 1];
            var currByVoice = curr.VoicePitches.ToDictionary(v => (v.PartIndex, v.VoiceIndex), v => v.MidiPitch);
            var nextByVoice = next.VoicePitches.ToDictionary(v => (v.PartIndex, v.VoiceIndex), v => v.MidiPitch);
            var voices = currByVoice.Keys.ToList();

            for (int i = 0; i < voices.Count; i++)
            {
                for (int j = i + 1; j < voices.Count; j++)
                {
                    var v1 = voices[i];
                    var v2 = voices[j];
                    if (!nextByVoice.TryGetValue(v1, out int p1Next) || !nextByVoice.TryGetValue(v2, out int p2Next))
                        continue;
                    int p1 = currByVoice[v1];
                    int p2 = currByVoice[v2];
                    int interval1 = p2 - p1;
                    int interval2 = p2Next - p1Next;
                    int motion1 = p1Next - p1;
                    int motion2 = p2Next - p2;
                    bool isFifth1 = interval1 == 7 || interval1 == -7;
                    bool isFifth2 = interval2 == 7 || interval2 == -7;
                    bool sameDirection = (motion1 > 0 && motion2 > 0) || (motion1 < 0 && motion2 < 0);
                    bool hasMotion = motion1 != 0 || motion2 != 0;
                    if (isFifth1 && isFifth2 && sameDirection && hasMotion)
                    {
                        mistakes.Add((next.MeasureIndex, next.StaffEntryIndex));
                        break;
                    }
                }
            }
        }
        return mistakes;
    }
}
