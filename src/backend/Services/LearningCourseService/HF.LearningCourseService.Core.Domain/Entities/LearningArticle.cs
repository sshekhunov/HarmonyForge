using System;

namespace HF.LearningCourseService.Core.Domain.Entities
{
    public class LearningArticle
        : BaseEntity
    {
        public required LearningModuleItem LearningModuleItem { get; set; }

        public ICollection<LearningArticleContentItem> ContentItems { get; set; } = [];
    }
}