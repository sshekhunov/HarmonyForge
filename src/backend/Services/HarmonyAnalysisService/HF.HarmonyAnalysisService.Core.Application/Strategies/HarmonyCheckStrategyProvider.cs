using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Strategies;

public class HarmonyCheckStrategyProvider : IHarmonyCheckStrategyProvider
{
    private readonly BasicHarmonyCheckStrategy _basicStrategy = new();
    private readonly AdvancedHarmonyCheckStrategy _advancedStrategy = new();
    private readonly FullHarmonyCheckStrategy _fullStrategy = new();

    public IHarmonyCheckStrategy GetStrategy(ExerciseType exerciseType)
    {
        return exerciseType switch
        {
            ExerciseType.Basic => _basicStrategy,
            ExerciseType.Advanced => _advancedStrategy,
            ExerciseType.Full => _fullStrategy,
            _ => _fullStrategy
        };
    }
}
