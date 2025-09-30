namespace HF.LearningCourseService.Core.Domain.Entities;

public class LearningArticle
    : BaseEntity
{
    private List<LearningArticleContentItem> _contentItems = [];

    public Guid LearningModuleId { get; set; }

    public IEnumerable<LearningArticleContentItem> ContentItems => _contentItems;

    public void AddContentItems(List<LearningArticleContentItem> items)
    {
        if (items != null && items.Any())
        {
            _contentItems.AddRange(items);
        }
    }

    public void ClearContentItems()
    {
        _contentItems.Clear();
    }
}