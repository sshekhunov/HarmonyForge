using HF.HarmonyAnalysisService.Core.Application.Commands;
using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Strategies;

public class BasicHarmonyCheckStrategy : IHarmonyCheckStrategy
{
    public HarmonyCheckResult Check(IReadOnlyList<VerticalSlice> slices)
    {
        var positions = new List<AnaysisResultPosition>();
        int pos = 1;
        int totalMistakeCount = 0;
        var emptyNotes = Array.Empty<MusicXmlNotePosition>();

        var parallelOctaves = new ParallelOctavesCheckCommand();
        var mistakes = parallelOctaves.Execute(slices);
        if (mistakes.Count > 0)
        {
            totalMistakeCount += mistakes.Count;
            positions.Add(new AnaysisResultPosition
            {
                Position = pos++,
                Title = parallelOctaves.Title,
                Feedback = parallelOctaves.Feedback,
                Severity = parallelOctaves.Severity,
                RelatedNotes = emptyNotes
            });
        }

        var parallelFifths = new ParallelFifthsCheckCommand();
        mistakes = parallelFifths.Execute(slices);
        if (mistakes.Count > 0)
        {
            totalMistakeCount += mistakes.Count;
            positions.Add(new AnaysisResultPosition
            {
                Position = pos++,
                Title = parallelFifths.Title,
                Feedback = parallelFifths.Feedback,
                Severity = parallelFifths.Severity,
                RelatedNotes = emptyNotes
            });
        }

        return new HarmonyCheckResult
        {
            Positions = positions,
            TotalMistakeCount = totalMistakeCount
        };
    }
}
