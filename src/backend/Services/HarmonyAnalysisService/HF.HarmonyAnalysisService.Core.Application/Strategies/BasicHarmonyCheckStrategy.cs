using HF.HarmonyAnalysisService.Core.Application.Commands;
using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Strategies;

public class BasicHarmonyCheckStrategy : IHarmonyCheckStrategy
{
    public HarmonyCheckResult Check(IReadOnlyList<VerticalSlice> slices)
    {
        var commands = new IHarmonyCheckCommand[]
        {
            new ParallelOctavesCheckCommand(),
            new ParallelFifthsCheckCommand()
        };
        var macro = new HarmonyCheckMacroCommand(commands);
        return macro.Execute(slices);
    }
}
