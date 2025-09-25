using System;

namespace HF.LearningCourseService.Core.Domain.Entities
{
    public class LearningArticleContentItem
        : BaseEntity
    {
        public string Content { get; set; } = string.Empty;

        public int SectionBlockNumber { get; set; } = 0;
    }
}