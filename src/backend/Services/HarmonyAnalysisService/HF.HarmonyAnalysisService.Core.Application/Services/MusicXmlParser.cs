using System.Xml;
using HF.HarmonyAnalysisService.Core.Domain.Entities;
using HF.HarmonyAnalysisService.Core.Domain.Interfaces;

namespace HF.HarmonyAnalysisService.Core.Application.Services;

public class MusicXmlParser : IMusicXmlParser
{
    public MusicXmlScore ParseMusicXml(string musicXmlContent)
    {
        var score = new MusicXmlScore();
        var xmlDoc = new XmlDocument();
        xmlDoc.LoadXml(musicXmlContent);

        // Extract title
        var titleNode = xmlDoc.SelectSingleNode("//movement-title");
        if (titleNode != null)
        {
            score.Title = titleNode.InnerText;
        }

        // Extract composer
        var composerNode = xmlDoc.SelectSingleNode("//creator[@type='composer']");
        if (composerNode != null)
        {
            score.Composer = composerNode.InnerText;
        }

        // Count parts
        var parts = xmlDoc.SelectNodes("//part");
        score.PartCount = parts?.Count ?? 0;

        // Extract notes
        var noteNodes = xmlDoc.SelectNodes("//note");
        if (noteNodes != null)
        {
            foreach (XmlNode noteNode in noteNodes)
            {
                var note = ParseNote(noteNode);
                if (note != null)
                {
                    score.Notes.Add(note);
                }
            }
        }

        return score;
    }

    private Note? ParseNote(XmlNode noteNode)
    {
        try
        {
            var note = new Note();

            // Extract pitch
            var pitchNode = noteNode.SelectSingleNode("pitch");
            if (pitchNode != null)
            {
                var stepNode = pitchNode.SelectSingleNode("step");
                var octaveNode = pitchNode.SelectSingleNode("octave");
                var alterNode = pitchNode.SelectSingleNode("alter");

                if (stepNode != null && octaveNode != null)
                {
                    var step = stepNode.InnerText;
                    var octave = int.Parse(octaveNode.InnerText);
                    var alter = alterNode != null ? int.Parse(alterNode.InnerText) : 0;

                    note.Pitch = step;
                    if (alter > 0)
                        note.Pitch += new string('#', alter);
                    else if (alter < 0)
                        note.Pitch += new string('b', Math.Abs(alter));

                    note.Octave = octave;
                }
            }

            // Extract duration
            var durationNode = noteNode.SelectSingleNode("duration");
            if (durationNode != null)
            {
                note.Duration = decimal.Parse(durationNode.InnerText);
            }

            // Extract staff (if available)
            var staffNode = noteNode.SelectSingleNode("staff");
            if (staffNode != null)
            {
                note.Staff = int.Parse(staffNode.InnerText);
            }

            // Extract measure number (approximate by counting measures before this note)
            var measureNode = noteNode.SelectSingleNode("ancestor::measure");
            if (measureNode != null)
            {
                var measureNumberAttr = measureNode.Attributes?["number"];
                if (measureNumberAttr != null)
                {
                    note.Measure = int.Parse(measureNumberAttr.Value);
                }
            }

            return note;
        }
        catch
        {
            // Skip notes that can't be parsed
            return null;
        }
    }
}
