namespace HF.LearningCourseService.Core.Domain.Entities;

public class LearningArticleContentSection : BaseEntity
{
    private List<LearningArticleContentItem> _contentItems = [];

    public string Title { get; set; } = string.Empty;

    public int Order { get; set; } = 0;

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