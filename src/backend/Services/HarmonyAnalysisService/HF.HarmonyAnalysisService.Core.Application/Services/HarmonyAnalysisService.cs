using HF.HarmonyAnalysisService.Core.Domain.DTO;
using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Services;

public class HarmonyAnalysisService : IHarmonyAnalysisService
{
    private readonly IMusicXmlParser _musicXmlParser;
    private readonly IEnumerable<IHarmonyCheckCommand> _checkCommands;
    private readonly Random _random = new Random();

    public HarmonyAnalysisService(IMusicXmlParser musicXmlParser, IEnumerable<IHarmonyCheckCommand> checkCommands)
    {
        _musicXmlParser = musicXmlParser;
        _checkCommands = checkCommands;
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
                var analysisResult = GenerateAnalysisResult(score.VerticalSlices);

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

    private AnalysisResult GenerateAnalysisResult(IReadOnlyList<VerticalSlice> slices)
    {
        var positions = new List<AnaysisResultPosition>();
        int pos = 1;
        var emptyNotes = Array.Empty<MusicXmlNotePosition>();
        int totalMistakes = 0;

        foreach (var command in _checkCommands)
        {
            var mistakes = command.Execute(slices);
            if (mistakes.Count > 0)
            {
                totalMistakes += mistakes.Count;
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

        double score = totalMistakes > 0
            ? Math.Max(0, 75 - totalMistakes * 10)
            : Math.Round(_random.NextDouble() * 100, 2);
        var overallFeedback = score >= 80
            ? "Отличная работа! Гармонизация выполнена на высоком уровне."
            : score >= 60
                ? "Хорошая работа, но есть области для улучшения."
                : "Требуется дополнительная работа над гармонизацией.";

        return new AnalysisResult
        {
            Score = score,
            Feedback = overallFeedback,
            Positions = positions
        };
    }
}
