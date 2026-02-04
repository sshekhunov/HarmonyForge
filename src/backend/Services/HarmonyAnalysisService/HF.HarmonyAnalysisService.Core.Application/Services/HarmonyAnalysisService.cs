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
                var parallelFifthMistakes = DetectParallelFifths(score.VerticalSlices);
                var voiceCrossoverMistakes = DetectVoiceCrossover(score.VerticalSlices);
                var hiddenOctaveMistakes = DetectHiddenOctaves(score.VerticalSlices);
                var spacingMistakes = DetectSpacing(score.VerticalSlices);
                var parallelUnisonMistakes = DetectParallelUnisons(score.VerticalSlices);
                var analysisResult = GenerateAnalysisResult(
                    parallelOctaveMistakes, parallelFifthMistakes, voiceCrossoverMistakes,
                    hiddenOctaveMistakes, spacingMistakes, parallelUnisonMistakes);

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

    private static List<(int MeasureIndex, int StaffEntryIndex)> DetectParallelFifths(List<VerticalSlice> slices)
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

                    bool isFifth1 = interval1 == 7 || interval1 == -7;
                    bool isFifth2 = interval2 == 7 || interval2 == -7;
                    bool sameDirection = (motion1 > 0 && motion2 > 0) || (motion1 < 0 && motion2 < 0);
                    bool hasMotion = motion1 != 0 || motion2 != 0;

                    if (isFifth1 && isFifth2 && sameDirection && hasMotion)
                    {
                        mistakes.Add((next.MeasureIndex, next.StaffEntryIndex));
                        break;
                    }
                }
            }
        }
        return mistakes;
    }

    private static List<(int MeasureIndex, int StaffEntryIndex)> DetectVoiceCrossover(List<VerticalSlice> slices)
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
                    int diffCurr = p1 - p2;
                    int diffNext = p1Next - p2Next;
                    if (diffCurr == 0 || diffNext == 0) continue;
                    if ((diffCurr > 0 && diffNext < 0) || (diffCurr < 0 && diffNext > 0))
                    {
                        mistakes.Add((next.MeasureIndex, next.StaffEntryIndex));
                        break;
                    }
                }
            }
        }
        return mistakes;
    }

    private static List<(int MeasureIndex, int StaffEntryIndex)> DetectHiddenOctaves(List<VerticalSlice> slices)
    {
        var mistakes = new List<(int MeasureIndex, int StaffEntryIndex)>();
        if (slices == null || slices.Count < 2) return mistakes;

        for (int s = 0; s < slices.Count - 1; s++)
        {
            var curr = slices[s];
            var next = slices[s + 1];
            if (curr.VoicePitches.Count < 2 || next.VoicePitches.Count < 2) continue;

            var currOrdered = curr.VoicePitches.OrderBy(v => v.MidiPitch).ToList();
            var nextOrdered = next.VoicePitches.OrderBy(v => v.MidiPitch).ToList();
            int currLow = currOrdered[0].MidiPitch;
            int currHigh = currOrdered[currOrdered.Count - 1].MidiPitch;
            var lowVoice = (currOrdered[0].PartIndex, currOrdered[0].VoiceIndex);
            var highVoice = (currOrdered[currOrdered.Count - 1].PartIndex, currOrdered[currOrdered.Count - 1].VoiceIndex);
            var nextByVoice = next.VoicePitches.ToDictionary(v => (v.PartIndex, v.VoiceIndex), v => v.MidiPitch);
            if (!nextByVoice.TryGetValue(lowVoice, out int nextLow) || !nextByVoice.TryGetValue(highVoice, out int nextHigh))
                continue;
            int intervalNext = nextHigh - nextLow;
            int motionLow = nextLow - currLow;
            int motionHigh = nextHigh - currHigh;
            bool sameDirection = (motionLow > 0 && motionHigh > 0) || (motionLow < 0 && motionHigh < 0);
            bool hasMotion = motionLow != 0 || motionHigh != 0;
            bool isOctave = intervalNext == 12 || intervalNext == -12;
            if (isOctave && sameDirection && hasMotion)
            {
                mistakes.Add((next.MeasureIndex, next.StaffEntryIndex));
            }
        }
        return mistakes;
    }

    private static List<(int MeasureIndex, int StaffEntryIndex)> DetectSpacing(List<VerticalSlice> slices)
    {
        var mistakes = new List<(int MeasureIndex, int StaffEntryIndex)>();
        if (slices == null) return mistakes;

        foreach (var slice in slices)
        {
            if (slice.VoicePitches.Count < 2) continue;
            var ordered = slice.VoicePitches.OrderBy(v => v.MidiPitch).ToList();
            for (int i = 0; i < ordered.Count - 1; i++)
            {
                int interval = ordered[i + 1].MidiPitch - ordered[i].MidiPitch;
                if (interval > 12)
                {
                    mistakes.Add((slice.MeasureIndex, slice.StaffEntryIndex));
                    break;
                }
            }
        }
        return mistakes;
    }

    private static List<(int MeasureIndex, int StaffEntryIndex)> DetectParallelUnisons(List<VerticalSlice> slices)
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
                    int motion1 = p1Next - p1;
                    int motion2 = p2Next - p2;
                    bool unisonCurr = p1 == p2;
                    bool unisonNext = p1Next == p2Next;
                    bool sameDirection = (motion1 > 0 && motion2 > 0) || (motion1 < 0 && motion2 < 0);
                    bool hasMotion = motion1 != 0 || motion2 != 0;
                    if (unisonCurr && unisonNext && sameDirection && hasMotion)
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
        List<(int MeasureIndex, int StaffEntryIndex)> parallelOctaveMistakes,
        List<(int MeasureIndex, int StaffEntryIndex)> parallelFifthMistakes,
        List<(int MeasureIndex, int StaffEntryIndex)> voiceCrossoverMistakes,
        List<(int MeasureIndex, int StaffEntryIndex)> hiddenOctaveMistakes,
        List<(int MeasureIndex, int StaffEntryIndex)> spacingMistakes,
        List<(int MeasureIndex, int StaffEntryIndex)> parallelUnisonMistakes)
    {
        var positions = new List<AnaysisResultPosition>();
        int pos = 1;
        var emptyNotes = Array.Empty<MusicXmlNotePosition>();

        if (parallelOctaveMistakes.Count > 0)
        {
            positions.Add(new AnaysisResultPosition
            {
                Position = pos++,
                Title = "Параллельные октавы",
                Feedback = "Обнаружены параллельные октавы: два голоса движутся в одном направлении, сохраняя интервал октавы.",
                Severity = SeverityLevel.High,
                RelatedNotes = emptyNotes
            });
        }

        if (parallelFifthMistakes.Count > 0)
        {
            positions.Add(new AnaysisResultPosition
            {
                Position = pos++,
                Title = "Параллельные квинты",
                Feedback = "Обнаружены параллельные квинты: два голоса движутся в одном направлении, сохраняя интервал квинты.",
                Severity = SeverityLevel.High,
                RelatedNotes = emptyNotes
            });
        }

        if (voiceCrossoverMistakes.Count > 0)
        {
            positions.Add(new AnaysisResultPosition
            {
                Position = pos++,
                Title = "Пересечение голосов",
                Feedback = "Обнаружено пересечение голосов: голоса меняются местами по высоте.",
                Severity = SeverityLevel.Medium,
                RelatedNotes = emptyNotes
            });
        }

        if (hiddenOctaveMistakes.Count > 0)
        {
            positions.Add(new AnaysisResultPosition
            {
                Position = pos++,
                Title = "Скрытые октавы",
                Feedback = "Обнаружены скрытые октавы: крайние голоса движутся в одном направлении к интервалу октавы.",
                Severity = SeverityLevel.Medium,
                RelatedNotes = emptyNotes
            });
        }

        if (spacingMistakes.Count > 0)
        {
            positions.Add(new AnaysisResultPosition
            {
                Position = pos++,
                Title = "Нарушение интервалов между голосами",
                Feedback = "Обнаружено нарушение тесситуры: интервал между соседними голосами превышает октаву.",
                Severity = SeverityLevel.Medium,
                RelatedNotes = emptyNotes
            });
        }

        if (parallelUnisonMistakes.Count > 0)
        {
            positions.Add(new AnaysisResultPosition
            {
                Position = pos++,
                Title = "Параллельные унисоны",
                Feedback = "Обнаружены параллельные унисоны: два голоса движутся в унисон в одном направлении.",
                Severity = SeverityLevel.High,
                RelatedNotes = emptyNotes
            });
        }

        int totalMistakes = parallelOctaveMistakes.Count + parallelFifthMistakes.Count + voiceCrossoverMistakes.Count
            + hiddenOctaveMistakes.Count + spacingMistakes.Count + parallelUnisonMistakes.Count;
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
