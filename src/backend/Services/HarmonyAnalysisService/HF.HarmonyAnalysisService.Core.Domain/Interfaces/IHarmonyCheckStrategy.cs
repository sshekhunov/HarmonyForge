using HF.HarmonyAnalysisService.Core.Domain.Entities;

namespace HF.HarmonyAnalysisService.Core.Domain.Interfaces;

public interface IHarmonyCheckStrategy
{
    HarmonyCheckResult Check(IReadOnlyList<VerticalSlice> slices);
}
