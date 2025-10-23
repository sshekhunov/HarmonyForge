namespace HF.LearningCourseService.Core.Domain.Entities;

public class LearningArticleContentItem : BaseEntity
{
    public string Content { get; set; } = string.Empty;

    public int Order { get; set; } = 0;

    public LearningArticleContentItemType Type { get; set; }
}

public enum LearningArticleContentItemType
{
    Text,
    Image,
    YouTubeVideo
}