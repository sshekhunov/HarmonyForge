using System.Threading;
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
        var count = _commands.Count;
        var results = new (IHarmonyCheckCommand Command, IReadOnlyList<(int MeasureIndex, int StaffEntryIndex)> Mistakes)?[count];
        using var countdown = new CountdownEvent(count);

        for (var i = 0; i < count; i++)
        {
            var index = i;
            var command = _commands[i];
            Task.Run(() =>
            {
                try
                {
                    var mistakes = command.Execute(slices);
                    results[index] = (command, mistakes);
                }
                finally
                {
                    countdown.Signal();
                }
            });
        }

        countdown.Wait();

        var positions = new List<AnaysisResultPosition>();
        int pos = 1;
        int totalMistakeCount = 0;
        var emptyNotes = Array.Empty<MusicXmlNotePosition>();

        foreach (var result in results)
        {
            if (result == null || result.Value.Mistakes.Count == 0)
                continue;
            var (command, mistakes) = result.Value;
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

        return new HarmonyCheckResult
        {
            Positions = positions,
            TotalMistakeCount = totalMistakeCount
        };
    }
}
