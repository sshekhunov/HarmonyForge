namespace HF.LearningCourseService.Core.Domain.Entities;

public class LearningModule
{
    private readonly List<LearningModuleItem> _items = [];
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public IEnumerable<LearningModuleItem> Items => _items;

    public void AddModuleItems(List<LearningModuleItem> items)
    {
        if (items != null && items.Any())
        {
            _items.AddRange(items);
        }
    }

    public void ClearItems()
    {
        _items.Clear();
    }
}