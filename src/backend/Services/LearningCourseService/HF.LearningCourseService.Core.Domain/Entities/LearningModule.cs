using System;

namespace HF.LearningCourseService.Core.Domain.Entities
{
    public class LearningModule: BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public ICollection<LearningModuleItem> Items { get; set; } = [];
    }
}