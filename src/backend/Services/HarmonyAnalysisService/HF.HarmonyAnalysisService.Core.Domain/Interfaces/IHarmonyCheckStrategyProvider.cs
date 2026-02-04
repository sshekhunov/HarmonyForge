using HF.HarmonyAnalysisService.Core.Domain.Entities;

namespace HF.HarmonyAnalysisService.Core.Domain.Interfaces;

public interface IHarmonyCheckStrategyProvider
{
    IHarmonyCheckStrategy GetStrategy(ExerciseType exerciseType);
}