using System;

namespace HF.LearningCourseService.Core.Domain.Entities
{
    public class LearningCourse: BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public ICollection<LearningModule> Modules { get; set; } = [];
    }
}