using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Commands;

public class HarmonyCheckMacroCommand
{
    private readonly IReadOnlyList<IHarmonyCheckCommand> _commands;

    public HarmonyCheckMacroCommand(IReadOnlyList<IHarmonyCheckCommand> commands)
    {
        _commands = commands;
    }

    public HarmonyCheckResult Execute(IReadOnlyList<VerticalSlice> slices)
    {
        var positions = new List<AnaysisResultPosition>();
        int pos = 1;
        int totalMistakeCount = 0;
        var emptyNotes = Array.Empty<MusicXmlNotePosition>();

        foreach (var command in _commands)
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

        return new HarmonyCheckResult
        {
            Positions = positions,
            TotalMistakeCount = totalMistakeCount
        };
    }
}
