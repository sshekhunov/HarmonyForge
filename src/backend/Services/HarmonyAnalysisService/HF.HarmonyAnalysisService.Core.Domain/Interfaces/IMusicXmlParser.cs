using HF.HarmonyAnalysisService.Core.Domain.Entities;

namespace HF.HarmonyAnalysisService.Core.Domain.Interfaces;

public interface IMusicXmlParser
{
    MusicXmlScore ParseMusicXml(string musicXmlContent);
}
