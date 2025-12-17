using HF.HarmonyAnalysisService.Core.Domain.DTO;
using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Services;

public class HarmonyAnalysisService : IHarmonyAnalysisService
{
    private readonly IMusicXmlParser _musicXmlParser;
    private readonly Random _random = new Random();

    public HarmonyAnalysisService(IMusicXmlParser musicXmlParser)
    {
        _musicXmlParser = musicXmlParser;
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

                // Parse the MusicXML content to extract note positions
                var score = _musicXmlParser.ParseMusicXml(request.MusicXmlContent);

                // Generate random analysis result with 3-5 positions using actual note positions from the file
                var analysisResult = GenerateRandomAnalysisResult(score.NotePositions);

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

    private AnalysisResult GenerateRandomAnalysisResult(List<MusicXmlNotePosition> availableNotePositions)
    {
        var positionCount = _random.Next(3, 6); // 3-5 positions
        var positions = new List<AnaysisResultPosition>();

        var titles = new[]
        {
            "Параллельные квинты",
            "Скрытые октавы",
            "Неправильное разрешение диссонанса",
            "Нарушение голосоведения",
            "Запрещенное движение",
            "Неправильная модуляция",
            "Нарушение правил контрапункта"
        };

        var feedbacks = new[]
        {
            "Обнаружено нарушение правил голосоведения",
            "Требуется исправление движения голосов",
            "Рекомендуется пересмотреть гармонизацию",
            "Выявлена ошибка в построении аккорда",
            "Необходимо улучшить плавность голосоведения"
        };

        var severityLevels = Enum.GetValues<SeverityLevel>();

        for (int i = 0; i < positionCount; i++)
        {
            var position = new AnaysisResultPosition
            {
                Position = i + 1,
                Title = titles[_random.Next(titles.Length)],
                Feedback = feedbacks[_random.Next(feedbacks.Length)],
                Severity = severityLevels[_random.Next(severityLevels.Length)],
                RelatedNotes = GenerateRelatedNotesFromFile(availableNotePositions)
            };
            positions.Add(position);
        }

        var score = Math.Round(_random.NextDouble() * 100, 2);
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

    private IEnumerable<MusicXmlNotePosition> GenerateRelatedNotesFromFile(List<MusicXmlNotePosition> availableNotePositions)
    {
        if (availableNotePositions == null || availableNotePositions.Count == 0)
        {
            return new List<MusicXmlNotePosition>();
        }

        var noteCount = _random.Next(1, Math.Min(4, availableNotePositions.Count + 1)); // 1-3 related notes, but not more than available
        var selectedNotes = new List<MusicXmlNotePosition>();

        // Select random notes from the available positions
        var shuffled = availableNotePositions.OrderBy(x => _random.Next()).Take(noteCount);
        selectedNotes.AddRange(shuffled);

        return selectedNotes;
    }
}
