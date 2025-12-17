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

        // Extract note positions
        score.NotePositions = ExtractNotePositions(xmlDoc);

        return score;
    }

    private List<MusicXmlNotePosition> ExtractNotePositions(XmlDocument xmlDoc)
    {
        var notePositions = new List<MusicXmlNotePosition>();
        
        try
        {
            // Get all parts
            var parts = xmlDoc.SelectNodes("//part");
            if (parts == null || parts.Count == 0)
            {
                return notePositions;
            }

            // Iterate through parts (measureArrayIndex)
            for (int partIndex = 0; partIndex < parts.Count; partIndex++)
            {
                var part = parts[partIndex];
                var measures = part.SelectNodes("measure");

                if (measures == null)
                    continue;

                // Iterate through measures (measureIndex)
                for (int measureIndex = 0; measureIndex < measures.Count; measureIndex++)
                {
                    var measure = measures[measureIndex];
                    
                    // Get all notes in this measure (excluding rests)
                    var noteNodes = measure.SelectNodes(".//note[not(rest)]");
                    
                    if (noteNodes == null || noteNodes.Count == 0)
                        continue;

                    int staffEntryIndex = 0;
                    int voiceEntryIndex = 0;
                    int noteIndex = 0;
                    bool isFirstNoteInMeasure = true;

                    foreach (XmlNode noteNode in noteNodes)
                    {
                        // Check if this note is part of a chord (same staff entry and voice)
                        var chordNode = noteNode.SelectSingleNode("chord");
                        bool isChord = chordNode != null;

                        // Check voice (if specified)
                        var voiceNode = noteNode.SelectSingleNode("voice");
                        int currentVoice = 0;
                        if (voiceNode != null && int.TryParse(voiceNode.InnerText, out int parsedVoice))
                        {
                            currentVoice = parsedVoice;
                        }

                        if (isFirstNoteInMeasure)
                        {
                            // First note in the measure
                            staffEntryIndex = 0;
                            voiceEntryIndex = currentVoice;
                            noteIndex = 0;
                            isFirstNoteInMeasure = false;
                        }
                        else if (isChord)
                        {
                            // Same staff entry, same voice, different note in chord
                            noteIndex++;
                        }
                        else
                        {
                            // New staff entry (new time position)
                            staffEntryIndex++;
                            voiceEntryIndex = currentVoice;
                            noteIndex = 0;
                        }

                        // Create note position
                        notePositions.Add(new MusicXmlNotePosition
                        {
                            MeasureArrayIndex = partIndex,
                            MeasureIndex = measureIndex,
                            StaffEntryIndex = staffEntryIndex,
                            VoiceEntryIndex = voiceEntryIndex,
                            NoteIndex = noteIndex
                        });
                    }
                }
            }
        }
        catch (Exception ex)
        {
            // If parsing fails, return empty list
            // The service will still work but won't have note positions
            Console.WriteLine($"Error extracting note positions: {ex.Message}");
        }

        return notePositions;
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
