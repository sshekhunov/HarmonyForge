using HF.HarmonyAnalysisService.Core.Application.Commands;
using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Strategies;

public class AdvancedHarmonyCheckStrategy : IHarmonyCheckStrategy
{
    public HarmonyCheckResult Check(IReadOnlyList<VerticalSlice> slices)
    {
        var positions = new List<AnaysisResultPosition>();
        int pos = 1;
        int totalMistakeCount = 0;
        var emptyNotes = Array.Empty<MusicXmlNotePosition>();

        RunCommand(new ParallelOctavesCheckCommand(), slices, positions, ref pos, ref totalMistakeCount, emptyNotes);
        RunCommand(new ParallelFifthsCheckCommand(), slices, positions, ref pos, ref totalMistakeCount, emptyNotes);
        RunCommand(new VoiceCrossoverCheckCommand(), slices, positions, ref pos, ref totalMistakeCount, emptyNotes);
        RunCommand(new HiddenOctavesCheckCommand(), slices, positions, ref pos, ref totalMistakeCount, emptyNotes);

        return new HarmonyCheckResult
        {
            Positions = positions,
            TotalMistakeCount = totalMistakeCount
        };
    }

    private static void RunCommand(IHarmonyCheckCommand command, IReadOnlyList<VerticalSlice> slices,
        List<AnaysisResultPosition> positions, ref int pos, ref int totalMistakeCount,
        MusicXmlNotePosition[] emptyNotes)
    {
        var mistakes = command.Execute(slices);
        if (mistakes.Count > 0)
        {
            totalMistakeCount += mistakes.Count;
            positions.Add(new AnaysisResultPosition
            {
                Position = pos++,
                Title = command.Title,
                Feedback = command.Feedback,
                Severity = command.Severity,
                RelatedNotes = emptyNotes
            });
        }
    }
}
