namespace HF.LearningCourseService.Core.Domain.Entities;

public class LearningContentItem : BaseEntity
{
    public string Content { get; set; } = string.Empty;

    public int Order { get; set; } = 0;

    public LearningContentItemType Type { get; set; }
}

public enum LearningContentItemType
{
    Text,
    Image,
    YouTubeVideo,
    MusicXml
}