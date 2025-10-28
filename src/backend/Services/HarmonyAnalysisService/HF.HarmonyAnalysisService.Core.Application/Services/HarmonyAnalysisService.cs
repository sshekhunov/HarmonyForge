using HF.HarmonyAnalysisService.Core.Domain.DTO;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Services;

public class HarmonyAnalysisService : IHarmonyAnalysisService
{
    private readonly IMusicXmlParser _musicXmlParser;

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

                // Parse the MusicXML content
                var score = _musicXmlParser.ParseMusicXml(request.MusicXmlContent);

                // Count the notes
                var noteCount = score.Notes.Count;

                return new HarmonyAnalysisResponseDto
                {
                    NoteCount = noteCount,
                    IsSuccessful = true
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
}
