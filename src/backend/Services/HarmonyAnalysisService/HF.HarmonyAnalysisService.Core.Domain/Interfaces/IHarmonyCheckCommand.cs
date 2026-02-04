using HF.HarmonyAnalysisService.Core.Domain.Entities;

namespace HF.HarmonyAnalysisService.Core.Domain.Interfaces;

public interface IHarmonyCheckCommand
{
    string Title { get; }
    string Feedback { get; }
    SeverityLevel Severity { get; }
    IReadOnlyList<(int MeasureIndex, int StaffEntryIndex)> Execute(IReadOnlyList<VerticalSlice> slices);
}
