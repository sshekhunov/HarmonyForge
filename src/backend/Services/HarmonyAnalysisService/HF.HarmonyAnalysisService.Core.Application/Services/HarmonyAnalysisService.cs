using HF.HarmonyAnalysisService.Core.Domain.DTO;
using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Services;

public class HarmonyAnalysisService : IHarmonyAnalysisService
{
    private readonly Random _random = new Random();

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

                // Generate random analysis result with 3-5 positions
                var analysisResult = GenerateRandomAnalysisResult();

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

    private AnalysisResult GenerateRandomAnalysisResult()
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
                RelatedNotes = GenerateRandomRelatedNotes()
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

    private IEnumerable<MusicXmlNotePosition> GenerateRandomRelatedNotes()
    {
        var noteCount = _random.Next(1, 4); // 1-3 related notes
        var notes = new List<MusicXmlNotePosition>();

        for (int i = 0; i < noteCount; i++)
        {
            notes.Add(new MusicXmlNotePosition
            {
                MeasureArrayIndex = _random.Next(0, 10),
                MeasureIndex = _random.Next(1, 20),
                StaffEntryIndex = _random.Next(0, 5),
                VoiceEntryIndex = _random.Next(0, 4),
                NoteIndex = _random.Next(0, 10)
            });
        }

        return notes;
    }
}
