namespace HF.LearningCourseService.Core.Domain.Entities;

public class LearningArticle
    : BaseEntity
{
    private List<LearningArticleContentSection> _contentSections = [];

    public Guid LearningModuleId { get; set; }

    public IEnumerable<LearningArticleContentSection> ContentItems => _contentSections;

    public void AddContentSections(List<LearningArticleContentSection> sections)
    {
        if (sections != null && sections.Any())
        {
            _contentSections.AddRange(sections);
        }
    }

    public void ClearContentSections()
    {
        _contentSections.Clear();
    }
}