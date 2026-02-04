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

        var titleNode = xmlDoc.SelectSingleNode("//movement-title");
        if (titleNode != null)
        {
            score.Title = titleNode.InnerText;
        }

        var composerNode = xmlDoc.SelectSingleNode("//creator[@type='composer']");
        if (composerNode != null)
        {
            score.Composer = composerNode.InnerText;
        }

        var parts = xmlDoc.SelectNodes("//part");
        score.PartCount = parts?.Count ?? 0;

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

        var sliceEntries = new List<(int partIndex, int measureIndex, int staffEntryIndex, int voiceIndex, int midiPitch)>();
        score.NotePositions = ExtractNotePositions(xmlDoc, sliceEntries);
        score.VerticalSlices = BuildVerticalSlices(sliceEntries);

        return score;
    }

    private static List<VerticalSlice> BuildVerticalSlices(
        List<(int partIndex, int measureIndex, int staffEntryIndex, int voiceIndex, int midiPitch)> sliceEntries)
    {
        var grouped = sliceEntries
            .GroupBy(e => (e.measureIndex, e.staffEntryIndex))
            .OrderBy(g => g.Key.measureIndex).ThenBy(g => g.Key.staffEntryIndex)
            .ToList();

        return grouped.Select(g => new VerticalSlice
        {
            MeasureIndex = g.Key.measureIndex,
            StaffEntryIndex = g.Key.staffEntryIndex,
            VoicePitches = g.Select(e => new VoicePitch
            {
                PartIndex = e.partIndex,
                VoiceIndex = e.voiceIndex,
                MidiPitch = e.midiPitch
            }).ToList()
        }).ToList();
    }

    private List<MusicXmlNotePosition> ExtractNotePositions(XmlDocument xmlDoc,
        List<(int partIndex, int measureIndex, int staffEntryIndex, int voiceIndex, int midiPitch)> sliceEntries)
    {
        var notePositions = new List<MusicXmlNotePosition>();
        sliceEntries.Clear();

        try
        {
            var parts = xmlDoc.SelectNodes("//part");
            if (parts == null || parts.Count == 0)
                return notePositions;

            for (int partIndex = 0; partIndex < parts.Count; partIndex++)
            {
                var part = parts[partIndex];
                var measures = part.SelectNodes("measure");
                if (measures == null) continue;

                for (int measureIndex = 0; measureIndex < measures.Count; measureIndex++)
                {
                    var measure = measures[measureIndex];
                    var noteNodes = measure.SelectNodes(".//note[not(rest)]");
                    if (noteNodes == null || noteNodes.Count == 0) continue;

                    int staffEntryIndex = 0;
                    var currentStaffEntryNotes = new List<(XmlNode node, int voice)>();

                    for (int i = 0; i < noteNodes.Count; i++)
                    {
                        var noteNode = noteNodes[i];
                        var chordNode = noteNode.SelectSingleNode("chord");
                        bool isChord = chordNode != null;

                        var voiceNode = noteNode.SelectSingleNode("voice");
                        int voiceNumber = 0;
                        if (voiceNode != null && int.TryParse(voiceNode.InnerText, out int parsedVoice))
                            voiceNumber = parsedVoice;

                        if (!isChord && currentStaffEntryNotes.Count > 0)
                        {
                            ProcessStaffEntry(currentStaffEntryNotes, notePositions, sliceEntries,
                                partIndex, measureIndex, staffEntryIndex);
                            currentStaffEntryNotes.Clear();
                            staffEntryIndex++;
                        }

                        currentStaffEntryNotes.Add((noteNode, voiceNumber));
                    }

                    if (currentStaffEntryNotes.Count > 0)
                        ProcessStaffEntry(currentStaffEntryNotes, notePositions, sliceEntries,
                            partIndex, measureIndex, staffEntryIndex);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error extracting note positions: {ex.Message}");
        }

        return notePositions;
    }

    private void ProcessStaffEntry(
        List<(XmlNode node, int voice)> staffEntryNotes,
        List<MusicXmlNotePosition> notePositions,
        List<(int partIndex, int measureIndex, int staffEntryIndex, int voiceIndex, int midiPitch)> sliceEntries,
        int partIndex, int measureIndex, int staffEntryIndex)
    {
        var notesByVoice = staffEntryNotes
            .GroupBy(n => n.voice)
            .OrderBy(g => g.Key)
            .ToList();

        int voiceEntryIndex = 0;
        foreach (var voiceGroup in notesByVoice)
        {
            int? lowestMidi = null;
            int noteIndex = 0;
            foreach (var (node, _) in voiceGroup)
            {
                var midi = GetMidiPitch(node);
                if (midi.HasValue && (!lowestMidi.HasValue || midi.Value < lowestMidi.Value))
                    lowestMidi = midi.Value;
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
            if (lowestMidi.HasValue)
                sliceEntries.Add((partIndex, measureIndex, staffEntryIndex, voiceEntryIndex, lowestMidi.Value));
            voiceEntryIndex++;
        }
    }

    private static int? GetMidiPitch(XmlNode noteNode)
    {
        var pitchNode = noteNode.SelectSingleNode("pitch");
        if (pitchNode == null) return null;
        var stepNode = pitchNode.SelectSingleNode("step");
        var octaveNode = pitchNode.SelectSingleNode("octave");
        if (stepNode == null || octaveNode == null) return null;
        if (!int.TryParse(octaveNode.InnerText, out int octave)) return null;

        int stepSemitones = stepNode.InnerText switch
        {
            "C" => 0, "D" => 2, "E" => 4, "F" => 5, "G" => 7, "A" => 9, "B" => 11,
            _ => 0
        };
        int alter = 0;
        var alterNode = pitchNode.SelectSingleNode("alter");
        if (alterNode != null) int.TryParse(alterNode.InnerText, out alter);

        return 60 + (octave - 4) * 12 + stepSemitones + alter;
    }

    private Note? ParseNote(XmlNode noteNode)
    {
        try
        {
            var note = new Note();

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

            var durationNode = noteNode.SelectSingleNode("duration");
            if (durationNode != null)
            {
                note.Duration = decimal.Parse(durationNode.InnerText);
            }

            var staffNode = noteNode.SelectSingleNode("staff");
            if (staffNode != null)
            {
                note.Staff = int.Parse(staffNode.InnerText);
            }

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
            return null;
        }
    }
}
