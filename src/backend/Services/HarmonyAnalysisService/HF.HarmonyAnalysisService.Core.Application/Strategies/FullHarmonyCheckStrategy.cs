using HF.HarmonyAnalysisService.Core.Application.Commands;
using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Strategies;

public class FullHarmonyCheckStrategy : IHarmonyCheckStrategy
{
    public HarmonyCheckResult Check(IReadOnlyList<VerticalSlice> slices)
    {
        var commands = new IHarmonyCheckCommand[]
        {
            new ParallelOctavesCheckCommand(),
            new ParallelFifthsCheckCommand(),
            new VoiceCrossoverCheckCommand(),
            new HiddenOctavesCheckCommand(),
            new SpacingCheckCommand(),
            new ParallelUnisonsCheckCommand()
        };
        var macro = new HarmonyCheckMacroCommand(commands);
        return macro.Execute(slices);
    }
}
