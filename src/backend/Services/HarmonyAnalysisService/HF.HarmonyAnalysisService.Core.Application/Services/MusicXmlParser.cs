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

                    // Group notes by time position (staff entries)
                    // Notes at the same time are those where subsequent notes have <chord> element
                    int staffEntryIndex = 0;
                    var currentStaffEntryNotes = new List<(XmlNode node, int voice)>();

                    for (int i = 0; i < noteNodes.Count; i++)
                    {
                        var noteNode = noteNodes[i];
                        var chordNode = noteNode.SelectSingleNode("chord");
                        bool isChord = chordNode != null;

                        // Get voice number
                        var voiceNode = noteNode.SelectSingleNode("voice");
                        int voiceNumber = 0;
                        if (voiceNode != null && int.TryParse(voiceNode.InnerText, out int parsedVoice))
                        {
                            voiceNumber = parsedVoice;
                        }

                        // If this is not a chord note and we have notes in the current staff entry,
                        // it means we're starting a new time position (new staff entry)
                        if (!isChord && currentStaffEntryNotes.Count > 0)
                        {
                            // Process previous staff entry before starting new one
                            ProcessStaffEntry(currentStaffEntryNotes, notePositions, 
                                partIndex, measureIndex, staffEntryIndex);
                            
                            // Start new staff entry
                            currentStaffEntryNotes.Clear();
                            staffEntryIndex++;
                        }

                        // Add note to current staff entry
                        currentStaffEntryNotes.Add((noteNode, voiceNumber));
                    }

                    // Process the last staff entry
                    if (currentStaffEntryNotes.Count > 0)
                    {
                        ProcessStaffEntry(currentStaffEntryNotes, notePositions, 
                            partIndex, measureIndex, staffEntryIndex);
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

    private void ProcessStaffEntry(List<(XmlNode node, int voice)> staffEntryNotes, 
        List<MusicXmlNotePosition> notePositions,
        int partIndex, int measureIndex, int staffEntryIndex)
    {
        // Group notes by voice within this staff entry
        // OSMD structures: staffEntry -> graphicalVoiceEntries[] -> notes[]
        var notesByVoice = staffEntryNotes
            .GroupBy(n => n.voice)
            .OrderBy(g => g.Key) // Order by voice number for consistent indexing
            .ToList();
        
        int voiceEntryIndex = 0;
        foreach (var voiceGroup in notesByVoice)
        {
            int noteIndex = 0;
            foreach (var (node, _) in voiceGroup)
            {
                notePositions.Add(new MusicXmlNotePosition
                {
                    MeasureArrayIndex = partIndex,
                    MeasureIndex = measureIndex,
                    StaffEntryIndex = staffEntryIndex,
                    VoiceEntryIndex = voiceEntryIndex,
                    NoteIndex = noteIndex
                });
                noteIndex++;
            }
            voiceEntryIndex++;
        }
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
