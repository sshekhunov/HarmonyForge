using HF.HarmonyAnalysisService.Core.Domain.DTO;
using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Services;

public class HarmonyAnalysisService : IHarmonyAnalysisService
{
    private readonly IMusicXmlParser _musicXmlParser;
    private readonly IHarmonyCheckStrategyProvider _strategyProvider;

    public HarmonyAnalysisService(IMusicXmlParser musicXmlParser, IHarmonyCheckStrategyProvider strategyProvider)
    {
        _musicXmlParser = musicXmlParser;
        _strategyProvider = strategyProvider;
    }

    public async Task<HarmonyAnalysisResponseDto> AnalyseHarmonyAsync(HarmonyAnalysisRequestDto request)
    {
        return await Task.Run(() =>
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.MusicXmlContent))
                {
                    return new HarmonyAnalysisResponseDto
                    {
                        IsSuccessful = false,
                        ErrorMessage = "MusicXML content is empty or null"
                    };
                }

                var score = _musicXmlParser.ParseMusicXml(request.MusicXmlContent);
                var strategy = _strategyProvider.GetStrategy(request.ExerciseType);
                var checkResult = strategy.Check(score.VerticalSlices);
                var analysisResult = BuildAnalysisResult(checkResult);

                return new HarmonyAnalysisResponseDto
                {
                    IsSuccessful = true,
                    AnalysisResult = analysisResult
                };
            }
            catch (Exception ex)
            {
                return new HarmonyAnalysisResponseDto
                {
                    IsSuccessful = false,
                    ErrorMessage = $"Error analyzing harmony: {ex.Message}"
                };
            }
        });
    }

    private static AnalysisResult BuildAnalysisResult(HarmonyCheckResult checkResult)
    {
        double score = 100 - checkResult.TotalMistakeCount * 5;
        var overallFeedback = score >= 80
            ? "Отличная работа! Гармонизация выполнена на высоком уровне."
            : score >= 60
                ? "Хорошая работа, но есть области для улучшения."
                : "Требуется дополнительная работа над гармонизацией.";

        return new AnalysisResult
        {
            Score = score,
            Feedback = overallFeedback,
            Positions = checkResult.Positions
        };
    }
}
