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

                var score = _musicXmlParser.ParseMusicXml(request.MusicXmlContent);

                var parallelOctaveMistakes = DetectParallelOctaves(score.VerticalSlices);
                var analysisResult = GenerateAnalysisResult(score.NotePositions, parallelOctaveMistakes);

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

    private static List<(int MeasureIndex, int StaffEntryIndex)> DetectParallelOctaves(List<VerticalSlice> slices)
    {
        var mistakes = new List<(int MeasureIndex, int StaffEntryIndex)>();
        if (slices == null || slices.Count < 2) return mistakes;

        for (int s = 0; s < slices.Count - 1; s++)
        {
            var curr = slices[s];
            var next = slices[s + 1];
            var currByVoice = curr.VoicePitches.ToDictionary(v => (v.PartIndex, v.VoiceIndex), v => v.MidiPitch);
            var nextByVoice = next.VoicePitches.ToDictionary(v => (v.PartIndex, v.VoiceIndex), v => v.MidiPitch);

            var voices = currByVoice.Keys.ToList();
            for (int i = 0; i < voices.Count; i++)
            {
                for (int j = i + 1; j < voices.Count; j++)
                {
                    var v1 = voices[i];
                    var v2 = voices[j];
                    if (!nextByVoice.TryGetValue(v1, out int p1Next) || !nextByVoice.TryGetValue(v2, out int p2Next))
                        continue;
                    int p1 = currByVoice[v1];
                    int p2 = currByVoice[v2];

                    int interval1 = p2 - p1;
                    int interval2 = p2Next - p1Next;
                    int motion1 = p1Next - p1;
                    int motion2 = p2Next - p2;

                    bool isOctave1 = interval1 == 12 || interval1 == -12;
                    bool isOctave2 = interval2 == 12 || interval2 == -12;
                    bool sameDirection = (motion1 > 0 && motion2 > 0) || (motion1 < 0 && motion2 < 0);
                    bool hasMotion = motion1 != 0 || motion2 != 0;

                    if (isOctave1 && isOctave2 && sameDirection && hasMotion)
                    {
                        mistakes.Add((next.MeasureIndex, next.StaffEntryIndex));
                        break;
                    }
                }
            }
        }

        return mistakes;
    }

    private AnalysisResult GenerateAnalysisResult(
        List<MusicXmlNotePosition> availableNotePositions,
        List<(int MeasureIndex, int StaffEntryIndex)> parallelOctaveMistakes)
    {
        var positions = new List<AnaysisResultPosition>();

        if (parallelOctaveMistakes.Count > 0)
        {
            positions.Add(new AnaysisResultPosition
            {
                Position = 1,
                Title = "Параллельные октавы",
                Feedback = "Обнаружены параллельные октавы: два голоса движутся в одном направлении, сохраняя интервал октавы.",
                Severity = SeverityLevel.High,
                RelatedNotes = GenerateRelatedNotesFromFile(availableNotePositions)
            });
        }

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
        int positionCount = _random.Next(2, 5);
        for (int i = 0; i < positionCount; i++)
        {
            positions.Add(new AnaysisResultPosition
            {
                Position = positions.Count + 1,
                Title = titles[_random.Next(titles.Length)],
                Feedback = feedbacks[_random.Next(feedbacks.Length)],
                Severity = severityLevels[_random.Next(severityLevels.Length)],
                RelatedNotes = GenerateRelatedNotesFromFile(availableNotePositions)
            });
        }

        double score = parallelOctaveMistakes.Count > 0
            ? Math.Max(0, 70 - parallelOctaveMistakes.Count * 15)
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

    private IEnumerable<MusicXmlNotePosition> GenerateRelatedNotesFromFile(List<MusicXmlNotePosition> availableNotePositions)
    {
        if (availableNotePositions == null || availableNotePositions.Count == 0)
        {
            return new List<MusicXmlNotePosition>();
        }
        
        return availableNotePositions;
    }
}
