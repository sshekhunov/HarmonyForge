namespace HF.LearningCourseService.Core.Domain.Entities;

public class LearningArticle
    : BaseEntity
{
    private List<LearningArticleContentSection> _contentSections = [];

    public Guid LearningModuleId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int Number { get; set; } = 0;

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